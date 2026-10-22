import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = payload; // { id, role, memberId }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// A member can only access their own record unless they're staff.
export async function requireSelfOrStaff(req, res, next) {
  const staffRoles = ['SUPER_ADMIN', 'LOAN_OFFICER', 'APPROVAL_MANAGER', 'ACCOUNTANT'];
  if (staffRoles.includes(req.user.role)) return next();

  const memberId = req.params.memberId || req.params.id;
  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member || member.userId !== req.user.id) {
    return res.status(403).json({ error: 'Forbidden: not your record' });
  }
  next();
}
