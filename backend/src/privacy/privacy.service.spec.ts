import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrivacyService } from './privacy.module';

// DPDP compliance path — regressions here are legal risk, not just bugs.
// The two invariants we test: the export contains everything and the
// deletion requires both a valid password AND the exact confirmation
// phrase.

describe('PrivacyService', () => {
  const buildPrisma = () =>
    ({
      user: {
        findUnique: jest.fn(),
        delete: jest.fn().mockResolvedValue({}),
      },
      caregiver: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      aiMessage: { findMany: jest.fn().mockResolvedValue([]) },
      communityPost: { findMany: jest.fn().mockResolvedValue([]) },
      communityComment: { findMany: jest.fn().mockResolvedValue([]) },
      notification: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
      therapySession: { findMany: jest.fn().mockResolvedValue([]) },
      behaviorEvent: { findMany: jest.fn().mockResolvedValue([]) },
      authToken: { findMany: jest.fn().mockResolvedValue([]) },
      child: { deleteMany: jest.fn().mockResolvedValue({}), findUnique: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((ops: unknown[]) => Promise.all(ops)),
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const user = { id: 'u1', role: 'PARENT' as const, email: 'p@x.com' };

  it('export includes every top-level footprint key even when tables are empty', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'p@x.com' });
    const svc = new PrivacyService(prisma);
    const exp = await svc.exportUserData('u1');
    expect(Object.keys(exp)).toEqual(
      expect.arrayContaining([
        'exportedAt',
        'note',
        'user',
        'caregiverLinks',
        'childrenAsPrimary',
        'authoredSessions',
        'behaviorEvents',
        'aiMessages',
        'communityPosts',
        'communityComments',
        'notifications',
        'auditLogs',
        'authTokens',
      ]),
    );
  });

  it('deleteAccount rejects the wrong confirmation phrase', async () => {
    const svc = new PrivacyService(buildPrisma());
    await expect(
      svc.deleteAccount('u1', {
        currentPassword: 'x',
        confirm: 'nope',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteAccount rejects the wrong password', async () => {
    const prisma = buildPrisma();
    const hash = await bcrypt.hash('rightPass1', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: hash,
      isActive: true,
    });
    const svc = new PrivacyService(prisma);
    await expect(
      svc.deleteAccount('u1', {
        currentPassword: 'wrongPass1',
        confirm: 'delete my account',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deleteAccount removes only children the user is sole caregiver of', async () => {
    const prisma = buildPrisma();
    const hash = await bcrypt.hash('rightPass1', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      passwordHash: hash,
      isActive: true,
    });
    prisma.caregiver.findMany.mockResolvedValue([
      { childId: 'child-solo' },
      { childId: 'child-shared' },
    ]);
    // Solo child returns 0 other caregivers; shared returns 1.
    prisma.caregiver.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1);
    const svc = new PrivacyService(prisma);
    const result = await svc.deleteAccount('u1', {
      currentPassword: 'rightPass1',
      confirm: 'delete my account',
    });
    expect(result).toEqual({ ok: true, deletedChildren: 1 });
    expect(prisma.child.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['child-solo'] } },
    });
  });
});
