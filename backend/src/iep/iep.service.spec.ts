import { BadRequestException } from '@nestjs/common';
import { IepService } from './iep.module';

// The IEP approval flow is a state machine — every transition matters
// because a wrongly-activated IEP means an unreviewed plan silently
// becomes the "current" one. These tests pin down the guards.

describe('IepService state machine', () => {
  const access = { assertCaregiver: jest.fn().mockResolvedValue(undefined) } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const buildPrisma = (initial: {
    status: string;
    approvals?: Array<{ role: string }>;
  }) =>
    ({
      iep: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ childId: 'c1', status: initial.status }),
        update: jest.fn().mockResolvedValue({}),
      },
      iepApproval: {
        findMany: jest
          .fn()
          .mockResolvedValue(initial.approvals ?? []),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
      iepGoal: { findMany: jest.fn().mockResolvedValue([]) },
      iepReview: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest
        .fn()
        .mockImplementation((ops: unknown[]) => Promise.all(ops)),
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const parent = { id: 'u-parent', role: 'PARENT' as const, email: 'p@x.com' };
  const therapist = { id: 'u-t', role: 'THERAPIST' as const, email: 't@x.com' };

  it('rejects submit on an already-ACTIVE IEP', async () => {
    const prisma = buildPrisma({ status: 'ACTIVE' });
    const svc = new IepService(prisma, access);
    await expect(svc.submitForReview(parent, 'i1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('DRAFT → PENDING_REVIEW on submit', async () => {
    const prisma = buildPrisma({ status: 'DRAFT' });
    const svc = new IepService(prisma, access);
    await svc.submitForReview(parent, 'i1');
    expect(prisma.iep.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'PENDING_REVIEW' } }),
    );
  });

  it('retract clears every existing approval', async () => {
    const prisma = buildPrisma({ status: 'PENDING_REVIEW' });
    const svc = new IepService(prisma, access);
    await svc.retractReview(parent, 'i1');
    expect(prisma.iepApproval.deleteMany).toHaveBeenCalledWith({
      where: { iepId: 'i1' },
    });
  });

  it('parent-only signature does NOT auto-activate', async () => {
    const prisma = buildPrisma({
      status: 'PENDING_REVIEW',
      approvals: [{ role: 'PARENT' }], // only caregiver, no professional
    });
    prisma.iep.findUnique.mockResolvedValueOnce({ childId: 'c1', status: 'PENDING_REVIEW' });
    const svc = new IepService(prisma, access);
    await svc.approve(parent, 'i1', {} as any);
    // Only status update should be inside maybeActivate. Verify it did NOT
    // fire the ACTIVE transition.
    const updates = prisma.iep.update.mock.calls;
    const active = updates.find(
      (c: unknown[]) =>
        (c[0] as { data: { status?: string } }).data?.status === 'ACTIVE',
    );
    expect(active).toBeUndefined();
  });

  it('caregiver + professional together auto-activates + stamps effectiveFrom', async () => {
    const prisma = buildPrisma({
      status: 'PENDING_REVIEW',
      approvals: [{ role: 'PARENT' }, { role: 'THERAPIST' }],
    });
    prisma.iep.findUnique.mockResolvedValue({ childId: 'c1', status: 'PENDING_REVIEW' });
    const svc = new IepService(prisma, access);
    await svc.approve(therapist, 'i1', {} as any);
    const updates = prisma.iep.update.mock.calls;
    const active = updates.find(
      (c: unknown[]) =>
        (c[0] as { data: { status?: string } }).data?.status === 'ACTIVE',
    );
    expect(active).toBeDefined();
    expect(active![0].data.effectiveFrom).toBeInstanceOf(Date);
  });

  it('two professionals without a parent still does NOT activate', async () => {
    const prisma = buildPrisma({
      status: 'PENDING_REVIEW',
      approvals: [{ role: 'THERAPIST' }, { role: 'SPECIAL_EDUCATOR' }],
    });
    prisma.iep.findUnique.mockResolvedValue({ childId: 'c1', status: 'PENDING_REVIEW' });
    const svc = new IepService(prisma, access);
    await svc.approve(therapist, 'i1', {} as any);
    const active = prisma.iep.update.mock.calls.find(
      (c: unknown[]) =>
        (c[0] as { data: { status?: string } }).data?.status === 'ACTIVE',
    );
    expect(active).toBeUndefined();
  });
});
