import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../common/current-user.decorator';

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

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('OPENAI_API_KEY');
  }

  private get model(): string {
    return this.config.get<string>('OPENAI_MODEL') ?? 'gpt-4o-mini';
  }

  async chat(user: AuthUser, threadId: string, content: string) {
    // Persist user message
    await this.prisma.aiMessage.create({
      data: { userId: user.id, threadId, role: 'USER', content },
    });

    // Pull recent context (last 12 messages from this thread)
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

  // ── completion: OpenAI if configured, else local mock ──
  private async completion(messages: ChatMessage[]): Promise<string> {
    if (!this.apiKey) {
      return this.mockResponse(messages);
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
          max_tokens: 600,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.warn(`OpenAI error ${res.status}: ${text}`);
        return this.mockResponse(messages);
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content?.trim() ?? this.mockResponse(messages);
    } catch (err) {
      this.logger.warn(`OpenAI call failed: ${(err as Error).message}`);
      return this.mockResponse(messages);
    }
  }

  private mockResponse(messages: ChatMessage[]): string {
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
