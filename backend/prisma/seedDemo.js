// Additive demo-data seeder: adds more members and loans across every workflow
// status so the dashboards, loan list, and reports look like a live cooperative
// instead of a nearly-empty MVP. Safe to re-run — uses upserts and status checks.
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { calculateLoan, generateSchedule } from '../src/lib/loanMath.js';

const prisma = new PrismaClient();

function monthsAgo(n) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function makeMember({ email, memberNo, firstName, lastName, joinDate, regular, shares, employer }) {
  const passwordHash = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role: 'MEMBER' },
  });
  const member = await prisma.member.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      userId: user.id, memberNo, firstName, lastName, joinDate,
      status: 'ACTIVE', phone: '0800' + Math.floor(1000000 + Math.random() * 8999999),
      employer: employer || 'Dangote Group', membershipFeePaid: true, entranceFeePaid: true,
    },
  });
  await prisma.savingsAccount.upsert({
    where: { memberId_type: { memberId: member.id, type: 'REGULAR' } },
    update: { balance: regular },
    create: { memberId: member.id, type: 'REGULAR', balance: regular },
  });
  await prisma.savingsAccount.upsert({
    where: { memberId_type: { memberId: member.id, type: 'SHARES' } },
    update: { balance: shares },
    create: { memberId: member.id, type: 'SHARES', balance: shares },
  });
  return member;
}

async function applyLoan({ member, product, amount, tenure, purpose, guarantors }) {
  const { totalInterest, totalPayable, monthlyPayment } = calculateLoan(amount, product.rate, tenure, product.method);
  const processingFee = Math.round(amount * (product.processingFeePct / 100));
  const amountPerGuarantor = guarantors.length ? Math.round(amount / guarantors.length) : 0;

  const loan = await prisma.loan.create({
    data: {
      memberId: member.id, productId: product.id, amount, tenureMonths: tenure,
      rate: product.rate, method: product.method, purpose, status: 'SUBMITTED',
      appliedAt: daysAgo(20), processingFee, totalInterest, totalPayable, monthlyPayment,
    },
  });
  if (guarantors.length) {
    await prisma.loanGuarantor.createMany({
      data: guarantors.map((g) => ({ loanId: loan.id, guarantorMemberId: g.id, amountGuaranteed: amountPerGuarantor })),
    });
  }
  await prisma.loanApproval.create({ data: { loanId: loan.id, stage: 'SUBMITTED', action: 'SUBMIT', actorId: member.userId } });
  return loan;
}

async function acceptGuarantor(loan) {
  await prisma.loanGuarantor.updateMany({ where: { loanId: loan.id }, data: { status: 'ACCEPTED', respondedAt: daysAgo(18) } });
}

