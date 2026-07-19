import {
  BadRequestException,
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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
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
  ValidateNested,
} from 'class-validator';
import {
  IepStatus,
  MilestoneDomain,
  MilestoneStatus,
  Role,
  TherapyType,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';

// ─── DTOs ─────────────────────────────────────────────────

class IepServiceDto {
  @ApiProperty({ enum: TherapyType })
  @IsEnum(TherapyType)
  type!: TherapyType;

  @ApiProperty({ example: '2x/week, 30 min' })
  @IsString()
  @MaxLength(200)
  frequency!: string;

  @ApiProperty({ example: 'Ms. Ananya Rao' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  provider?: string;

  @ApiProperty({ example: 'Resource room' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  setting?: string;
}

class IepGoalInputDto {
  @IsEnum(MilestoneDomain)
  domain!: MilestoneDomain;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  measurableCriteria?: string;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;
}

export class CreateIepDto {
  @IsString()
  @MaxLength(20)
  schoolYear!: string;

  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsEnum(IepStatus) status?: IepStatus;
  @IsOptional() @IsDateString() effectiveFrom?: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
  @IsOptional() @IsString() @MaxLength(5000) presentLevels?: string;
  @IsOptional() @IsString() @MaxLength(2000) strengths?: string;
  @IsOptional() @IsString() @MaxLength(2000) concerns?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  accommodations?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => IepServiceDto)
  services?: IepServiceDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => IepGoalInputDto)
  goals?: IepGoalInputDto[];
}

export class UpdateIepDto {
  @IsOptional() @IsString() @MaxLength(20) schoolYear?: string;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsEnum(IepStatus) status?: IepStatus;
  @IsOptional() @IsDateString() effectiveFrom?: string;
  @IsOptional() @IsDateString() effectiveTo?: string;
  @IsOptional() @IsString() @MaxLength(5000) presentLevels?: string;
  @IsOptional() @IsString() @MaxLength(2000) strengths?: string;
  @IsOptional() @IsString() @MaxLength(2000) concerns?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  accommodations?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => IepServiceDto)
  services?: IepServiceDto[];
}

export class CreateGoalDto extends IepGoalInputDto {}

export class UpdateGoalDto {
  @IsOptional() @IsEnum(MilestoneDomain) domain?: MilestoneDomain;
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(500) measurableCriteria?: string;
  @IsOptional() @IsDateString() targetDate?: string;
  @IsOptional() @IsEnum(MilestoneStatus) status?: MilestoneStatus;
  @IsOptional() @IsInt() @Min(0) @Max(100) progress?: number;
}

export class CreateReviewDto {
  @IsDateString() reviewDate!: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  participants?: string[];
}

export class ApproveIepDto {
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class CarryoverDto {
  @IsString() sourceIepId!: string;

  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  goalIds!: string[];
}

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class IepService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  async list(user: AuthUser, childId: string) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.iep.findMany({
      where: { childId },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        schoolYear: true,
        title: true,
        status: true,
        effectiveFrom: true,
        effectiveTo: true,
        updatedAt: true,
        _count: { select: { goals: true, reviews: true } },
      },
    });
  }

  async get(user: AuthUser, id: string) {
    const iep = await this.prisma.iep.findUnique({
      where: { id },
      include: {
        goals: { orderBy: { createdAt: 'asc' } },
        reviews: { orderBy: { reviewDate: 'desc' } },
        approvals: {
          include: {
            user: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
          },
          orderBy: { signedAt: 'asc' },
        },
      },
    });
    if (!iep) throw new NotFoundException('IEP not found');
    await this.access.assertCaregiver(user.id, user.role, iep.childId);
    return iep;
  }

  async create(user: AuthUser, childId: string, dto: CreateIepDto) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    const uploader = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { fullName: true },
    });
    return this.prisma.iep.create({
      data: {
        childId,
        schoolYear: dto.schoolYear,
        title: dto.title,
        status: dto.status ?? 'DRAFT',
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        presentLevels: dto.presentLevels,
        strengths: dto.strengths,
        concerns: dto.concerns,
        accommodations: dto.accommodations ?? [],
        services: (dto.services ?? []) as unknown as object[],
        createdById: user.id,
        createdByName: uploader?.fullName ?? user.email,
        goals: dto.goals?.length
          ? {
              create: dto.goals.map((g) => ({
                domain: g.domain,
                title: g.title,
                description: g.description,
                measurableCriteria: g.measurableCriteria,
                targetDate: g.targetDate ? new Date(g.targetDate) : undefined,
                status: g.status ?? 'NOT_STARTED',
                progress: g.progress ?? 0,
              })),
            }
          : undefined,
      },
      include: {
        goals: { orderBy: { createdAt: 'asc' } },
        reviews: { orderBy: { reviewDate: 'desc' } },
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateIepDto) {
    const existing = await this.prisma.iep.findUnique({ where: { id }, select: { childId: true } });
    if (!existing) throw new NotFoundException('IEP not found');
    await this.access.assertCaregiver(user.id, user.role, existing.childId);
    return this.prisma.iep.update({
      where: { id },
      data: {
        schoolYear: dto.schoolYear,
        title: dto.title,
        status: dto.status,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
        presentLevels: dto.presentLevels,
        strengths: dto.strengths,
        concerns: dto.concerns,
        accommodations: dto.accommodations,
        services: dto.services ? (dto.services as unknown as object[]) : undefined,
      },
      include: {
        goals: { orderBy: { createdAt: 'asc' } },
        reviews: { orderBy: { reviewDate: 'desc' } },
      },
    });
  }

  async remove(user: AuthUser, id: string) {
    const existing = await this.prisma.iep.findUnique({ where: { id }, select: { childId: true } });
    if (!existing) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, existing.childId);
    await this.prisma.iep.delete({ where: { id } });
    return { ok: true };
  }

  // ── Goals ──
  async addGoal(user: AuthUser, iepId: string, dto: CreateGoalDto) {
    const iep = await this.prisma.iep.findUnique({ where: { id: iepId }, select: { childId: true } });
    if (!iep) throw new NotFoundException('IEP not found');
    await this.access.assertCaregiver(user.id, user.role, iep.childId);
    return this.prisma.iepGoal.create({
      data: {
        iepId,
        domain: dto.domain,
        title: dto.title,
        description: dto.description,
        measurableCriteria: dto.measurableCriteria,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
        status: dto.status ?? 'NOT_STARTED',
        progress: dto.progress ?? 0,
      },
    });
  }

  async updateGoal(user: AuthUser, goalId: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.iepGoal.findUnique({
      where: { id: goalId },
      select: { iep: { select: { childId: true } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    await this.access.assertCaregiver(user.id, user.role, goal.iep.childId);
    return this.prisma.iepGoal.update({
      where: { id: goalId },
      data: {
        ...dto,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : undefined,
      },
    });
  }

  async removeGoal(user: AuthUser, goalId: string) {
    const goal = await this.prisma.iepGoal.findUnique({
      where: { id: goalId },
      select: { iep: { select: { childId: true } } },
    });
    if (!goal) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, goal.iep.childId);
    await this.prisma.iepGoal.delete({ where: { id: goalId } });
    return { ok: true };
  }

  // ── Reviews ──
  async addReview(user: AuthUser, iepId: string, dto: CreateReviewDto) {
    const iep = await this.prisma.iep.findUnique({ where: { id: iepId }, select: { childId: true } });
    if (!iep) throw new NotFoundException('IEP not found');
    await this.access.assertCaregiver(user.id, user.role, iep.childId);
    if (!dto.reviewDate) throw new BadRequestException('reviewDate required');
    return this.prisma.iepReview.create({
      data: {
        iepId,
        reviewDate: new Date(dto.reviewDate),
        notes: dto.notes,
        participants: dto.participants ?? [],
      },
    });
  }

  async removeReview(user: AuthUser, reviewId: string) {
    const rev = await this.prisma.iepReview.findUnique({
      where: { id: reviewId },
      select: { iep: { select: { childId: true } } },
    });
    if (!rev) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, rev.iep.childId);
    await this.prisma.iepReview.delete({ where: { id: reviewId } });
    return { ok: true };
  }

  // ── Approval workflow ──
  // State machine:
  //   DRAFT           →  submit → PENDING_REVIEW
  //   PENDING_REVIEW  →  retract → DRAFT
  //   PENDING_REVIEW  →  every-required-signer-approves → ACTIVE (automatic)
  //   ACTIVE / any    →  archive → ARCHIVED
  //
  // "Required signers" for MVP: at least one CAREGIVER (parent/guardian) AND
  // at least one PROFESSIONAL (THERAPIST/SPECIAL_EDUCATOR/DOCTOR/SCHOOL_ADMIN).
  // That's what a real IEP meeting produces — a family sign-off plus a
  // professional sign-off.

  private readonly PROFESSIONAL_ROLES: Role[] = [
    'THERAPIST',
    'SPECIAL_EDUCATOR',
    'DOCTOR',
    'SCHOOL_ADMIN',
  ];

  async submitForReview(user: AuthUser, id: string) {
    const iep = await this.prisma.iep.findUnique({
      where: { id },
      select: { childId: true, status: true },
    });
    if (!iep) throw new NotFoundException('IEP not found');
    await this.access.assertCaregiver(user.id, user.role, iep.childId);
    if (iep.status !== 'DRAFT') {
      throw new BadRequestException(
        `Only DRAFT IEPs can be submitted for review (this one is ${iep.status}).`,
      );
    }
    return this.prisma.iep.update({
      where: { id },
      data: { status: 'PENDING_REVIEW' },
      include: { approvals: true },
    });
  }

  async retractReview(user: AuthUser, id: string) {
    const iep = await this.prisma.iep.findUnique({
      where: { id },
      select: { childId: true, status: true },
    });
    if (!iep) throw new NotFoundException('IEP not found');
    await this.access.assertCaregiver(user.id, user.role, iep.childId);
    if (iep.status !== 'PENDING_REVIEW') {
      throw new BadRequestException(
        `Only PENDING_REVIEW IEPs can be retracted (this one is ${iep.status}).`,
      );
    }
    // Retracting wipes all pending approvals — the document may change
    // materially before the next submit, so prior signatures shouldn't
    // silently apply to a new revision.
    await this.prisma.$transaction([
      this.prisma.iepApproval.deleteMany({ where: { iepId: id } }),
      this.prisma.iep.update({ where: { id }, data: { status: 'DRAFT' } }),
    ]);
    return { ok: true };
  }

  async approve(user: AuthUser, id: string, dto: ApproveIepDto) {
    const iep = await this.prisma.iep.findUnique({
      where: { id },
      select: { childId: true, status: true },
    });
    if (!iep) throw new NotFoundException('IEP not found');
    await this.access.assertCaregiver(user.id, user.role, iep.childId);
    if (iep.status !== 'PENDING_REVIEW' && iep.status !== 'DRAFT') {
      throw new BadRequestException(
        `IEP must be DRAFT or PENDING_REVIEW to collect approvals (this one is ${iep.status}).`,
      );
    }
    // Upsert this user's approval — a second sign call updates the note.
    await this.prisma.iepApproval.upsert({
      where: { iepId_userId: { iepId: id, userId: user.id } },
      create: { iepId: id, userId: user.id, role: user.role, note: dto.note },
      update: { note: dto.note, signedAt: new Date() },
    });
    // Auto-transition to ACTIVE once the required signer set is complete.
    if (iep.status === 'PENDING_REVIEW') {
      await this.maybeActivate(id);
    }
    return this.get(user, id);
  }

  async revokeApproval(user: AuthUser, id: string) {
    const iep = await this.prisma.iep.findUnique({
      where: { id },
      select: { childId: true },
    });
    if (!iep) throw new NotFoundException('IEP not found');
    await this.access.assertCaregiver(user.id, user.role, iep.childId);
    await this.prisma.iepApproval.deleteMany({
      where: { iepId: id, userId: user.id },
    });
    return { ok: true };
  }

  private async maybeActivate(iepId: string) {
    const approvals = await this.prisma.iepApproval.findMany({
      where: { iepId },
      select: { role: true },
    });
    const hasCaregiver = approvals.some((a) => a.role === 'PARENT');
    const hasProfessional = approvals.some((a) =>
      this.PROFESSIONAL_ROLES.includes(a.role),
    );
    if (hasCaregiver && hasProfessional) {
      await this.prisma.iep.update({
        where: { id: iepId },
        data: { status: 'ACTIVE', effectiveFrom: new Date() },
      });
    }
  }

  // ── Cross-year goal carryover ──
  async carryOverGoals(user: AuthUser, targetIepId: string, dto: CarryoverDto) {
    const target = await this.prisma.iep.findUnique({
      where: { id: targetIepId },
      select: { id: true, childId: true },
    });
    if (!target) throw new NotFoundException('Target IEP not found');
    await this.access.assertCaregiver(user.id, user.role, target.childId);

    const source = await this.prisma.iep.findUnique({
      where: { id: dto.sourceIepId },
      select: { id: true, childId: true, schoolYear: true },
    });
    if (!source) throw new NotFoundException('Source IEP not found');
    if (source.childId !== target.childId) {
      throw new BadRequestException(
        "Source IEP belongs to a different child — can't carry goals across children.",
      );
    }
    if (source.id === target.id) {
      throw new BadRequestException(
        "Source and target IEP are the same — nothing to carry over.",
      );
    }
    const sourceGoals = await this.prisma.iepGoal.findMany({
      where: { id: { in: dto.goalIds }, iepId: source.id },
    });
    if (sourceGoals.length === 0) return { created: 0 };

    // Carry each: reset status/progress, keep title/description/criteria,
    // stamp carriedOverFromId for lineage.
    await this.prisma.$transaction(
      sourceGoals.map((g) =>
        this.prisma.iepGoal.create({
          data: {
            iepId: target.id,
            domain: g.domain,
            title: g.title,
            description: g.description,
            measurableCriteria: g.measurableCriteria,
            targetDate: null, // parent should pick a new target date
            status: 'NOT_STARTED',
            progress: 0,
            carriedOverFromId: g.id,
          },
        }),
      ),
    );
    return { created: sourceGoals.length, sourceYear: source.schoolYear };
  }

  // ── Sessions that tagged this goal ──
  async sessionsForGoal(user: AuthUser, goalId: string) {
    const goal = await this.prisma.iepGoal.findUnique({
      where: { id: goalId },
      select: { iep: { select: { childId: true } } },
    });
    if (!goal) throw new NotFoundException('Goal not found');
    await this.access.assertCaregiver(user.id, user.role, goal.iep.childId);
    return this.prisma.therapySession.findMany({
      where: { iepGoalIds: { has: goalId } },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
      include: { therapist: { select: { id: true, fullName: true } } },
    });
  }
}

// ─── Controller ───────────────────────────────────────────
@ApiTags('iep')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class IepController {
  constructor(private readonly svc: IepService) {}

  @Get('children/:childId/ieps')
  list(@CurrentUser() user: AuthUser, @Param('childId') childId: string) {
    return this.svc.list(user, childId);
  }

  @Post('children/:childId/ieps')
  create(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Body() dto: CreateIepDto,
  ) {
    return this.svc.create(user, childId, dto);
  }

  @Get('ieps/:id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.get(user, id);
  }

  @Patch('ieps/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateIepDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete('ieps/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }

  @Post('ieps/:id/goals')
  addGoal(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateGoalDto,
  ) {
    return this.svc.addGoal(user, id, dto);
  }

  @Patch('iep-goals/:goalId')
  updateGoal(
    @CurrentUser() user: AuthUser,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.svc.updateGoal(user, goalId, dto);
  }

  @Delete('iep-goals/:goalId')
  removeGoal(@CurrentUser() user: AuthUser, @Param('goalId') goalId: string) {
    return this.svc.removeGoal(user, goalId);
  }

  @Post('ieps/:id/reviews')
  addReview(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.svc.addReview(user, id, dto);
  }

  @Delete('iep-reviews/:reviewId')
  removeReview(
    @CurrentUser() user: AuthUser,
    @Param('reviewId') reviewId: string,
  ) {
    return this.svc.removeReview(user, reviewId);
  }

  // Workflow: DRAFT → PENDING_REVIEW.
  @Post('ieps/:id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.submitForReview(user, id);
  }

  // Workflow: PENDING_REVIEW → DRAFT (also clears approvals).
  @Post('ieps/:id/retract')
  retract(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.retractReview(user, id);
  }

  // Signs (or re-signs with a new note). Once required signers all sign, the
  // IEP auto-transitions PENDING_REVIEW → ACTIVE.
  @Post('ieps/:id/approve')
  approve(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ApproveIepDto,
  ) {
    return this.svc.approve(user, id, dto);
  }

  // Un-signs — the caller's approval row is deleted.
  @Delete('ieps/:id/approve')
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.revokeApproval(user, id);
  }

  // Copies selected goals from a prior IEP into this one (reset progress).
  @Post('ieps/:id/carryover')
  carryover(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: CarryoverDto,
  ) {
    return this.svc.carryOverGoals(user, id, dto);
  }

  // All therapy sessions that have tagged this goal — for the "recent
  // sessions on this goal" panel in the IEP UI.
  @Get('iep-goals/:goalId/sessions')
  goalSessions(
    @CurrentUser() user: AuthUser,
    @Param('goalId') goalId: string,
  ) {
    return this.svc.sessionsForGoal(user, goalId);
  }
}

// ─── Module ───────────────────────────────────────────────
@Module({
  controllers: [IepController],
  providers: [IepService, ChildAccess],
})
export class IepModule {}
