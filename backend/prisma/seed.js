import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function makeStaff(email, role, name) {
  const passwordHash = await bcrypt.hash('password123', 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, role },
  });
}

async function makeMember(email, memberNo, firstName, lastName, joinDate, savings) {
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
      status: 'ACTIVE', phone: '08000000000', employer: 'Dangote Group',
      membershipFeePaid: true, entranceFeePaid: true,
    },
  });
  await prisma.savingsAccount.upsert({
    where: { memberId_type: { memberId: member.id, type: 'REGULAR' } },
    update: { balance: savings },
    create: { memberId: member.id, type: 'REGULAR', balance: savings },
  });
  await prisma.savingsAccount.upsert({
    where: { memberId_type: { memberId: member.id, type: 'SHARES' } },
    update: {},
    create: { memberId: member.id, type: 'SHARES', balance: Math.round(savings * 0.2) },
  });
  return member;
}

async function main() {
  console.log('Seeding...');

  await makeStaff('admin@coop.test', 'SUPER_ADMIN', 'Admin');
  await makeStaff('officer@coop.test', 'LOAN_OFFICER', 'Loan Officer');
  await makeStaff('manager@coop.test', 'APPROVAL_MANAGER', 'Approval Manager');
  await makeStaff('accountant@coop.test', 'ACCOUNTANT', 'Accountant');

  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

  const alice = await makeMember('alice@coop.test', 'COOP/2024/0001', 'Alice', 'Nwosu', twoYearsAgo, 500_000_00);
  const bola = await makeMember('bola@coop.test', 'COOP/2024/0002', 'Bola', 'Adeyemi', twoYearsAgo, 300_000_00);
  await makeMember('chidi@coop.test', 'COOP/2025/0003', 'Chidi', 'Okafor', new Date(), 100_000_00);

  await prisma.loanProduct.upsert({
    where: { id: 'seed-regular' },
    update: {},
    create: {
      id: 'seed-regular', name: 'Regular Loan', rate: 12, method: 'REDUCING',
      minAmount: 50_000_00, maxAmount: 2_000_000_00, maxTenureMonths: 24,
      minMembershipMonths: 6, savingsMultiplier: 2, guarantorsRequired: 2,
      processingFeePct: 1, penaltyRatePct: 2,
    },
  });
  await prisma.loanProduct.upsert({
    where: { id: 'seed-emergency' },
    update: {},
    create: {
      id: 'seed-emergency', name: 'Emergency Loan', rate: 10, method: 'FLAT',
      minAmount: 20_000_00, maxAmount: 500_000_00, maxTenureMonths: 12,
      minMembershipMonths: 3, savingsMultiplier: 1, guarantorsRequired: 1,
      processingFeePct: 1, penaltyRatePct: 2,
    },
  });

  console.log('Seed complete. Test logins (password: password123):');
  console.log('  admin@coop.test / officer@coop.test / manager@coop.test / accountant@coop.test');
  console.log('  alice@coop.test / bola@coop.test / chidi@coop.test');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
