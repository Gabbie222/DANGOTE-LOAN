import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, requireSelfOrStaff } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';

const router = Router();
const STAFF = ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'];

const contribSchema = z.object({
  type: z.enum(['REGULAR', 'TARGET', 'SHARES']).default('REGULAR'),
  amountKobo: z.number().int().positive(),
  method: z.string().optional(),
  reference: z.string().optional(),
});

router.post('/members/:memberId/contributions', requireAuth, requireRole(...STAFF), async (req, res) => {
  const parsed = contribSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { type, amountKobo, method, reference } = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    let account = await tx.savingsAccount.findUnique({
      where: { memberId_type: { memberId: req.params.memberId, type } },
    });
    if (!account) {
      account = await tx.savingsAccount.create({ data: { memberId: req.params.memberId, type, balance: 0 } });
    }
    account = await tx.savingsAccount.update({
      where: { id: account.id },
      data: { balance: { increment: amountKobo } },
    });
    const transaction = await tx.transaction.create({
      data: {
        memberId: req.params.memberId,
        accountId: account.id,
        type: 'CONTRIBUTION',
        amount: amountKobo,
        direction: 'CREDIT',
        method: method || 'manual',
        reference,
        recordedBy: req.user.id,
      },
    });
    return { account, transaction };
  });

  await audit({ actorId: req.user.id, action: 'CONTRIBUTION', entity: 'SavingsAccount', entityId: result.account.id, newValue: result.transaction });
  res.status(201).json(result);
});

// Bulk CSV-like upload: [{ memberNo, amountKobo, type }]
router.post('/contributions/bulk-upload', requireAuth, requireRole(...STAFF), async (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows)) return res.status(400).json({ error: 'rows array required' });

  const results = [];
  for (const row of rows) {
    const member = await prisma.member.findUnique({ where: { memberNo: row.memberNo } });
    if (!member) {
      results.push({ memberNo: row.memberNo, ok: false, error: 'Member not found' });
      continue;
    }
    const type = row.type || 'REGULAR';
    const amountKobo = Number(row.amountKobo);
    if (!amountKobo || amountKobo <= 0) {
      results.push({ memberNo: row.memberNo, ok: false, error: 'Invalid amount' });
      continue;
    }
    await prisma.$transaction(async (tx) => {
      let account = await tx.savingsAccount.findUnique({ where: { memberId_type: { memberId: member.id, type } } });
      if (!account) account = await tx.savingsAccount.create({ data: { memberId: member.id, type, balance: 0 } });
      account = await tx.savingsAccount.update({ where: { id: account.id }, data: { balance: { increment: amountKobo } } });
      await tx.transaction.create({
        data: {
          memberId: member.id, accountId: account.id, type: 'CONTRIBUTION', amount: amountKobo,
          direction: 'CREDIT', method: 'bulk_csv', recordedBy: req.user.id,
        },
      });
    });
    results.push({ memberNo: row.memberNo, ok: true });
  }
  await audit({ actorId: req.user.id, action: 'BULK_CONTRIBUTION', entity: 'SavingsAccount', newValue: { count: results.length } });
  res.json({ results });
});

const withdrawSchema = z.object({
  type: z.enum(['REGULAR', 'TARGET', 'SHARES']).default('REGULAR'),
  amountKobo: z.number().int().positive(),
});

// Member requests a withdrawal; staff approves separately via /savings/withdrawals/:id/approve (kept simple: direct debit by staff)
router.post('/members/:memberId/withdrawals', requireAuth, requireSelfOrStaff, async (req, res) => {
  const parsed = withdrawSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { type, amountKobo } = parsed.data;

  const account = await prisma.savingsAccount.findUnique({
    where: { memberId_type: { memberId: req.params.memberId, type } },
  });
  if (!account || account.balance < amountKobo) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }

  // Recorded as a pending debit transaction requiring staff sign-off; for MVP, staff-initiated calls apply immediately.
  const isStaff = ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'].includes(req.user.role);
  if (!isStaff) {
    const tx = await prisma.transaction.create({
      data: {
        memberId: req.params.memberId, accountId: account.id, type: 'WITHDRAWAL', amount: amountKobo,
        direction: 'DEBIT', method: 'request', reference: 'PENDING_APPROVAL', recordedBy: req.user.id,
      },
    });
    return res.status(201).json({ status: 'PENDING_APPROVAL', transaction: tx });
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.savingsAccount.update({ where: { id: account.id }, data: { balance: { decrement: amountKobo } } });
    const transaction = await tx.transaction.create({
      data: {
        memberId: req.params.memberId, accountId: account.id, type: 'WITHDRAWAL', amount: amountKobo,
        direction: 'DEBIT', method: 'approved', recordedBy: req.user.id,
      },
    });
    return { account: updated, transaction };
  });
  await audit({ actorId: req.user.id, action: 'WITHDRAWAL', entity: 'SavingsAccount', entityId: account.id, newValue: result.transaction });
  res.status(201).json(result);
});

router.get('/members/:memberId/transactions', requireAuth, requireSelfOrStaff, async (req, res) => {
  const transactions = await prisma.transaction.findMany({
    where: { memberId: req.params.memberId },
    orderBy: { createdAt: 'desc' },
  });
  res.json(transactions);
});

export default router;
