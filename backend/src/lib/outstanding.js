import { prisma } from './prisma.js';

// A loan's true outstanding balance is whatever the repayment schedule still owes,
// not the original principal — partial payments must be reflected.
export async function getMemberOutstanding(memberId) {
  const loans = await prisma.loan.findMany({
    where: { memberId, status: { in: ['DISBURSED', 'ACTIVE', 'OVERDUE'] } },
    include: { schedule: true },
  });
  return loans.reduce((sum, loan) => {
    const owed = loan.schedule.reduce((s, r) => s + (r.amountDue - r.amountPaid), 0);
    return sum + Math.max(0, owed);
  }, 0);
}
