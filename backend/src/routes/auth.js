import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';

const router = Router();
const STAFF = ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'];

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const PENDING_2FA_EXPIRY = '5m';

function signTokens(user) {
  const payload = { id: user.id, role: user.role, memberId: user.member?.id ?? null };
  const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function userResponse(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    memberId: user.member?.id ?? null,
    memberName: user.member ? `${user.member.firstName} ${user.member.lastName}` : null,
    twoFactorEnabled: user.twoFactorEnabled,
  };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email }, include: { member: true } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return res.status(423).json({ error: 'Account locked. Try again later.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const failedLogins = user.failedLogins + 1;
    const locked = failedLogins >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLogins: locked ? 0 : failedLogins,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000) : null,
      },
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLogins: 0, lockedUntil: null },
  });

  if (user.twoFactorEnabled) {
    const pendingToken = jwt.sign(
      { id: user.id, purpose: '2fa_pending' },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: PENDING_2FA_EXPIRY }
    );
    return res.json({ requires2FA: true, pendingToken });
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  const tokens = signTokens(user);
  await audit({ actorId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id });
  res.json({ ...tokens, user: userResponse(user) });
});

const twoFactorLoginSchema = z.object({
  pendingToken: z.string().min(1),
  code: z.string().min(6).max(6),
});

router.post('/2fa/login', async (req, res) => {
  const parsed = twoFactorLoginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const { pendingToken, code } = parsed.data;

  let payload;
  try {
    payload = jwt.verify(pendingToken, process.env.JWT_ACCESS_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired 2FA session, please log in again' });
  }
  if (payload.purpose !== '2fa_pending') return res.status(401).json({ error: 'Invalid token' });

  const user = await prisma.user.findUnique({ where: { id: payload.id }, include: { member: true } });
  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(401).json({ error: 'Invalid 2FA state' });
  }

  const valid = authenticator.check(code, user.twoFactorSecret);
  if (!valid) return res.status(401).json({ error: 'Incorrect authentication code' });

  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  const tokens = signTokens(user);
  await audit({ actorId: user.id, action: 'LOGIN_2FA', entity: 'User', entityId: user.id });
  res.json({ ...tokens, user: userResponse(user) });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Missing refresh token' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.id }, include: { member: true } });
    if (!user) return res.status(401).json({ error: 'Invalid token' });
    const tokens = signTokens(user);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
});

router.post('/forgot-password', async (req, res) => {
  // Stubbed: in production this sends an email/OTP. We just acknowledge to avoid user enumeration.
  res.json({ message: 'If that email exists, a reset link has been sent.' });
});

// --- Two-factor authentication management (staff only) ---

router.post('/2fa/setup', requireAuth, requireRole(...STAFF), async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (user.twoFactorEnabled) return res.status(400).json({ error: '2FA is already enabled' });

  const secret = authenticator.generateSecret();
  await prisma.user.update({ where: { id: user.id }, data: { twoFactorSecret: secret } });

  const otpauth = authenticator.keyuri(user.email, 'CoopLedger', secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

  res.json({ secret, otpauth, qrCodeDataUrl });
});

const verifySchema = z.object({ code: z.string().min(6).max(6) });

router.post('/2fa/verify', requireAuth, requireRole(...STAFF), async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid code' });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.twoFactorSecret) return res.status(400).json({ error: 'Run /2fa/setup first' });

  const valid = authenticator.check(parsed.data.code, user.twoFactorSecret);
  if (!valid) return res.status(401).json({ error: 'Incorrect code' });

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: true } });
  await audit({ actorId: user.id, action: 'ENABLE_2FA', entity: 'User', entityId: user.id });
  res.json({ enabled: true });
});

router.post('/2fa/disable', requireAuth, requireRole(...STAFF), async (req, res) => {
  const parsed = verifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid code' });

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.twoFactorEnabled || !user.twoFactorSecret) return res.status(400).json({ error: '2FA is not enabled' });

  const valid = authenticator.check(parsed.data.code, user.twoFactorSecret);
  if (!valid) return res.status(401).json({ error: 'Incorrect code' });

  await prisma.user.update({ where: { id: user.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
  await audit({ actorId: user.id, action: 'DISABLE_2FA', entity: 'User', entityId: user.id });
  res.json({ enabled: false });
});

export default router;
