import { prisma } from './prisma.js';

export async function audit({ actorId, action, entity, entityId, oldValue, newValue }) {
  await prisma.auditLog.create({
    data: {
      actorId: actorId ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      oldValue: oldValue !== undefined ? JSON.stringify(oldValue) : null,
      newValue: newValue !== undefined ? JSON.stringify(newValue) : null,
    },
  });
}
