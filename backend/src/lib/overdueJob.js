import cron from 'node-cron';
import { prisma } from './prisma.js';
import { audit } from './audit.js';

export async function runOverdueCheck() {
  const now = new Date();
  const overdueSchedules = await prisma.repaymentSchedule.findMany({
    where: { status: { not: 'PAID' }, dueDate: { lt: now } },
    include: { loan: { include: { member: { include: { user: true } } } } },
  });

  const loanIdsOverdue = new Set();
  for (const row of overdueSchedules) {
    loanIdsOverdue.add(row.loanId);
    if (row.status === 'PENDING') {
      await prisma.repaymentSchedule.update({ where: { id: row.id }, data: { status: 'OVERDUE' } });
    }
  }

  for (const loanId of loanIdsOverdue) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (loan && loan.status === 'ACTIVE') {
      await prisma.loan.update({ where: { id: loanId }, data: { status: 'OVERDUE' } });
      await audit({ action: 'AUTO_OVERDUE', entity: 'Loan', entityId: loanId });
    }
  }

  // Reminders: due in 3 days, due today, or missed yesterday.
  const soon = new Date(now); soon.setDate(soon.getDate() + 3);
  const upcoming = await prisma.repaymentSchedule.findMany({
    where: { status: 'PENDING', dueDate: { gte: now, lte: soon } },
    include: { loan: { include: { member: { include: { user: true } } } } },
  });
  for (const row of upcoming) {
    const userId = row.loan.member.user.id;
    await prisma.notification.create({
      data: {
        userId,
        title: 'Upcoming loan repayment',
        body: `Instalment #${row.instalmentNo} of ${(row.amountDue / 100).toFixed(2)} is due on ${row.dueDate.toDateString()}.`,
      },
    });
  }

  return { overdueLoans: loanIdsOverdue.size, remindersSent: upcoming.length };
}

export function scheduleOverdueJob() {
  // Runs once a day at 06:00 server time.
  cron.schedule('0 6 * * *', () => {
    runOverdueCheck().catch((err) => console.error('Overdue job failed', err));
  });
}
