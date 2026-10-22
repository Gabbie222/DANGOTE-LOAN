import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const STAFF = ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'];

router.get('/admin', requireAuth, requireRole(...STAFF), async (req, res) => {
  const [pending, awaitingGuarantors, underReview, approved, active, completed, overdue, defaulted] = await Promise.all([
    prisma.loan.count({ where: { status: 'SUBMITTED' } }),
    prisma.loan.count({ where: { status: 'AWAITING_GUARANTORS' } }),
    prisma.loan.count({ where: { status: { in: ['UNDER_REVIEW', 'RECOMMENDED'] } } }),
    prisma.loan.count({ where: { status: 'APPROVED' } }),
    prisma.loan.count({ where: { status: 'ACTIVE' } }),
    prisma.loan.count({ where: { status: 'COMPLETED' } }),
    prisma.loan.count({ where: { status: 'OVERDUE' } }),
    prisma.loan.count({ where: { status: 'DEFAULTED' } }),
  ]);

  const disbursedAgg = await prisma.transaction.aggregate({
    where: { type: 'LOAN_DISBURSEMENT' },
    _sum: { amount: true },
  });
  const recoveredAgg = await prisma.transaction.aggregate({
    where: { type: 'LOAN_REPAYMENT' },
    _sum: { amount: true },
  });

  const activeLoans = await prisma.loan.findMany({
    where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
    include: { schedule: true },
  });
  const outstandingPortfolio = activeLoans.reduce(
    (sum, l) => sum + l.schedule.reduce((s, r) => s + Math.max(0, r.amountDue - r.amountPaid), 0), 0
  );
  const overdueAmount = activeLoans
    .filter((l) => l.status === 'OVERDUE')
    .reduce((sum, l) => sum + l.schedule.reduce((s, r) => s + Math.max(0, r.amountDue - r.amountPaid), 0), 0);
  const par = outstandingPortfolio > 0 ? overdueAmount / outstandingPortfolio : 0;

  const byProduct = await prisma.loan.groupBy({ by: ['productId'], _count: { id: true }, _sum: { amount: true } });
  const products = await prisma.loanProduct.findMany();
  const loansByProduct = byProduct.map((row) => ({
    productId: row.productId,
    productName: products.find((p) => p.id === row.productId)?.name ?? 'Unknown',
    count: row._count.id,
    totalAmountKobo: row._sum.amount || 0,
  }));

  res.json({
    counts: { pending, awaitingGuarantors, underReview, approved, active, completed, overdue, defaulted },
    totalDisbursedKobo: disbursedAgg._sum.amount || 0,
    totalRecoveredKobo: recoveredAgg._sum.amount || 0,
    outstandingPortfolioKobo: outstandingPortfolio,
    portfolioAtRiskPct: Math.round(par * 10000) / 100,
    loansByProduct,
  });
});

router.get('/member', requireAuth, async (req, res) => {
  const memberId = req.query.memberId || req.user.memberId;
  if (!memberId) return res.status(400).json({ error: 'No member context' });
  if (!STAFF.includes(req.user.role) && memberId !== req.user.memberId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: {
      savingsAccounts: true,
      loans: { where: { status: { in: ['ACTIVE', 'OVERDUE'] } }, include: { schedule: true, product: true } },
    },
  });
  if (!member) return res.status(404).json({ error: 'Not found' });

  const savingsBalance = member.savingsAccounts.reduce((s, a) => s + a.balance, 0);
  const shares = member.savingsAccounts.find((a) => a.type === 'SHARES')?.balance || 0;
  const activeLoan = member.loans[0];
  const nextDue = activeLoan?.schedule.find((r) => r.status !== 'PAID');

  const pendingGuarantorRequests = await prisma.loanGuarantor.findMany({
    where: { guarantorMemberId: memberId, status: 'PENDING' },
    include: { loan: { include: { member: { select: { firstName: true, lastName: true } } } } },
  });

  const recentTransactions = await prisma.transaction.findMany({
    where: { memberId }, orderBy: { createdAt: 'desc' }, take: 10,
  });

  res.json({
    savingsBalanceKobo: savingsBalance,
    sharesKobo: shares,
    activeLoan: activeLoan
      ? {
          id: activeLoan.id,
          productName: activeLoan.product.name,
          amountKobo: activeLoan.amount,
          monthlyPaymentKobo: activeLoan.monthlyPayment,
          nextDueDate: nextDue?.dueDate ?? null,
          nextDueAmountKobo: nextDue ? nextDue.amountDue - nextDue.amountPaid : 0,
        }
      : null,
    pendingGuarantorRequests,
    recentTransactions,
  });
});

export default router;
