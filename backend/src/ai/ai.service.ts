import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ChildAccess } from '../common/child-access';
import { AuthUser } from '../common/current-user.decorator';
import * as crypto from 'crypto';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are SpecialParent.in's AI guidance assistant for parents and caregivers of children with special needs (ASD, ADHD, speech delays, learning differences, etc.) in India.

Be: warm, calm, non-judgmental, practical. Use plain language. Acknowledge emotional weight.
Always remind users you are not a replacement for a licensed therapist or doctor — and recommend professional consultation for clinical decisions, medication, or crisis situations.
If a user describes a crisis (self-harm, child in danger, severe distress), immediately suggest contacting iCall (9152987821) or KIRAN national helpline (1800-599-0019), and a trusted person nearby.
Where useful, mention India-specific resources (RPWD Act, UDID card, Niramaya Health Insurance) when relevant.
Keep responses focused, around 4-8 sentences unless the user explicitly asks for more depth.`;

const REC_CATEGORIES = ['therapy', 'behavior', 'communication', 'wellbeing', 'general'] as const;
type RecCategory = (typeof REC_CATEGORIES)[number];

export interface Recommendation {
  id: string;
  category: RecCategory;
  title: string;
  body: string;
}

export interface RecommendationsResult {
  childId: string;
  childName: string;
  generatedAt: string;
  source: 'openai' | 'mock';
  recommendations: Recommendation[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('OPENAI_API_KEY');
  }

  private get model(): string {
    return this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async chat(user: AuthUser, threadId: string, content: string) {
    await this.prisma.aiMessage.create({
      data: { userId: user.id, threadId, role: 'USER', content },
    });

    const history = await this.prisma.aiMessage.findMany({
      where: { userId: user.id, threadId },
      orderBy: { createdAt: 'asc' },
      take: 24,
    });

    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: (m.role.toLowerCase() as ChatMessage['role']),
        content: m.content,
      })),
    ];

    const reply = await this.completion(messages);

    await this.prisma.aiMessage.create({
      data: { userId: user.id, threadId, role: 'ASSISTANT', content: reply },
    });

    return { reply, threadId };
  }

  async summarizeSessionNotes(notes: string): Promise<string> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content:
          'Summarize the following therapy session notes for a parent in 3-4 plain-language bullet points: what went well, what was difficult, suggested next steps. Be specific and warm.',
      },
      { role: 'user', content: notes },
    ];
    return this.completion(messages);
  }

  async listThread(user: AuthUser, threadId: string) {
    return this.prisma.aiMessage.findMany({
      where: { userId: user.id, threadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Recommendations: gentle, data-informed suggestions for the parent ──
  async recommendationsForChild(
    user: AuthUser,
    childId: string,
  ): Promise<RecommendationsResult> {
    await this.access.assertCaregiver(user.id, user.role, childId);

    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [child, milestones, moods, sessions, behavior, goals] = await Promise.all([
      this.prisma.child.findUnique({
        where: { id: childId },
        select: {
          id: true,
          fullName: true,
          dateOfBirth: true,
          diagnoses: true,
          communicationType: true,
          sensoryTriggers: true,
          calmingStrategies: true,
          hobbies: true,
        },
      }),
      this.prisma.milestone.findMany({
        where: { childId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      this.prisma.moodEntry.findMany({
        where: { childId, loggedAt: { gte: since14 } },
        orderBy: { loggedAt: 'desc' },
      }),
      this.prisma.therapySession.findMany({
        where: { childId, scheduledAt: { gte: since30 } },
        orderBy: { scheduledAt: 'desc' },
        take: 6,
      }),
      this.prisma.behaviorEvent.findMany({
        where: { childId, occurredAt: { gte: since14 } },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.goal.findMany({
        where: { childId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
    ]);

    if (!child) {
      return {
        childId,
        childName: 'this child',
        generatedAt: new Date().toISOString(),
        source: 'mock',
        recommendations: [],
      };
    }

    const context = {
      child: {
        name: child.fullName,
        ageYears: yearsSince(child.dateOfBirth),
        diagnoses: child.diagnoses,
        communicationType: child.communicationType,
        sensoryTriggers: child.sensoryTriggers,
        calmingStrategies: child.calmingStrategies,
        hobbies: child.hobbies,
      },
      last14Days: {
        moodCounts: countBy(moods, (m) => m.mood),
        behaviorCounts: countBy(behavior, (b) => b.kind),
      },
      recentMilestones: milestones.slice(0, 5).map((m) => ({
        title: m.title,
        domain: m.domain,
        status: m.status,
        updatedAt: m.updatedAt.toISOString(),
      })),
      recentSessions: sessions.map((s) => ({
        type: s.type,
        status: s.status,
        scheduledAt: s.scheduledAt.toISOString(),
        hasNotes: !!s.notes,
      })),
      activeGoals: goals.map((g) => ({
        title: g.title,
        progress: g.progress,
      })),
    };

    const openai = await this.recommendationsViaOpenAi(context);
    const recs = openai ?? this.recommendationsMock(context);

    return {
      childId,
      childName: child.fullName,
      generatedAt: new Date().toISOString(),
      source: openai ? 'openai' : 'mock',
      recommendations: recs,
    };
  }

  private async recommendationsViaOpenAi(
    context: unknown,
  ): Promise<Recommendation[] | null> {
    if (!this.apiKey) return null;
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}

You will be given recent data for one child. Produce 3-5 short, gentle recommendations for the parent to try in the next 2 weeks. Ground each recommendation in the data (do not invent facts). Prefer small, doable next steps over broad advice. Avoid clinical claims.

Respond ONLY with a JSON object of the shape:
{ "recommendations": [ { "category": "therapy|behavior|communication|wellbeing|general", "title": "5-9 word title", "body": "2-3 warm plain-language sentences" } ] }

No prose outside the JSON.`,
      },
      {
        role: 'user',
        content: `Child data:\n${JSON.stringify(context, null, 2)}`,
      },
    ];
    try {
      const raw = await this.completion(messages, { jsonMode: true });
      const parsed = JSON.parse(raw) as { recommendations?: unknown };
      const list = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      const recs: Recommendation[] = [];
      for (const item of list) {
        const rec = normalizeRec(item);
        if (rec) recs.push(rec);
        if (recs.length >= 5) break;
      }
      return recs.length ? recs : null;
    } catch (err) {
      this.logger.warn(`OpenAI recommendations parse failed: ${(err as Error).message}`);
      return null;
    }
  }

  private recommendationsMock(context: {
    child: {
      name: string;
      ageYears: number;
      diagnoses: string[];
      communicationType?: string | null;
      calmingStrategies: string[];
      hobbies: string[];
    };
    last14Days: {
      moodCounts: Record<string, number>;
      behaviorCounts: Record<string, number>;
    };
    recentMilestones: { title: string; status: string; updatedAt: string }[];
    recentSessions: { type: string; status: string; hasNotes: boolean }[];
    activeGoals: { title: string; progress: number }[];
  }): Recommendation[] {
    const recs: Recommendation[] = [];
    const name = context.child.name.split(' ')[0] ?? 'your child';
    const moods = context.last14Days.moodCounts;
    const beh = context.last14Days.behaviorCounts;

    const toughMoods = (moods.TOUGH ?? 0) + (moods.HARD ?? 0);
    const goodMoods = (moods.GREAT ?? 0) + (moods.GOOD ?? 0);
    const meltdowns = beh.MELTDOWN ?? 0;
    const triggers = beh.TRIGGER ?? 0;
    const sleepIssues = beh.SLEEP ?? 0;

    if (meltdowns >= 2 || triggers >= 2) {
      const strategies =
        context.child.calmingStrategies.length > 0
          ? context.child.calmingStrategies.slice(0, 2).join(' and ')
          : 'a familiar comfort item and a quiet corner';
      recs.push({
        id: '',
        category: 'behavior',
        title: 'Map the pattern behind recent meltdowns',
        body: `You've logged ${meltdowns + triggers} triggering events in the last 14 days. Try a quick "before / during / after" note on the next one to spot what's building up — and pre-position ${strategies} where ${name} can reach it.`,
      });
    }

    if (sleepIssues >= 2) {
      recs.push({
        id: '',
        category: 'wellbeing',
        title: 'Anchor bedtime with a 3-step wind-down',
        body: `Sleep has come up ${sleepIssues} times recently. Pick three low-stimulation steps in the same order every night (bath → dim lights → one book). Predictability tends to help more than length.`,
      });
    }

    if (toughMoods >= 3 && toughMoods > goodMoods) {
      recs.push({
        id: '',
        category: 'wellbeing',
        title: 'Add one small joy to each day this week',
        body: `The last two weeks have leaned tough. Pair a hard part of the day with one thing ${name} loves — even 10 minutes of a favorite activity can reset the mood curve.`,
      });
    }

    const stalled = context.recentMilestones.find(
      (m) => m.status === 'IN_PROGRESS' && daysSince(m.updatedAt) >= 21,
    );
    if (stalled) {
      recs.push({
        id: '',
        category: 'therapy',
        title: `Revisit the "${stalled.title}" milestone`,
        body: `This milestone has been in-progress for a while. Bring it up at the next therapy session — sometimes a small tweak to the practice routine unblocks it faster than more repetition.`,
      });
    }

    const untypedSessions = context.recentSessions.filter(
      (s) => s.status === 'COMPLETED' && !s.hasNotes,
    );
    if (untypedSessions.length >= 2) {
      recs.push({
        id: '',
        category: 'therapy',
        title: 'Capture a one-line takeaway per session',
        body: `A couple of recent sessions don't have notes yet. Even one sentence — "what worked, what to try at home" — makes it much easier to spot patterns across weeks.`,
      });
    }

    const commType = context.child.communicationType;
    if (commType && /aac|pecs|non-?verbal/i.test(commType)) {
      recs.push({
        id: '',
        category: 'communication',
        title: 'Model AAC in one everyday routine',
        body: `Pick one predictable moment (mealtime or bath) and use ${name}'s AAC system yourself, out loud, for a week. Modelling — not testing — is usually the fastest way to grow vocabulary.`,
      });
    }

    if (context.activeGoals.length > 0) {
      const g = context.activeGoals[0];
      recs.push({
        id: '',
        category: 'general',
        title: `Nudge "${g.title}" forward this week`,
        body: `You're at ${g.progress}% on this goal. What's one 15-minute action you could take before Sunday? Small, timeboxed steps beat long open-ended ones.`,
      });
    }

    const evergreen: Recommendation[] = [
      {
        id: '',
        category: 'general',
        title: 'Log a mood or event today',
        body: `The more you log, the more patterns become visible. Even a 10-second daily mood check gives you and ${name}'s care team something concrete to work with.`,
      },
      {
        id: '',
        category: 'wellbeing',
        title: 'Take 10 minutes for yourself',
        body: `Caregiving takes a real toll. A short walk, a cup of chai in silence, a call to someone who gets it — pick one and put it in your calendar this week.`,
      },
      {
        id: '',
        category: 'therapy',
        title: 'Prep one question for the next appointment',
        body: `Write down the single thing you most want the therapist or doctor to weigh in on. It keeps short appointments focused and useful.`,
      },
      {
        id: '',
        category: 'general',
        title: `Try one hobby moment with ${name} this week`,
        body: `${
          context.child.hobbies[0]
            ? `${name} enjoys ${context.child.hobbies[0]} — 15 unhurried minutes of it, with no goal attached, is often the best co-regulation you can offer.`
            : `Pick one small thing you both enjoy and do it together for 15 minutes, phones down. Shared enjoyment builds the trust everything else rests on.`
        }`,
      },
    ];
    const seen = new Set(recs.map((r) => r.title));
    for (const item of evergreen) {
      if (recs.length >= 3) break;
      if (!seen.has(item.title)) {
        recs.push(item);
        seen.add(item.title);
      }
    }

    return recs.slice(0, 5).map((r) => ({ ...r, id: stableId(r.title + r.body) }));
  }

  private async completion(
    messages: ChatMessage[],
    opts: { jsonMode?: boolean } = {},
  ): Promise<string> {
    if (!this.apiKey) {
      return this.mockChatResponse(messages);
    }
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.5,
          max_tokens: 900,
          ...(opts.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`OpenAI error ${res.status}: ${text}`);
        return this.mockChatResponse(messages);
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content?.trim() ?? this.mockChatResponse(messages);
    } catch (err) {
      this.logger.warn(`OpenAI call failed: ${(err as Error).message}`);
      return this.mockChatResponse(messages);
    }
  }

  private mockChatResponse(messages: ChatMessage[]): string {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    const q = (last?.content ?? '').toLowerCase();

    if (q.includes('meltdown') || q.includes('tantrum')) {
      return [
        "Meltdowns are exhausting — for your child and for you. A few things that often help:",
        "• Stay close, keep your voice soft and slow, and reduce sensory input (dim lights, lower sounds).",
        "• Wait it out — don't try to reason during the peak. Offer water and a familiar comfort item afterward.",
        "• Once calm, gently revisit what happened using simple words or pictures.",
        "If meltdowns are happening daily or escalating, please raise this with your child's therapist — patterns matter and they can help identify triggers. (I'm AI guidance, not a replacement for clinical advice.)",
      ].join('\n');
    }

    if (q.includes('school') || q.includes('iep')) {
      return [
        "Working with your child's school can feel daunting. A few practical starting points:",
        "• Ask for a written copy of any accommodations already in place.",
        "• Request a meeting with the class teacher and special educator together — bring 2-3 specific concerns.",
        "• Under India's RPWD Act, inclusive accommodations are a right, not a favor — your tone can be calm and firm.",
        "Would you like a sample request letter you can adapt?",
      ].join('\n');
    }

    if (q.includes('aac') || q.includes('communication') || q.includes('non-verbal')) {
      return [
        "AAC (Augmentative and Alternative Communication) can be life-changing. A simple progression often used by Indian SLPs:",
        "1. Start with picture cards (PECS) for high-motivation items — favorite snack, toy, outdoor.",
        "2. Move to a low-tech communication board with 6-12 symbols once your child uses cards reliably.",
        "3. Then introduce a tablet-based AAC app (Avaz, Proloquo2Go) with your therapist's input.",
        "Modeling matters more than testing — use the system yourself, often, without expecting a response.",
      ].join('\n');
    }

    return [
      "Thanks for sharing that. I want to make sure I give you something useful — could you tell me a bit more?",
      "• Your child's age and a few words about their profile (diagnosis, communication style)",
      "• What's been happening, and what you've already tried",
      "I'm AI guidance, not a clinician — for medical or therapy decisions, please loop in your child's professional team.",
    ].join('\n');
  }
}

function yearsSince(d: Date): number {
  const ms = Date.now() - d.getTime();
  return Math.max(0, Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000)));
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const it of items) {
    const k = key(it);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function stableId(seed: string): string {
  return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 10);
}

function normalizeRec(raw: unknown): Recommendation | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === 'string' ? r.title.trim() : '';
  const body = typeof r.body === 'string' ? r.body.trim() : '';
  const catRaw = typeof r.category === 'string' ? r.category.toLowerCase() : '';
  if (!title || !body) return null;
  const category = (REC_CATEGORIES as readonly string[]).includes(catRaw)
    ? (catRaw as RecCategory)
    : 'general';
  return { id: stableId(title + body), category, title, body };
}
