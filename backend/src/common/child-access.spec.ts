import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ChildAccess } from './child-access';

// ChildAccess is the ONLY chokepoint between a request and any child's data.
// Any regression here would be a real access-control bug — these tests must
// stay green.

describe('ChildAccess.assertCaregiver', () => {
  const makePrisma = (fixtures: {
    caregiver?: unknown;
    session?: unknown;
  }) =>
    ({
      caregiver: { findUnique: jest.fn().mockResolvedValue(fixtures.caregiver ?? null) },
      therapySession: { findFirst: jest.fn().mockResolvedValue(fixtures.session ?? null) },
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  it('lets an ADMIN through without touching the DB', async () => {
    const prisma = makePrisma({});
    const access = new ChildAccess(prisma);
    await expect(
      access.assertCaregiver('u1', 'ADMIN' as Role, 'child1'),
    ).resolves.toBeUndefined();
    expect(prisma.caregiver.findUnique).not.toHaveBeenCalled();
  });

  it('lets a caregiver-linked user through', async () => {
    const prisma = makePrisma({ caregiver: { id: 'cg1' } });
    const access = new ChildAccess(prisma);
    await expect(
      access.assertCaregiver('u1', 'PARENT' as Role, 'child1'),
    ).resolves.toBeUndefined();
  });

  it('denies a non-caregiver, non-therapist parent', async () => {
    const prisma = makePrisma({});
    const access = new ChildAccess(prisma);
    await expect(
      access.assertCaregiver('u2', 'PARENT' as Role, 'child1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a THERAPIST through when they have any session with the child', async () => {
    const prisma = makePrisma({ session: { id: 's1' } });
    const access = new ChildAccess(prisma);
    await expect(
      access.assertCaregiver('t1', 'THERAPIST' as Role, 'child1'),
    ).resolves.toBeUndefined();
  });

  it('denies a THERAPIST with no session for the child', async () => {
    const prisma = makePrisma({});
    const access = new ChildAccess(prisma);
    await expect(
      access.assertCaregiver('t1', 'THERAPIST' as Role, 'child1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
