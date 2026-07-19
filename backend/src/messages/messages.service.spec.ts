import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { MessagesService } from './messages.module';

// Direct messaging is the only place data flows between two users. The
// invariants here: participants only, no thread dedupe misses, and reading
// a thread flips unread → read.

describe('MessagesService', () => {
  const buildPrisma = () =>
    ({
      messageThread: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        // Returns the row for the caller; passing through the id so callers
        // that read `thread.id` after update get the right value.
        update: jest.fn().mockImplementation(({ where }: { where: { id: string } }) =>
          Promise.resolve({ id: where.id }),
        ),
      },
      message: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      user: { findUnique: jest.fn() },
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const alice = { id: 'alice', role: 'PARENT' as const, email: 'a@x.com' };

  it("blocks messaging yourself", async () => {
    const svc = new MessagesService(buildPrisma());
    await expect(
      svc.startThread(alice, { toUserId: 'alice', body: 'hi' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when the recipient does not exist or is deactivated', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const svc = new MessagesService(prisma);
    await expect(
      svc.startThread(alice, { toUserId: 'nobody', body: 'hi' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('opens the SAME thread twice — dedupes by (A, B, childId)', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'bob', isActive: true });
    prisma.messageThread.findFirst.mockResolvedValue({ id: 't-existing' });
    const svc = new MessagesService(prisma);
    const res = await svc.startThread(alice, {
      toUserId: 'bob',
      childId: 'c1',
      body: 'hi again',
    });
    expect(res).toEqual({ threadId: 't-existing' });
    expect(prisma.messageThread.create).not.toHaveBeenCalled();
  });

  it('creates when no thread exists and orders participants A < B', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'bob', isActive: true });
    prisma.messageThread.findFirst.mockResolvedValue(null);
    prisma.messageThread.create.mockResolvedValue({ id: 't-new' });
    const svc = new MessagesService(prisma);
    await svc.startThread(alice, { toUserId: 'bob', body: 'hi' });
    const created = prisma.messageThread.create.mock.calls[0][0].data;
    // 'alice' < 'bob' lexicographically, so participantA must be 'alice'.
    expect(created.participantAId).toBe('alice');
    expect(created.participantBId).toBe('bob');
  });

  it('empty body still creates the thread but does not create a Message row', async () => {
    const prisma = buildPrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'bob', isActive: true });
    prisma.messageThread.findFirst.mockResolvedValue(null);
    prisma.messageThread.create.mockResolvedValue({ id: 't-new' });
    const svc = new MessagesService(prisma);
    await svc.startThread(alice, { toUserId: 'bob' });
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('getThread marks unread messages as read on load', async () => {
    const prisma = buildPrisma();
    prisma.messageThread.findUnique.mockResolvedValue({
      id: 't1',
      participantAId: 'alice',
      participantBId: 'bob',
      participantA: { id: 'alice', fullName: 'A', role: 'PARENT' },
      participantB: { id: 'bob', fullName: 'B', role: 'THERAPIST' },
      child: null,
    });
    const svc = new MessagesService(prisma);
    await svc.getThread(alice, 't1');
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { threadId: 't1', readAt: null, NOT: { senderId: 'alice' } },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    });
  });

  it('getThread rejects a non-participant with 403', async () => {
    const prisma = buildPrisma();
    prisma.messageThread.findUnique.mockResolvedValue({
      id: 't1',
      participantAId: 'x',
      participantBId: 'y',
      participantA: { id: 'x', fullName: 'X', role: 'PARENT' },
      participantB: { id: 'y', fullName: 'Y', role: 'PARENT' },
      child: null,
    });
    const svc = new MessagesService(prisma);
    await expect(svc.getThread(alice, 't1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
