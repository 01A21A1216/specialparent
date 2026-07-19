import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { SessionStatus, TherapyType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { AiModule } from '../ai/ai.module';

// ─── DTOs ─────────────────────────────────────────────────
export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty({ enum: TherapyType })
  @IsEnum(TherapyType)
  type!: TherapyType;

  @ApiProperty({ example: '2026-05-10T10:00:00Z' })
  @IsDateString()
  scheduledAt!: string;

  @ApiProperty({ required: false, default: 45 })
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(240)
  durationMins?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  therapistId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, type: [String], description: 'IEP goal ids this session worked on' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  iepGoalIds?: string[];
}

export class UpdateSessionDto {
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsInt() @Min(15) @Max(240) durationMins?: number;
  @IsOptional() @IsEnum(SessionStatus) status?: SessionStatus;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
  @IsOptional() @IsString() therapistId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  iepGoalIds?: string[];
}

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class TherapyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
    private readonly ai: AiService,
  ) {}

  async create(user: AuthUser, dto: CreateSessionDto) {
    await this.access.assertCaregiver(user.id, user.role, dto.childId);
    return this.prisma.therapySession.create({
      data: {
        childId: dto.childId,
        therapistId: dto.therapistId,
        type: dto.type,
        scheduledAt: new Date(dto.scheduledAt),
        durationMins: dto.durationMins ?? 45,
        notes: dto.notes,
        iepGoalIds: dto.iepGoalIds ?? [],
      },
    });
  }

  async list(user: AuthUser, childId: string) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.therapySession.findMany({
      where: { childId },
      orderBy: { scheduledAt: 'desc' },
      include: { therapist: { select: { id: true, fullName: true } } },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateSessionDto) {
    const session = await this.prisma.therapySession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    await this.access.assertCaregiver(user.id, user.role, session.childId);

    let aiSummary: string | undefined;
    // when notes are added/changed and session is being marked complete, generate summary
    if (dto.notes && dto.notes !== session.notes) {
      aiSummary = await this.ai.summarizeSessionNotes(dto.notes);
    }

    return this.prisma.therapySession.update({
      where: { id },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        ...(aiSummary ? { aiSummary } : {}),
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const s = await this.prisma.therapySession.findUnique({ where: { id } });
    if (!s) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, s.childId);
    await this.prisma.therapySession.delete({ where: { id } });
    return { ok: true };
  }

  async upcomingForUser(user: AuthUser) {
    if (user.role === 'THERAPIST') {
      return this.prisma.therapySession.findMany({
        where: {
          therapistId: user.id,
          scheduledAt: { gte: new Date() },
          status: 'SCHEDULED',
        },
        orderBy: { scheduledAt: 'asc' },
        take: 20,
        include: { child: { select: { id: true, fullName: true } } },
      });
    }
    return this.prisma.therapySession.findMany({
      where: {
        child: { caregivers: { some: { userId: user.id } } },
        scheduledAt: { gte: new Date() },
        status: 'SCHEDULED',
      },
      orderBy: { scheduledAt: 'asc' },
      take: 20,
      include: {
        child: { select: { id: true, fullName: true } },
        therapist: { select: { id: true, fullName: true } },
      },
    });
  }
}

// ─── Controller ───────────────────────────────────────────
@ApiTags('therapy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('therapy')
export class TherapyController {
  constructor(private readonly svc: TherapyService) {}

  @Post('sessions')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateSessionDto) {
    return this.svc.create(user, dto);
  }

  @Get('sessions')
  list(@CurrentUser() user: AuthUser, @Query('childId') childId: string) {
    return this.svc.list(user, childId);
  }

  @Get('upcoming')
  upcoming(@CurrentUser() user: AuthUser) {
    return this.svc.upcomingForUser(user);
  }

  @Patch('sessions/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSessionDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete('sessions/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

// ─── Module ───────────────────────────────────────────────
@Module({
  imports: [AiModule],
  controllers: [TherapyController],
  providers: [TherapyService, ChildAccess],
})
export class TherapyModule {}
