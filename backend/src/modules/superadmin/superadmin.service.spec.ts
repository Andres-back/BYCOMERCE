import { ConflictException, NotFoundException } from '@nestjs/common';
import { SuperadminService } from './superadmin.service';

describe('SuperadminService plans', () => {
  function serviceWith(prisma: Record<string, unknown>) {
    return new SuperadminService(
      prisma as never,
      { log: jest.fn() } as never,
      { emit: jest.fn() } as never,
    );
  }

  it('returns 404 when updating a missing plan', async () => {
    const service = serviceWith({
      plan: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });

    await expect(service.updatePlan('missing', { nombre: 'Pro' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns 409 when the new plan name already belongs to another plan', async () => {
    const prisma = {
      plan: {
        findFirst: jest.fn().mockResolvedValue({ id: 'plan-a', nombre: 'Basico' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'plan-b', nombre: 'Premium' }),
        update: jest.fn(),
      },
    };
    const service = serviceWith(prisma);

    await expect(service.updatePlan('plan-a', { nombre: 'Premium' })).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.plan.update).not.toHaveBeenCalled();
  });

  it('updates a plan when the name remains unique', async () => {
    const updated = { id: 'plan-a', nombre: 'Pro', precio: 10000 };
    const audit = { log: jest.fn() };
    const prisma = {
      plan: {
        findFirst: jest.fn().mockResolvedValue({ id: 'plan-a', nombre: 'Basico' }),
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue(updated),
      },
    };
    const service = new SuperadminService(prisma as never, audit as never, { emit: jest.fn() } as never);

    await expect(service.updatePlan('plan-a', { nombre: 'Pro', precio: 10000 })).resolves.toEqual(updated);
    expect(prisma.plan.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'plan-a' } }));
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ accion: 'PLAN_ACTUALIZADO' }));
  });
});
