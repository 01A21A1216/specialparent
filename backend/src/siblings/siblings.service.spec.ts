import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { SiblingsService } from './siblings.module';

// Sibling linking is the code path that cross-references two children in
// two different families. Every branch has security implications (must be
// caregiver of BOTH) and every merge case has to stay symmetric.

describe('SiblingsService.link', () => {
  const buildAccess = (opts: {
    grants?: string[];
    denyOther?: boolean;
  } = {}) => {
    const { grants = ['a', 'b'], denyOther = false } = opts;
    return {
      assertCaregiver: jest.fn(async (_uid: string, _role: unknown, childId: string) => {
        if (denyOther && childId === 'b') throw new ForbiddenException();
        if (!grants.includes(childId)) throw new ForbiddenException();
      }),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  const buildPrisma = (a: unknown, b: unknown) =>
    ({
      child: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where: { id } }: { where: { id: string } }) =>
            id === 'a' ? a : b,
          ),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(2),
      },
      siblingGroup: {
        create: jest.fn().mockResolvedValue({ id: 'g-new' }),
        delete: jest.fn().mockResolvedValue({}),
      },
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const user = { id: 'u1', role: 'PARENT' as const, email: 'x@x.com' };

  it('rejects self-linking', async () => {
    const svc = new SiblingsService(buildPrisma({}, {}), buildAccess());
    await expect(svc.link(user, 'a', { otherChildId: 'a' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('denies linking when the user is a caregiver of only one of the two', async () => {
    const access = buildAccess({ denyOther: true });
    const svc = new SiblingsService(buildPrisma({ id: 'a' }, { id: 'b' }), access);
    await expect(svc.link(user, 'a', { otherChildId: 'b' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('creates a fresh SiblingGroup when neither child is grouped', async () => {
    const prisma = buildPrisma(
      { id: 'a', siblingGroupId: null },
      { id: 'b', siblingGroupId: null },
    );
    const svc = new SiblingsService(prisma, buildAccess());
    const res = await svc.link(user, 'a', { otherChildId: 'b' });
    expect(prisma.siblingGroup.create).toHaveBeenCalled();
    expect(prisma.child.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] } },
      data: { siblingGroupId: 'g-new' },
    });
    expect(res.siblingGroupId).toBe('g-new');
  });

  it('reuses A\'s group when only A is grouped', async () => {
    const prisma = buildPrisma(
      { id: 'a', siblingGroupId: 'g-old' },
      { id: 'b', siblingGroupId: null },
    );
    const svc = new SiblingsService(prisma, buildAccess());
    const res = await svc.link(user, 'a', { otherChildId: 'b' });
    expect(prisma.siblingGroup.create).not.toHaveBeenCalled();
    expect(prisma.child.update).toHaveBeenCalledWith({
      where: { id: 'b' },
      data: { siblingGroupId: 'g-old' },
    });
    expect(res.siblingGroupId).toBe('g-old');
  });

  it('merges B\'s group into A\'s when both are separately grouped', async () => {
    const prisma = buildPrisma(
      { id: 'a', siblingGroupId: 'g-A' },
      { id: 'b', siblingGroupId: 'g-B' },
    );
    const svc = new SiblingsService(prisma, buildAccess());
    const res = await svc.link(user, 'a', { otherChildId: 'b' });
    // Every member of g-B rehomed to g-A, then g-B deleted.
    expect(prisma.child.updateMany).toHaveBeenCalledWith({
      where: { siblingGroupId: 'g-B' },
      data: { siblingGroupId: 'g-A' },
    });
    expect(prisma.siblingGroup.delete).toHaveBeenCalledWith({ where: { id: 'g-B' } });
    expect(res.siblingGroupId).toBe('g-A');
  });

  it('is a no-op when both are already in the same group', async () => {
    const prisma = buildPrisma(
      { id: 'a', siblingGroupId: 'g' },
      { id: 'b', siblingGroupId: 'g' },
    );
    const svc = new SiblingsService(prisma, buildAccess());
    await svc.link(user, 'a', { otherChildId: 'b' });
    expect(prisma.siblingGroup.create).not.toHaveBeenCalled();
    expect(prisma.siblingGroup.delete).not.toHaveBeenCalled();
    expect(prisma.child.update).not.toHaveBeenCalled();
    expect(prisma.child.updateMany).not.toHaveBeenCalled();
  });

  it('dissolves the group when unlinking leaves fewer than 2 members', async () => {
    const prisma = buildPrisma({ id: 'a', siblingGroupId: 'g' }, {});
    prisma.child.count.mockResolvedValue(1); // one member left after unlink
    const svc = new SiblingsService(prisma, buildAccess({ grants: ['a'] }));
    await svc.unlink(user, 'a');
    expect(prisma.child.updateMany).toHaveBeenCalledWith({
      where: { siblingGroupId: 'g' },
      data: { siblingGroupId: null },
    });
    expect(prisma.siblingGroup.delete).toHaveBeenCalledWith({ where: { id: 'g' } });
  });
});