async function main() {
  const staff = {
    admin: await prisma.user.findUnique({ where: { email: 'admin@coop.test' } }),
    officer: await prisma.user.findUnique({ where: { email: 'officer@coop.test' } }),
    manager: await prisma.user.findUnique({ where: { email: 'manager@coop.test' } }),
    accountant: await prisma.user.findUnique({ where: { email: 'accountant@coop.test' } }),
  };
  const regularProduct = await prisma.loanProduct.findUnique({ where: { id: 'seed-regular' } });
  const emergencyProduct = await prisma.loanProduct.findUnique({ where: { id: 'seed-emergency' } });
  const existingAlice = await prisma.member.findUnique({ where: { memberNo: 'COOP/2024/0001' } });
  const existingBola = await prisma.member.findUnique({ where: { memberNo: 'COOP/2024/0002' } });
  const existingChidi = await prisma.member.findUnique({ where: { memberNo: 'COOP/2025/0003' } });

  console.log('Creating additional members...');
  const david = await makeMember({ email: 'david@coop.test', memberNo: 'COOP/2024/0004', firstName: 'David', lastName: 'Balogun', joinDate: monthsAgo(18), regular: 400_000_00, shares: 80_000_00 });
  const ngozi = await makeMember({ email: 'ngozi@coop.test', memberNo: 'COOP/2024/0005', firstName: 'Ngozi', lastName: 'Eze', joinDate: monthsAgo(14), regular: 250_000_00, shares: 50_000_00 });
  const emeka = await makeMember({ email: 'emeka@coop.test', memberNo: 'COOP/2025/0006', firstName: 'Emeka', lastName: 'Chukwu', joinDate: monthsAgo(10), regular: 350_000_00, shares: 70_000_00 });
  const funmi = await makeMember({ email: 'funmi@coop.test', memberNo: 'COOP/2025/0007', firstName: 'Funmi', lastName: 'Ogundele', joinDate: monthsAgo(9), regular: 180_000_00, shares: 36_000_00 });
  const tunde = await makeMember({ email: 'tunde@coop.test', memberNo: 'COOP/2025/0008', firstName: 'Tunde', lastName: 'Bakare', joinDate: monthsAgo(8), regular: 220_000_00, shares: 44_000_00 });
  const kemi = await makeMember({ email: 'kemi@coop.test', memberNo: 'COOP/2026/0009', firstName: 'Kemi', lastName: 'Afolabi', joinDate: monthsAgo(2), regular: 60_000_00, shares: 12_000_00 });

  // 1. Freshly submitted, no guarantor action yet
  console.log('Loan 1: SUBMITTED (no guarantor response)');
  await applyLoan({ member: david, product: emergencyProduct, amount: 100_000_00, tenure: 6, purpose: 'Medical bill', guarantors: [ngozi] });

  // 2. Awaiting guarantors — one accepted, one still pending
  console.log('Loan 2: AWAITING_GUARANTORS (partial acceptance)');
  const loan2 = await applyLoan({ member: ngozi, product: regularProduct, amount: 150_000_00, tenure: 12, purpose: 'Rent', guarantors: [david, emeka] });
  await prisma.loan.update({ where: { id: loan2.id }, data: { status: 'AWAITING_GUARANTORS' } });
  await prisma.loanGuarantor.updateMany({ where: { loanId: loan2.id, guarantorMemberId: david.id }, data: { status: 'ACCEPTED', respondedAt: daysAgo(15) } });

  // 3. Under review — all guarantors accepted
  console.log('Loan 3: UNDER_REVIEW');
  const loan3 = await applyLoan({ member: emeka, product: regularProduct, amount: 200_000_00, tenure: 12, purpose: 'Business expansion', guarantors: [david, funmi] });
  await acceptGuarantor(loan3);
  await prisma.loan.update({ where: { id: loan3.id }, data: { status: 'UNDER_REVIEW' } });

  // 4. Recommended — loan officer signed off, awaiting manager approval
  console.log('Loan 4: RECOMMENDED');
  const loan4 = await applyLoan({ member: funmi, product: emergencyProduct, amount: 80_000_00, tenure: 6, purpose: 'School fees', guarantors: [tunde] });
  await acceptGuarantor(loan4);
  await prisma.loan.update({ where: { id: loan4.id }, data: { status: 'RECOMMENDED' } });
  await prisma.loanApproval.create({ data: { loanId: loan4.id, stage: 'REVIEW', action: 'RECOMMEND', actorId: staff.officer.id, comment: 'Documents verified, recommend approval.' } });

  // 5. Approved — awaiting disbursement
  console.log('Loan 5: APPROVED');
  const loan5 = await applyLoan({ member: tunde, product: regularProduct, amount: 120_000_00, tenure: 12, purpose: 'Vehicle repair', guarantors: [emeka, kemi] });
  await acceptGuarantor(loan5);
  await prisma.loan.update({ where: { id: loan5.id }, data: { status: 'APPROVED', approvedBy: staff.manager.id } });
  await prisma.loanApproval.create({ data: { loanId: loan5.id, stage: 'REVIEW', action: 'RECOMMEND', actorId: staff.officer.id } });
  await prisma.loanApproval.create({ data: { loanId: loan5.id, stage: 'APPROVAL', action: 'APPROVE', actorId: staff.manager.id } });

  // 6. Rejected — declined at review stage
  console.log('Loan 6: REJECTED');
  const loan6 = await applyLoan({ member: kemi, product: emergencyProduct, amount: 60_000_00, tenure: 6, purpose: 'Home repairs', guarantors: [tunde] });
  await acceptGuarantor(loan6);
  await prisma.loan.update({ where: { id: loan6.id }, data: { status: 'REJECTED' } });
  await prisma.loanApproval.create({ data: { loanId: loan6.id, stage: 'REVIEW', action: 'REJECT', actorId: staff.officer.id, comment: 'Insufficient repayment capacity given existing commitments.' } });

  // 7. Active loan with one instalment overdue — disbursed 2 months ago, no repayments made
  console.log('Loan 7: OVERDUE (disbursed 2 months ago, unpaid)');
  const loan7 = await applyLoan({ member: david, product: regularProduct, amount: 100_000_00, tenure: 6, purpose: 'Equipment purchase', guarantors: [emeka, funmi] });
  await acceptGuarantor(loan7);
  const disbursedAt7 = daysAgo(65);
  const schedule7 = generateSchedule(loan7.amount, loan7.rate, loan7.tenureMonths, loan7.method, disbursedAt7);
  await prisma.repaymentSchedule.createMany({
    data: schedule7.map((r) => ({
      loanId: loan7.id, ...r,
      status: r.dueDate < new Date() ? 'OVERDUE' : 'PENDING',
    })),
  });
  await prisma.loan.update({ where: { id: loan7.id }, data: { status: 'OVERDUE', disbursedAt: disbursedAt7, disbursedBy: staff.accountant.id, disbursementMethod: 'bank_transfer' } });
  await prisma.transaction.create({
    data: { memberId: david.id, loanId: loan7.id, type: 'LOAN_DISBURSEMENT', amount: loan7.amount, direction: 'DEBIT', method: 'bank_transfer', recordedBy: staff.accountant.id, createdAt: disbursedAt7 },
  });

  // 8. Fully completed loan — disbursed and repaid in full months ago
  console.log('Loan 8: COMPLETED (fully repaid)');
  const loan8 = await applyLoan({ member: existingChidi, product: emergencyProduct, amount: 50_000_00, tenure: 4, purpose: 'Generator repair', guarantors: [existingBola] });
  await acceptGuarantor(loan8);
  const disbursedAt8 = monthsAgo(6);
  const schedule8 = generateSchedule(loan8.amount, loan8.rate, loan8.tenureMonths, loan8.method, disbursedAt8);
  await prisma.repaymentSchedule.createMany({
    data: schedule8.map((r) => ({ loanId: loan8.id, ...r, amountPaid: r.amountDue, status: 'PAID' })),
  });
  await prisma.loan.update({ where: { id: loan8.id }, data: { status: 'COMPLETED', disbursedAt: disbursedAt8, disbursedBy: staff.accountant.id, disbursementMethod: 'cash' } });
  await prisma.transaction.createMany({
    data: [
      { memberId: existingChidi.id, loanId: loan8.id, type: 'LOAN_DISBURSEMENT', amount: loan8.amount, direction: 'DEBIT', method: 'cash', recordedBy: staff.accountant.id, createdAt: disbursedAt8 },
      ...schedule8.map((r, i) => ({
        memberId: existingChidi.id, loanId: loan8.id, type: 'LOAN_REPAYMENT', amount: r.amountDue, direction: 'CREDIT',
        method: 'manual', recordedBy: staff.accountant.id, createdAt: new Date(r.dueDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      })),
    ],
  });
  await prisma.repayment.createMany({
    data: schedule8.map((r) => ({ loanId: loan8.id, amount: r.amountDue, method: 'manual', recordedBy: staff.accountant.id, paidAt: new Date(r.dueDate.getTime() - 2 * 24 * 60 * 60 * 1000) })),
  });

  // Some extra contribution history for realism on the existing members
  console.log('Adding extra contribution history...');
  for (const [member, months] of [[david, 6], [ngozi, 5], [emeka, 4], [existingAlice, 3]]) {
    for (let i = 0; i < months; i++) {
      const amount = 20_000_00;
      const account = await prisma.savingsAccount.findFirst({ where: { memberId: member.id, type: 'REGULAR' } });
      await prisma.savingsAccount.update({ where: { id: account.id }, data: { balance: { increment: amount } } });
      await prisma.transaction.create({
        data: {
          memberId: member.id, accountId: account.id, type: 'CONTRIBUTION', amount,
          direction: 'CREDIT', method: 'bulk_csv', recordedBy: staff.accountant.id, createdAt: monthsAgo(i + 1),
        },
      });
    }
  }

  console.log('\nDemo data seeded. New logins (password: password123):');
  console.log('  david@coop.test, ngozi@coop.test, emeka@coop.test, funmi@coop.test, tunde@coop.test, kemi@coop.test');
  console.log('Loan statuses now populated: SUBMITTED, AWAITING_GUARANTORS, UNDER_REVIEW, RECOMMENDED, APPROVED, REJECTED, OVERDUE, COMPLETED');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
