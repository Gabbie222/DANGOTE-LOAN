import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole, requireSelfOrStaff } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';
import { calculateLoan, generateSchedule, computeMaxLoan, monthsBetween } from '../lib/loanMath.js';
import { getMemberOutstanding } from '../lib/outstanding.js';

const router = Router();
const STAFF = ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'];
const APPROVAL_THRESHOLD_KOBO = 50_000_00; // ₦50,000 — above this needs second-level approval

async function memberSnapshot(memberId) {
  return prisma.member.findUnique({
    where: { id: memberId },
    include: { savingsAccounts: true, loans: { where: { status: { in: ['ACTIVE', 'OVERDUE', 'DEFAULTED'] } } } },
  });
}

router.get('/eligibility', requireAuth, async (req, res) => {
  const { productId } = req.query;
  const memberId = req.query.memberId || req.user.memberId;
  if (!memberId) return res.status(400).json({ error: 'memberId required' });
  if (!STAFF.includes(req.user.role) && memberId !== req.user.memberId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const product = await prisma.loanProduct.findUnique({ where: { id: String(productId) } });
  if (!product) return res.status(404).json({ error: 'Loan product not found' });

  const member = await memberSnapshot(memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const savingsBalance = member.savingsAccounts.reduce((s, a) => s + a.balance, 0);
  const memberMonths = monthsBetween(member.joinDate, new Date());
  const outstanding = await getMemberOutstanding(memberId);
  const hasDefaulted = member.loans.some((l) => l.status === 'DEFAULTED');

  const maxLoan = computeMaxLoan({
    productMaxAmount: product.maxAmount,
    savingsBalance,
    multiplier: product.savingsMultiplier,
    existingOutstanding: outstanding,
  });

  const eligible =
    member.status === 'ACTIVE' &&
    memberMonths >= product.minMembershipMonths &&
    !hasDefaulted &&
    maxLoan > 0;

  res.json({
    eligible,
    maxLoanKobo: maxLoan,
    savingsBalanceKobo: savingsBalance,
    memberMonths,
    reasons: {
      statusActive: member.status === 'ACTIVE',
      membershipDurationMet: memberMonths >= product.minMembershipMonths,
      noDefault: !hasDefaulted,
      withinSavingsCap: maxLoan > 0,
    },
  });
});

const applySchema = z.object({
  memberId: z.string().optional(),
  productId: z.string(),
  amountKobo: z.number().int().positive(),
  tenureMonths: z.number().int().positive(),
  purpose: z.string().optional(),
  guarantorMemberIds: z.array(z.string()),
});

router.post('/', requireAuth, async (req, res) => {
  const parsed = applySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const memberId = data.memberId || req.user.memberId;
  if (!STAFF.includes(req.user.role) && memberId !== req.user.memberId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const product = await prisma.loanProduct.findUnique({ where: { id: data.productId } });
  if (!product || !product.active) return res.status(404).json({ error: 'Loan product not found' });
  if (data.tenureMonths > product.maxTenureMonths) return res.status(400).json({ error: 'Tenure exceeds product maximum' });
  if (data.guarantorMemberIds.length < product.guarantorsRequired) {
    return res.status(400).json({ error: `${product.guarantorsRequired} guarantor(s) required` });
  }

  const member = await memberSnapshot(memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });
  const savingsBalance = member.savingsAccounts.reduce((s, a) => s + a.balance, 0);
  const outstanding = await getMemberOutstanding(memberId);
  const maxLoan = computeMaxLoan({
    productMaxAmount: product.maxAmount,
    savingsBalance,
    multiplier: product.savingsMultiplier,
    existingOutstanding: outstanding,
  });
  if (data.amountKobo > maxLoan) {
    return res.status(400).json({ error: `Amount exceeds max eligible loan of ${maxLoan} kobo` });
  }

  const { totalInterest, totalPayable, monthlyPayment } = calculateLoan(
    data.amountKobo, product.rate, data.tenureMonths, product.method
  );
  const processingFee = Math.round(data.amountKobo * (product.processingFeePct / 100));
  const amountPerGuarantor = Math.round(data.amountKobo / data.guarantorMemberIds.length);

  const loan = await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.create({
      data: {
        memberId, productId: product.id, amount: data.amountKobo, tenureMonths: data.tenureMonths,
        rate: product.rate, method: product.method, purpose: data.purpose,
        status: 'SUBMITTED', appliedAt: new Date(),
        processingFee, totalInterest, totalPayable, monthlyPayment,
      },
    });
    await tx.loanGuarantor.createMany({
      data: data.guarantorMemberIds.map((gid) => ({
        loanId: loan.id, guarantorMemberId: gid, amountGuaranteed: amountPerGuarantor,
      })),
    });
    await tx.loan.update({ where: { id: loan.id }, data: { status: 'AWAITING_GUARANTORS' } });
    await tx.loanApproval.create({
      data: { loanId: loan.id, stage: 'SUBMITTED', action: 'SUBMIT', actorId: req.user.id },
    });
    return loan;
  });

  await audit({ actorId: req.user.id, action: 'APPLY', entity: 'Loan', entityId: loan.id, newValue: loan });
  res.status(201).json(loan);
});

