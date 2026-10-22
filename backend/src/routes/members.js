import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, requireSelfOrStaff } from '../middleware/auth.js';
import { upload, publicUrlFor } from '../middleware/upload.js';
import { audit } from '../lib/audit.js';
import { getMemberOutstanding } from '../lib/outstanding.js';

const router = Router();
const STAFF = ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'];

async function nextMemberNo() {
  const year = new Date().getFullYear();
  const count = await prisma.member.count();
  return `COOP/${year}/${String(count + 1).padStart(4, '0')}`;
}

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  employer: z.string().optional(),
  department: z.string().optional(),
  nextOfKin: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
});

router.post('/', requireAuth, requireRole(...STAFF), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const passwordHash = await bcrypt.hash(data.password, 10);
  const memberNo = await nextMemberNo();

  const member = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email: data.email, passwordHash, role: 'MEMBER' },
    });
    const member = await tx.member.create({
      data: {
        userId: user.id,
        memberNo,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        address: data.address,
        employer: data.employer,
        department: data.department,
        nextOfKin: data.nextOfKin,
        bankName: data.bankName,
        bankAccount: data.bankAccount,
        status: 'PENDING',
      },
    });
    await tx.savingsAccount.createMany({
      data: [
        { memberId: member.id, type: 'REGULAR', balance: 0 },
        { memberId: member.id, type: 'SHARES', balance: 0 },
      ],
    });
    return member;
  });

  await audit({ actorId: req.user.id, action: 'CREATE', entity: 'Member', entityId: member.id, newValue: member });
  res.status(201).json(member);
});

router.get('/', requireAuth, requireRole(...STAFF), async (req, res) => {
  const { q, status } = req.query;
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: String(q) } },
            { lastName: { contains: String(q) } },
            { memberNo: { contains: String(q) } },
            { phone: { contains: String(q) } },
          ],
        }
      : {}),
  };
  const members = await prisma.member.findMany({
    where,
    include: { savingsAccounts: true, user: { select: { email: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(members);
});

router.get('/:id', requireAuth, requireSelfOrStaff, async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id },
    include: {
      savingsAccounts: true,
      documents: true,
      user: { select: { email: true, role: true, lastLogin: true } },
      loans: { include: { product: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!member) return res.status(404).json({ error: 'Not found' });
  res.json(member);
});

router.patch('/:id', requireAuth, requireRole(...STAFF), async (req, res) => {
  const before = await prisma.member.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: 'Not found' });

  const allowed = [
    'firstName', 'lastName', 'phone', 'address', 'employer', 'department',
    'nextOfKin', 'bankName', 'bankAccount', 'status', 'membershipFeePaid', 'entranceFeePaid',
  ];
  const data = {};
  for (const key of allowed) if (key in req.body) data[key] = req.body[key];

  const updated = await prisma.member.update({ where: { id: req.params.id }, data });
  await audit({ actorId: req.user.id, action: 'UPDATE', entity: 'Member', entityId: updated.id, oldValue: before, newValue: updated });
  res.json(updated);
});

// Exit process: final payout = savings + shares - outstanding loans
router.post('/:id/exit', requireAuth, requireRole('SUPER_ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const member = await prisma.member.findUnique({
    where: { id: req.params.id },
    include: { savingsAccounts: true },
  });
  if (!member) return res.status(404).json({ error: 'Not found' });

  const savingsTotal = member.savingsAccounts.reduce((sum, a) => sum + a.balance, 0);
  const outstanding = await getMemberOutstanding(member.id);
  const payout = savingsTotal - outstanding;

  const updated = await prisma.member.update({ where: { id: member.id }, data: { status: 'EXITED' } });
  await audit({ actorId: req.user.id, action: 'EXIT', entity: 'Member', entityId: member.id, newValue: { payout, savingsTotal, outstanding } });
  res.json({ member: updated, payout, savingsTotal, outstanding });
});

function handleUpload(field) {
  const middleware = upload.single(field);
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

// Register a document by URL (e.g. already hosted elsewhere).
router.post('/:id/documents', requireAuth, requireSelfOrStaff, async (req, res) => {
  const { type, fileUrl } = req.body;
  if (!type || !fileUrl) return res.status(400).json({ error: 'type and fileUrl required' });
  const doc = await prisma.memberDocument.create({
    data: { memberId: req.params.id, type, fileUrl },
  });
  await audit({ actorId: req.user.id, action: 'ADD_DOCUMENT', entity: 'MemberDocument', entityId: doc.id });
  res.status(201).json(doc);
});

// Upload a KYC document file (ID card, utility bill, payslip, etc.) directly from the browser.
router.post('/:id/documents/upload', requireAuth, requireSelfOrStaff, handleUpload('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  const type = req.body.type || 'OTHER';
  const doc = await prisma.memberDocument.create({
    data: { memberId: req.params.id, type, fileUrl: publicUrlFor(req.file.filename) },
  });
  await audit({ actorId: req.user.id, action: 'UPLOAD_DOCUMENT', entity: 'MemberDocument', entityId: doc.id, newValue: { type } });
  res.status(201).json(doc);
});

router.delete('/:id/documents/:docId', requireAuth, requireSelfOrStaff, async (req, res) => {
  const doc = await prisma.memberDocument.findUnique({ where: { id: req.params.docId } });
  if (!doc || doc.memberId !== req.params.id) return res.status(404).json({ error: 'Not found' });
  await prisma.memberDocument.delete({ where: { id: doc.id } });
  await audit({ actorId: req.user.id, action: 'DELETE_DOCUMENT', entity: 'MemberDocument', entityId: doc.id });
  res.status(204).end();
});

// Upload / replace the member's passport photo.
router.post('/:id/photo', requireAuth, requireSelfOrStaff, handleUpload('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required' });
  const updated = await prisma.member.update({
    where: { id: req.params.id },
    data: { passportUrl: publicUrlFor(req.file.filename) },
  });
  await audit({ actorId: req.user.id, action: 'UPLOAD_PHOTO', entity: 'Member', entityId: updated.id });
  res.status(201).json(updated);
});

export default router;
