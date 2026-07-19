import {
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';

// M10 — Insights: honest analytics from data we already store. No ML, no
// predictive models. Aggregates mood, milestones, sessions, behavior, and
// goal-progress across a user-chosen window and returns a summary + a set
// of tiny time-series arrays the frontend can render.

const MOOD_SCORE: Record<string, number> = {
  GREAT: 4,
  GOOD: 3,
  OKAY: 2,
  TOUGH: 1,
  HARD: 0,
};

interface Bucket {
  date: string; // YYYY-MM-DD
  moods: number[]; // scores for that day
  behaviorCount: number;
}

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  async childInsights(user: AuthUser, childId: string, days: number) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    const rangeDays = Math.min(Math.max(days || 30, 7), 180);
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
    // Previous window of equal length for delta comparison.
    const prevSince = new Date(since.getTime() - rangeDays * 24 * 60 * 60 * 1000);

    const [
      child,
      moods,
      prevMoods,
      milestones,
      milestonesTotal,
      sessions,
      prevSessions,
      behavior,
      prevBehavior,
      goals,
    ] = await Promise.all([
      this.prisma.child.findUnique({
        where: { id: childId },
        select: { id: true, fullName: true, dateOfBirth: true },
      }),
      this.prisma.moodEntry.findMany({
        where: { childId, loggedAt: { gte: since } },
        select: { mood: true, loggedAt: true },
        orderBy: { loggedAt: 'asc' },
      }),
      this.prisma.moodEntry.findMany({
        where: { childId, loggedAt: { gte: prevSince, lt: since } },
        select: { mood: true },
      }),
      this.prisma.milestone.findMany({
        where: { childId, updatedAt: { gte: since } },
        select: { id: true, status: true, achievedAt: true, updatedAt: true, domain: true },
      }),
      this.prisma.milestone.count({ where: { childId } }),
      this.prisma.therapySession.findMany({
        where: { childId, scheduledAt: { gte: since, lte: new Date() } },
        select: { id: true, status: true, scheduledAt: true, type: true, notes: true },
      }),
      this.prisma.therapySession.findMany({
        where: {
          childId,
          scheduledAt: { gte: prevSince, lt: since },
        },
        select: { id: true, status: true },
      }),
      this.prisma.behaviorEvent.findMany({
        where: { childId, occurredAt: { gte: since } },
        select: { kind: true, occurredAt: true, severity: true },
      }),
      this.prisma.behaviorEvent.findMany({
        where: { childId, occurredAt: { gte: prevSince, lt: since } },
        select: { id: true },
      }),
      this.prisma.goal.findMany({
        where: { childId, status: 'ACTIVE' },
        select: { id: true, title: true, progress: true, updatedAt: true },
      }),
    ]);

    if (!child) throw new Error('Child not found');

    // ── Mood: daily buckets → average score, plus overall period average.
    const dayMap = new Map<string, Bucket>();
    for (let d = 0; d < rangeDays; d++) {
      const key = dayKey(new Date(since.getTime() + d * 24 * 60 * 60 * 1000));
      dayMap.set(key, { date: key, moods: [], behaviorCount: 0 });
    }
    for (const m of moods) {
      const key = dayKey(m.loggedAt);
      dayMap.get(key)?.moods.push(MOOD_SCORE[m.mood] ?? 2);
    }
    for (const b of behavior) {
      const key = dayKey(b.occurredAt);
      const bucket = dayMap.get(key);
      if (bucket) bucket.behaviorCount += 1;
    }

    const moodSeries = Array.from(dayMap.values()).map((b) => ({
      date: b.date,
      avg: b.moods.length
        ? Number((b.moods.reduce((a, x) => a + x, 0) / b.moods.length).toFixed(2))
        : null,
    }));
    const behaviorSeries = Array.from(dayMap.values()).map((b) => ({
      date: b.date,
      count: b.behaviorCount,
    }));
    const avgMood = moods.length
      ? Number(
          (
            moods.map((m) => MOOD_SCORE[m.mood] ?? 2).reduce((a, x) => a + x, 0) /
            moods.length
          ).toFixed(2),
        )
      : null;
    const avgMoodPrev = prevMoods.length
      ? Number(
          (
            prevMoods
              .map((m) => MOOD_SCORE[m.mood] ?? 2)
              .reduce((a, x) => a + x, 0) / prevMoods.length
          ).toFixed(2),
        )
      : null;

    // ── Sessions: attendance rate (completed / (completed + no_show + cancelled)),
    // and total-vs-prev-window delta.
    const completed = sessions.filter((s) => s.status === 'COMPLETED').length;
    const scored = sessions.filter((s) =>
      ['COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(s.status),
    ).length;
    const attendance =
      scored > 0 ? Number(((completed / scored) * 100).toFixed(0)) : null;
    const documentedRate =
      completed > 0
        ? Number(
            (
              (sessions.filter((s) => s.status === 'COMPLETED' && !!s.notes).length /
                completed) *
              100
            ).toFixed(0),
          )
        : null;

    // ── Milestones: how many moved to ACHIEVED in this window.
    const achieved = milestones.filter((m) => m.status === 'ACHIEVED').length;
    const inProgress = milestones.filter((m) => m.status === 'IN_PROGRESS').length;

    // ── Behavior kind breakdown for the pie / stacked bar.
    const behaviorByKind: Record<string, number> = {};
    for (const b of behavior) {
      behaviorByKind[b.kind] = (behaviorByKind[b.kind] ?? 0) + 1;
    }

    // ── Goals: average current progress (0-100).
    const avgGoalProgress = goals.length
      ? Math.round(goals.reduce((a, g) => a + g.progress, 0) / goals.length)
      : null;

    return {
      child: {
        id: child.id,
        fullName: child.fullName,
      },
      rangeDays,
      rangeStart: since.toISOString(),
      rangeEnd: new Date().toISOString(),
      mood: {
        avg: avgMood,
        prevAvg: avgMoodPrev,
        delta: avgMood !== null && avgMoodPrev !== null
          ? Number((avgMood - avgMoodPrev).toFixed(2))
          : null,
        entries: moods.length,
        series: moodSeries,
      },
      behavior: {
        total: behavior.length,
        prevTotal: prevBehavior.length,
        delta: behavior.length - prevBehavior.length,
        byKind: behaviorByKind,
        series: behaviorSeries,
      },
      sessions: {
        total: sessions.length,
        prevTotal: prevSessions.length,
        attendancePercent: attendance,
        documentedPercent: documentedRate,
      },
      milestones: {
        total: milestonesTotal,
        achievedInWindow: achieved,
        inProgress,
      },
      goals: {
        active: goals.length,
        avgProgress: avgGoalProgress,
      },
    };
  }
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@ApiTags('insights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('insights')
export class InsightsController {
  constructor(private readonly svc: InsightsService) {}

  @Get('children/:childId')
  child(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Query('days') days?: string,
  ) {
    return this.svc.childInsights(user, childId, days ? parseInt(days, 10) : 30);
  }
}

@Module({
  controllers: [InsightsController],
  providers: [InsightsService, ChildAccess],
})
export class InsightsModule {}
