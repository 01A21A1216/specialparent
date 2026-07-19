import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

// 1:1 direct messaging between two platform users, optionally scoped to a
// specific Child. Access rule: only the two participants of a thread can
// read or write it — enforced on every endpoint.

export class StartThreadDto {
  @ApiProperty()
  @IsString()
  toUserId!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  childId?: string;

  // Body is optional so a UI can open a thread from a care-team button before
  // the user has typed anything. Sending an empty thread creates the row but
  // no message.
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body?: string;
}

export class SendMessageDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * All threads the user is a participant in. Includes the other participant,
   * an unread count, and a last-message preview so the frontend can render a
   * list without a second round-trip.
   */
  async listThreads(user: AuthUser) {
    const threads = await this.prisma.messageThread.findMany({
      where: {
        OR: [{ participantAId: user.id }, { participantBId: user.id }],
      },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        participantA: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        participantB: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        child: { select: { id: true, fullName: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, body: true, createdAt: true, senderId: true },
        },
        _count: {
          select: {
            messages: {
              where: { readAt: null, NOT: { senderId: user.id } },
            },
          },
        },
      },
    });

    return threads.map((t) => {
      const other = t.participantAId === user.id ? t.participantB : t.participantA;
      return {
        id: t.id,
        other,
        child: t.child,
        lastMessage: t.messages[0] ?? null,
        unreadCount: t._count.messages,
        lastMessageAt: t.lastMessageAt.toISOString(),
      };
    });
  }

  /**
   * Messages in a thread. Cursor-paginated backwards from newest — `before`
   * is a message id; the response includes `nextCursor` for the next page
   * (the id to pass as `before` when the user scrolls further back). This
   * scales O(1) regardless of thread depth.
   */
  async getThread(
    user: AuthUser,
    threadId: string,
    opts: { before?: string; limit?: number } = {},
  ) {
    const thread = await this.assertMember(user.id, threadId);
    const limit = Math.min(Math.max(opts.limit ?? PAGE_SIZE, 1), MAX_PAGE_SIZE);

    // Newest → oldest slice, then reverse for the caller so they receive
    // messages in chronological order (matches how a chat UI renders).
    const desc = await this.prisma.message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // one extra to know if there's another page
      ...(opts.before ? { cursor: { id: opts.before }, skip: 1 } : {}),
    });
    const hasMore = desc.length > limit;
    const page = hasMore ? desc.slice(0, limit) : desc;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    // Mark every unread message the user DIDN'T send as read now.
    await this.prisma.message.updateMany({
      where: { threadId, readAt: null, NOT: { senderId: user.id } },
      data: { readAt: new Date() },
    });

    const other =
      thread.participantAId === user.id ? thread.participantB : thread.participantA;
    return {
      id: thread.id,
      other,
      child: thread.child,
      messages: page.reverse(),
      nextCursor,
    };
  }

  async startThread(user: AuthUser, dto: StartThreadDto) {
    if (dto.toUserId === user.id) {
      throw new BadRequestException("You can't message yourself.");
    }
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
      select: { id: true, isActive: true },
    });
    if (!recipient || !recipient.isActive) {
      throw new NotFoundException('Recipient not found');
    }

    // Order the pair lexicographically so the unique index catches duplicates.
    const [a, b] = [user.id, dto.toUserId].sort();
    const childId = dto.childId ?? null;

    // Can't upsert on a compound unique that includes a nullable field —
    // Prisma's generated types disallow null there. Manual find + create /
    // update instead. Runtime-safe because the (A, B, childId) index still
    // enforces uniqueness at the DB layer.
    const existing = await this.prisma.messageThread.findFirst({
      where: { participantAId: a, participantBId: b, childId },
    });
    const thread = existing
      ? await this.prisma.messageThread.update({
          where: { id: existing.id },
          data: { lastMessageAt: new Date() },
        })
      : await this.prisma.messageThread.create({
          data: {
            participantAId: a,
            participantBId: b,
            childId,
          },
        });

    if (dto.body && dto.body.trim()) {
      await this.prisma.message.create({
        data: { threadId: thread.id, senderId: user.id, body: dto.body.trim() },
      });
      await this.prisma.messageThread.update({
        where: { id: thread.id },
        data: { lastMessageAt: new Date() },
      });
    }
    return { threadId: thread.id };
  }

  async sendMessage(user: AuthUser, threadId: string, dto: SendMessageDto) {
    await this.assertMember(user.id, threadId);
    const msg = await this.prisma.message.create({
      data: { threadId, senderId: user.id, body: dto.body },
    });
    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { lastMessageAt: new Date() },
    });
    return msg;
  }

  async unreadCount(user: AuthUser) {
    const count = await this.prisma.message.count({
      where: {
        readAt: null,
        NOT: { senderId: user.id },
        thread: {
          OR: [{ participantAId: user.id }, { participantBId: user.id }],
        },
      },
    });
    return { count };
  }

  private async assertMember(userId: string, threadId: string) {
    const thread = await this.prisma.messageThread.findUnique({
      where: { id: threadId },
      include: {
        participantA: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        participantB: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        child: { select: { id: true, fullName: true } },
      },
    });
    if (!thread) throw new NotFoundException('Thread not found');
    if (thread.participantAId !== userId && thread.participantBId !== userId) {
      throw new ForbiddenException('You are not a participant in this thread.');
    }
    return thread;
  }
}

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(private readonly svc: MessagesService) {}

  @Get('threads')
  listThreads(@CurrentUser() user: AuthUser) {
    return this.svc.listThreads(user);
  }

  @Get('unread-count')
  unread(@CurrentUser() user: AuthUser) {
    return this.svc.unreadCount(user);
  }

  @Post('threads')
  startThread(@CurrentUser() user: AuthUser, @Body() dto: StartThreadDto) {
    return this.svc.startThread(user, dto);
  }

  @Get('threads/:id')
  getThread(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Query('before') before?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.getThread(user, id, {
      before,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post('threads/:id/messages')
  send(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.svc.sendMessage(user, id, dto);
  }
}

@Module({
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
