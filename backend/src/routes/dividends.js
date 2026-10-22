import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';

const router = Router();

function settingsKey(year) {
  return `dividend_computed_${year}`;
}

router.get('/:year', requireAuth, requireRole('SUPER_ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const year = Number(req.params.year);
  const setting = await prisma.settings.findUnique({ where: { key: settingsKey(year) } });
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const transactions = await prisma.transaction.findMany({
    where: { type: 'DIVIDEND', createdAt: { gte: start, lt: end } },
    include: { member: { select: { firstName: true, lastName: true, memberNo: true } } },
    orderBy: { amount: 'desc' },
  });
  res.json({
    computed: !!setting,
    meta: setting ? JSON.parse(setting.value) : null,
    payouts: transactions,
  });
});

const computeSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  ratePct: z.number().positive().max(100),
});

// Simplified year-end computation: applies ratePct to each active member's current REGULAR
// savings balance and credits the result to that same account as a DIVIDEND transaction.
// This is a simplification of a true average-daily-balance dividend scheme — acceptable for
// an MVP, but flag it if the cooperative needs proportional-to-time-held accuracy.
router.post('/compute', requireAuth, requireRole('SUPER_ADMIN', 'ACCOUNTANT'), async (req, res) => {
  const parsed = computeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const { year, ratePct } = parsed.data;

  const existing = await prisma.settings.findUnique({ where: { key: settingsKey(year) } });
  if (existing) {
    return res.status(409).json({ error: `Dividends for ${year} have already been computed`, meta: JSON.parse(existing.value) });
  }

  const members = await prisma.member.findMany({
    where: { status: 'ACTIVE' },
    include: { savingsAccounts: { where: { type: 'REGULAR' } } },
  });

  let totalKobo = 0;
  let payoutCount = 0;

  await prisma.$transaction(async (tx) => {
    for (const member of members) {
      const account = member.savingsAccounts[0];
      if (!account || account.balance <= 0) continue;
      const amount = Math.round(account.balance * (ratePct / 100));
      if (amount <= 0) continue;

      await tx.savingsAccount.update({ where: { id: account.id }, data: { balance: { increment: amount } } });
      await tx.transaction.create({
        data: {
          memberId: member.id, accountId: account.id, type: 'DIVIDEND', amount,
          direction: 'CREDIT', method: 'year_end_computation', reference: String(year), recordedBy: req.user.id,
        },
      });
      totalKobo += amount;
      payoutCount += 1;
    }

    await tx.settings.create({
      data: {
        key: settingsKey(year),
        value: JSON.stringify({ computedAt: new Date().toISOString(), ratePct, totalKobo, payoutCount, computedBy: req.user.id }),
      },
    });
  });

  await audit({ actorId: req.user.id, action: 'COMPUTE_DIVIDENDS', entity: 'Settings', entityId: settingsKey(year), newValue: { year, ratePct, totalKobo, payoutCount } });
  res.status(201).json({ year, ratePct, totalKobo, payoutCount });
});

export default router;
