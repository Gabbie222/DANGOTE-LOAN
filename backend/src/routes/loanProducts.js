import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { audit } from '../lib/audit.js';

const router = Router();

const productSchema = z.object({
  name: z.string().min(1),
  rate: z.number().positive(),
  method: z.enum(['FLAT', 'REDUCING']).default('FLAT'),
  minAmount: z.number().int().positive(),
  maxAmount: z.number().int().positive(),
  maxTenureMonths: z.number().int().positive(),
  minMembershipMonths: z.number().int().nonnegative().default(6),
  savingsMultiplier: z.number().positive().default(2),
  guarantorsRequired: z.number().int().nonnegative().default(2),
  processingFeePct: z.number().nonnegative().default(0),
  penaltyRatePct: z.number().nonnegative().default(0),
});

router.get('/', requireAuth, async (req, res) => {
  const products = await prisma.loanProduct.findMany({ where: { active: true }, orderBy: { createdAt: 'asc' } });
  res.json(products);
});

router.post('/', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const product = await prisma.loanProduct.create({ data: parsed.data });
  await audit({ actorId: req.user.id, action: 'CREATE', entity: 'LoanProduct', entityId: product.id, newValue: product });
  res.status(201).json(product);
});

router.patch('/:id', requireAuth, requireRole('SUPER_ADMIN'), async (req, res) => {
  const before = await prisma.loanProduct.findUnique({ where: { id: req.params.id } });
  if (!before) return res.status(404).json({ error: 'Not found' });
  const updated = await prisma.loanProduct.update({ where: { id: req.params.id }, data: req.body });
  await audit({ actorId: req.user.id, action: 'UPDATE', entity: 'LoanProduct', entityId: updated.id, oldValue: before, newValue: updated });
  res.json(updated);
});

export default router;
