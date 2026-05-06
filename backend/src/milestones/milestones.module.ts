import {
  Body,
  Controller,
  Delete,
  Get,
  Module,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Injectable,
} from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { MilestoneDomain, MilestoneStatus } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';

// ─── DTOs ─────────────────────────────────────────────────
export class CreateMilestoneDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty({ enum: MilestoneDomain })
  @IsEnum(MilestoneDomain)
  domain!: MilestoneDomain;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: MilestoneStatus, required: false })
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;
}

export class UpdateMilestoneDto {
  @IsOptional() @IsString() @MaxLength(200) title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(MilestoneStatus) status?: MilestoneStatus;
  @IsOptional() @IsEnum(MilestoneDomain) domain?: MilestoneDomain;
}

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  async create(user: AuthUser, dto: CreateMilestoneDto) {
    await this.access.assertCaregiver(user.id, user.role, dto.childId);
    return this.prisma.milestone.create({
      data: {
        childId: dto.childId,
        domain: dto.domain,
        title: dto.title,
        description: dto.description,
        status: dto.status ?? 'NOT_STARTED',
      },
    });
  }

  async list(user: AuthUser, childId: string, domain?: MilestoneDomain) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.milestone.findMany({
      where: { childId, ...(domain ? { domain } : {}) },
      orderBy: [{ domain: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateMilestoneDto) {
    const m = await this.prisma.milestone.findUnique({ where: { id } });
    if (!m) throw new Error('Milestone not found');
    await this.access.assertCaregiver(user.id, user.role, m.childId);
    const achievedAt =
      dto.status === 'ACHIEVED' && m.status !== 'ACHIEVED' ? new Date() : undefined;
    return this.prisma.milestone.update({
      where: { id },
      data: { ...dto, ...(achievedAt ? { achievedAt } : {}) },
    });
  }

  async remove(user: AuthUser, id: string) {
    const m = await this.prisma.milestone.findUnique({ where: { id } });
    if (!m) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, m.childId);
    await this.prisma.milestone.delete({ where: { id } });
    return { ok: true };
  }
}

// ─── Controller ───────────────────────────────────────────
@ApiTags('milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('milestones')
export class MilestonesController {
  constructor(private readonly svc: MilestonesService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateMilestoneDto) {
    return this.svc.create(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('childId') childId: string,
    @Query('domain') domain?: MilestoneDomain,
  ) {
    return this.svc.list(user, childId, domain);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

// ─── Module ───────────────────────────────────────────────
@Module({
  controllers: [MilestonesController],
  providers: [MilestonesService, ChildAccess],
})
export class MilestonesModule {}