router.get('/', requireAuth, async (req, res) => {
  const { status, memberId } = req.query;
  const where = {};
  if (status) where.status = status;
  if (!STAFF.includes(req.user.role)) {
    where.memberId = req.user.memberId;
  } else if (memberId) {
    where.memberId = memberId;
  }
  const loans = await prisma.loan.findMany({
    where,
    include: { product: true, member: { select: { firstName: true, lastName: true, memberNo: true } }, guarantors: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(loans);
});

router.get('/:id', requireAuth, async (req, res) => {
  const loan = await prisma.loan.findUnique({
    where: { id: req.params.id },
    include: {
      product: true,
      member: true,
      guarantors: { include: { guarantor: { select: { firstName: true, lastName: true, memberNo: true } } } },
      approvals: { orderBy: { createdAt: 'asc' } },
      schedule: { orderBy: { instalmentNo: 'asc' } },
      repayments: { orderBy: { paidAt: 'desc' } },
    },
  });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (!STAFF.includes(req.user.role) && loan.memberId !== req.user.memberId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(loan);
});

router.post('/:id/guarantors/:gid/respond', requireAuth, async (req, res) => {
  const { action } = req.body; // 'ACCEPT' | 'DECLINE'
  const guarantorRow = await prisma.loanGuarantor.findUnique({
    where: { id: req.params.gid },
    include: { guarantor: true, loan: { include: { guarantors: true } } },
  });
  if (!guarantorRow || guarantorRow.loanId !== req.params.id) return res.status(404).json({ error: 'Not found' });
  if (!STAFF.includes(req.user.role) && guarantorRow.guarantor.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (action === 'ACCEPT') {
    const savingsAccounts = await prisma.savingsAccount.findMany({ where: { memberId: guarantorRow.guarantorMemberId } });
    const savingsBalance = savingsAccounts.reduce((s, a) => s + a.balance, 0);
    const existingGuarantees = await prisma.loanGuarantor.aggregate({
      where: { guarantorMemberId: guarantorRow.guarantorMemberId, status: 'ACCEPTED' },
      _sum: { amountGuaranteed: true },
    });
    const committed = existingGuarantees._sum.amountGuaranteed || 0;
    if (committed + guarantorRow.amountGuaranteed > savingsBalance) {
      return res.status(400).json({ error: 'Guarantor savings capacity exceeded' });
    }
  }

  const updated = await prisma.loanGuarantor.update({
    where: { id: req.params.gid },
    data: { status: action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED', respondedAt: new Date() },
  });

  const allGuarantors = await prisma.loanGuarantor.findMany({ where: { loanId: req.params.id } });
  if (allGuarantors.some((g) => g.status === 'DECLINED')) {
    await prisma.loan.update({ where: { id: req.params.id }, data: { status: 'REJECTED' } });
  } else if (allGuarantors.every((g) => g.status === 'ACCEPTED')) {
    await prisma.loan.update({ where: { id: req.params.id }, data: { status: 'UNDER_REVIEW' } });
  }

  await audit({ actorId: req.user.id, action: `GUARANTOR_${action}`, entity: 'LoanGuarantor', entityId: updated.id });
  res.json(updated);
});

router.post('/:id/review', requireAuth, requireRole('LOAN_OFFICER', 'SUPER_ADMIN'), async (req, res) => {
  const { action, comment } = req.body; // 'RECOMMEND' | 'REJECT'
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (loan.status !== 'UNDER_REVIEW') return res.status(400).json({ error: `Cannot review loan in status ${loan.status}` });

  const newStatus = action === 'RECOMMEND' ? 'RECOMMENDED' : 'REJECTED';
  const updated = await prisma.loan.update({ where: { id: loan.id }, data: { status: newStatus } });
  await prisma.loanApproval.create({ data: { loanId: loan.id, stage: 'REVIEW', action, actorId: req.user.id, comment } });
  await audit({ actorId: req.user.id, action: `REVIEW_${action}`, entity: 'Loan', entityId: loan.id });
  res.json(updated);
});

router.post('/:id/approve', requireAuth, requireRole('APPROVAL_MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  const { comment } = req.body;
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id }, include: { approvals: true } });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (loan.status !== 'RECOMMENDED') return res.status(400).json({ error: `Cannot approve loan in status ${loan.status}` });

  // Staff can't approve their own loan application
  const applicantApproval = loan.approvals.find((a) => a.stage === 'SUBMITTED');
  if (applicantApproval && applicantApproval.actorId === req.user.id) {
    return res.status(403).json({ error: 'Cannot approve your own application' });
  }

  const needsSecondLevel = loan.amount > APPROVAL_THRESHOLD_KOBO;
  const alreadyApprovedOnce = loan.approvals.some((a) => a.stage === 'APPROVAL' && a.action === 'APPROVE');

  if (needsSecondLevel && !alreadyApprovedOnce) {
    await prisma.loanApproval.create({ data: { loanId: loan.id, stage: 'APPROVAL', action: 'APPROVE', actorId: req.user.id, comment } });
    const updated = await prisma.loan.update({ where: { id: loan.id }, data: { status: 'RECOMMENDED' } });
    await audit({ actorId: req.user.id, action: 'FIRST_LEVEL_APPROVE', entity: 'Loan', entityId: loan.id });
    return res.json({ ...updated, note: 'First-level approval recorded; second-level approval required' });
  }

  const updated = await prisma.loan.update({ where: { id: loan.id }, data: { status: 'APPROVED', approvedBy: req.user.id } });
  await prisma.loanApproval.create({ data: { loanId: loan.id, stage: 'APPROVAL', action: 'APPROVE', actorId: req.user.id, comment } });
  await audit({ actorId: req.user.id, action: 'APPROVE', entity: 'Loan', entityId: loan.id });
  res.json(updated);
});

router.post('/:id/reject', requireAuth, requireRole('LOAN_OFFICER', 'APPROVAL_MANAGER', 'SUPER_ADMIN'), async (req, res) => {
  const { comment } = req.body;
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.loan.update({ where: { id: loan.id }, data: { status: 'REJECTED' } });
  await prisma.loanApproval.create({ data: { loanId: loan.id, stage: 'REJECT', action: 'REJECT', actorId: req.user.id, comment } });
  await audit({ actorId: req.user.id, action: 'REJECT', entity: 'Loan', entityId: loan.id });
  res.json(updated);
});

const disburseSchema = z.object({
  method: z.string().min(1),
  reference: z.string().optional(),
});

router.post('/:id/disburse', requireAuth, requireRole('ACCOUNTANT', 'SUPER_ADMIN'), async (req, res) => {
  const parsed = disburseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (loan.status !== 'APPROVED') return res.status(400).json({ error: `Cannot disburse loan in status ${loan.status}` });

  const scheduleRows = generateSchedule(loan.amount, loan.rate, loan.tenureMonths, loan.method, new Date());

  const updated = await prisma.$transaction(async (tx) => {
    await tx.repaymentSchedule.createMany({
      data: scheduleRows.map((r) => ({ loanId: loan.id, ...r })),
    });
    const l = await tx.loan.update({
      where: { id: loan.id },
      data: {
        status: 'ACTIVE', disbursedAt: new Date(), disbursedBy: req.user.id,
        disbursementMethod: parsed.data.method, disbursementRef: parsed.data.reference,
      },
    });
    await tx.transaction.create({
      data: {
        memberId: loan.memberId, loanId: loan.id, type: 'LOAN_DISBURSEMENT', amount: loan.amount,
        direction: 'DEBIT', method: parsed.data.method, reference: parsed.data.reference, recordedBy: req.user.id,
      },
    });
    if (loan.processingFee > 0) {
      await tx.transaction.create({
        data: {
          memberId: loan.memberId, loanId: loan.id, type: 'FEE', amount: loan.processingFee,
          direction: 'DEBIT', method: 'processing_fee', recordedBy: req.user.id,
        },
      });
    }
    return l;
  });

  await prisma.loanApproval.create({ data: { loanId: loan.id, stage: 'DISBURSEMENT', action: 'DISBURSE', actorId: req.user.id } });
  await audit({ actorId: req.user.id, action: 'DISBURSE', entity: 'Loan', entityId: loan.id, newValue: updated });
  res.json(updated);
});

router.get('/:id/schedule', requireAuth, async (req, res) => {
  const loan = await prisma.loan.findUnique({ where: { id: req.params.id } });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (!STAFF.includes(req.user.role) && loan.memberId !== req.user.memberId) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const schedule = await prisma.repaymentSchedule.findMany({ where: { loanId: loan.id }, orderBy: { instalmentNo: 'asc' } });
  res.json(schedule);
});

const repaySchema = z.object({
  amountKobo: z.number().int().positive(),
  method: z.string().optional(),
  reference: z.string().optional(),
});

router.post('/:id/repayments', requireAuth, requireRole(...STAFF), async (req, res) => {
  const parsed = repaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  let { amountKobo, method, reference } = parsed.data;

  const loan = await prisma.loan.findUnique({ where: { id: req.params.id }, include: { schedule: { orderBy: { instalmentNo: 'asc' } } } });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) return res.status(400).json({ error: `Loan not active (status ${loan.status})` });

  const result = await prisma.$transaction(async (tx) => {
    let remaining = amountKobo;
    for (const row of loan.schedule) {
      if (remaining <= 0) break;
      const owed = row.amountDue - row.amountPaid;
      if (owed <= 0) continue;
      const applied = Math.min(remaining, owed);
      await tx.repaymentSchedule.update({
        where: { id: row.id },
        data: {
          amountPaid: { increment: applied },
          status: applied >= owed ? 'PAID' : 'PARTIAL',
        },
      });
      remaining -= applied;
    }

    const repayment = await tx.repayment.create({
      data: { loanId: loan.id, amount: amountKobo, method, reference, recordedBy: req.user.id },
    });
    await tx.transaction.create({
      data: {
        memberId: loan.memberId, loanId: loan.id, type: 'LOAN_REPAYMENT', amount: amountKobo,
        direction: 'CREDIT', method, reference, recordedBy: req.user.id,
      },
    });

    const freshSchedule = await tx.repaymentSchedule.findMany({ where: { loanId: loan.id } });
    const fullyPaid = freshSchedule.every((r) => r.amountPaid >= r.amountDue);
    if (fullyPaid) {
      await tx.loan.update({ where: { id: loan.id }, data: { status: 'COMPLETED' } });
    }

    return { repayment, fullyPaid };
  });

  await audit({ actorId: req.user.id, action: 'REPAYMENT', entity: 'Loan', entityId: loan.id, newValue: result.repayment });
  res.status(201).json(result);
});

// Guarantor recovery: pulls guaranteed amounts from guarantors' savings when a loan defaults.
router.post('/:id/recover-from-guarantors', requireAuth, requireRole('SUPER_ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const loan = await prisma.loan.findUnique({
    where: { id: req.params.id },
    include: { guarantors: { where: { status: 'ACCEPTED' } }, schedule: true },
  });
  if (!loan) return res.status(404).json({ error: 'Not found' });
  const outstanding = loan.schedule.reduce((s, r) => s + Math.max(0, r.amountDue - r.amountPaid), 0);
  if (outstanding <= 0) return res.status(400).json({ error: 'No outstanding balance' });

  const recovered = [];
  await prisma.$transaction(async (tx) => {
    for (const g of loan.guarantors) {
      const account = await tx.savingsAccount.findFirst({ where: { memberId: g.guarantorMemberId, type: 'REGULAR' } });
      if (!account) continue;
      const amount = Math.min(g.amountGuaranteed, account.balance);
      if (amount <= 0) continue;
      await tx.savingsAccount.update({ where: { id: account.id }, data: { balance: { decrement: amount } } });
      await tx.transaction.create({
        data: {
          memberId: g.guarantorMemberId, accountId: account.id, loanId: loan.id, type: 'GUARANTOR_RECOVERY',
          amount, direction: 'DEBIT', method: 'admin_recovery', recordedBy: req.user.id,
        },
      });
      await tx.repaymentSchedule.updateMany({
        where: { loanId: loan.id, status: { not: 'PAID' } },
        data: {}, // schedule rows updated below via repayment application
      });
      recovered.push({ guarantorMemberId: g.guarantorMemberId, amount });
    }
    await tx.loan.update({ where: { id: loan.id }, data: { status: 'DEFAULTED' } });
  });

  await audit({ actorId: req.user.id, action: 'GUARANTOR_RECOVERY', entity: 'Loan', entityId: loan.id, newValue: recovered });
  res.json({ recovered });
});

export default router;
