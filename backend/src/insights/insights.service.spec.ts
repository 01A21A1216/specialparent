import { InsightsService } from './insights.module';

// Insights aggregates from real user data. The math has to be right —
// a wrong mood-average or attendance-percent shown to a parent is worse
// than showing nothing.

describe('InsightsService.childInsights', () => {
  const access = { assertCaregiver: jest.fn().mockResolvedValue(undefined) } as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const buildPrisma = (overrides: Record<string, unknown> = {}) =>
    ({
      child: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'c1',
          fullName: 'X',
          dateOfBirth: new Date('2018-01-01'),
        }),
      },
      moodEntry: { findMany: jest.fn().mockResolvedValue([]) },
      milestone: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      therapySession: { findMany: jest.fn().mockResolvedValue([]) },
      behaviorEvent: { findMany: jest.fn().mockResolvedValue([]) },
      goal: { findMany: jest.fn().mockResolvedValue([]) },
      ...overrides,
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const user = { id: 'u1', role: 'PARENT' as const, email: 'p@x.com' };

  it('handles an empty child gracefully — all stats null, zero counts', async () => {
    const svc = new InsightsService(buildPrisma(), access);
    const r = await svc.childInsights(user, 'c1', 30);
    expect(r.mood.avg).toBeNull();
    expect(r.mood.entries).toBe(0);
    expect(r.behavior.total).toBe(0);
    expect(r.sessions.total).toBe(0);
    expect(r.sessions.attendancePercent).toBeNull();
    expect(r.milestones.achievedInWindow).toBe(0);
    expect(r.goals.avgProgress).toBeNull();
  });

  it('computes the mood average correctly — GREAT=4, HARD=0', async () => {
    const now = new Date();
    const prisma = buildPrisma({
      moodEntry: {
        findMany: jest.fn().mockImplementation(({ where }: { where: { loggedAt: { gte: Date; lt?: Date } } }) => {
          // Current-window call (no `lt`): 4 entries, avg = (4+3+2+0)/4 = 2.25
          if (!where.loggedAt.lt) {
            return [
              { mood: 'GREAT', loggedAt: now },
              { mood: 'GOOD', loggedAt: now },
              { mood: 'OKAY', loggedAt: now },
              { mood: 'HARD', loggedAt: now },
            ];
          }
          return []; // no prior-window data
        }),
      },
    });
    const svc = new InsightsService(prisma, access);
    const r = await svc.childInsights(user, 'c1', 30);
    expect(r.mood.avg).toBe(2.25);
    expect(r.mood.entries).toBe(4);
    // No prior data → delta null (not zero).
    expect(r.mood.delta).toBeNull();
  });

  it('attendance is COMPLETED / (COMPLETED + NO_SHOW + CANCELLED); SCHEDULED ignored', async () => {
    const prisma = buildPrisma({
      therapySession: {
        findMany: jest.fn().mockImplementation(({ where }: { where: { scheduledAt: { gte: Date; lt?: Date } } }) => {
          if (!where.scheduledAt.lt) {
            return [
              { id: '1', status: 'COMPLETED', scheduledAt: new Date(), notes: 'x' },
              { id: '2', status: 'COMPLETED', scheduledAt: new Date(), notes: null },
              { id: '3', status: 'NO_SHOW', scheduledAt: new Date(), notes: null },
              { id: '4', status: 'SCHEDULED', scheduledAt: new Date(), notes: null },
            ];
          }
          return [];
        }),
      },
    });
    const svc = new InsightsService(prisma, access);
    const r = await svc.childInsights(user, 'c1', 30);
    // scored = 3 (2 COMPLETED + 1 NO_SHOW); attendance = 2/3 = 67%.
    expect(r.sessions.attendancePercent).toBe(67);
    // documented = 1 of 2 COMPLETED = 50%.
    expect(r.sessions.documentedPercent).toBe(50);
  });

  it('behavior kind breakdown counts by kind + total', async () => {
    const prisma = buildPrisma({
      behaviorEvent: {
        findMany: jest.fn().mockImplementation(({ where }: { where: { occurredAt: { gte: Date; lt?: Date } } }) => {
          if (!where.occurredAt.lt) {
            return [
              { kind: 'MELTDOWN', occurredAt: new Date() },
              { kind: 'MELTDOWN', occurredAt: new Date() },
              { kind: 'SLEEP', occurredAt: new Date() },
            ];
          }
          return [];
        }),
      },
    });
    const svc = new InsightsService(prisma, access);
    const r = await svc.childInsights(user, 'c1', 30);
    expect(r.behavior.total).toBe(3);
    expect(r.behavior.byKind).toEqual({ MELTDOWN: 2, SLEEP: 1 });
  });

  it('clamps range to [7, 180] days', async () => {
    const svc = new InsightsService(buildPrisma(), access);
    const short = await svc.childInsights(user, 'c1', 1);
    const long = await svc.childInsights(user, 'c1', 9999);
    expect(short.rangeDays).toBe(7);
    expect(long.rangeDays).toBe(180);
  });
});
