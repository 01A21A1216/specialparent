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
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { RoutineCategory } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { ChildAccess } from '../common/child-access';
import { PrismaService } from '../prisma/prisma.service';
import { ROUTINE_PRESETS, RoutinePresetKey } from './routine.presets';

// A visual daily schedule for one child. Steps are stored per-child, each
// tagged with a time-of-day + category + emoji icon so the frontend can
// render calm card UI + a "current step" highlight based on wall-clock.

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// ─── DTOs ─────────────────────────────────────────────────
export class CreateStepDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: '🪥' })
  @IsString()
  @MaxLength(8)
  icon!: string;

  @ApiProperty({ enum: RoutineCategory })
  @IsEnum(RoutineCategory)
  category!: RoutineCategory;

  @ApiProperty({ example: '06:15' })
  @IsString()
  @Matches(TIME_RE, { message: 'timeOfDay must be HH:MM in 24-hour format' })
  timeOfDay!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(600)
  durationMins?: number;

  @ApiProperty({ required: false, type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateStepDto {
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(8) icon?: string;
  @IsOptional() @IsEnum(RoutineCategory) category?: RoutineCategory;
  @IsOptional()
  @IsString()
  @Matches(TIME_RE, { message: 'timeOfDay must be HH:MM in 24-hour format' })
  timeOfDay?: string;
  @IsOptional() @IsInt() @Min(1) @Max(600) durationMins?: number;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];
  @IsOptional() @IsBoolean() active?: boolean;
}

export class LoadPresetDto {
  @ApiProperty({
    enum: Object.keys(ROUTINE_PRESETS),
    description: 'Which starter template to seed',
  })
  @IsString()
  preset!: RoutinePresetKey;

  @ApiProperty({
    required: false,
    default: false,
    description: 'If true, DELETE all existing steps first. If false, append to what\'s already there.',
  })
  @IsOptional()
  @IsBoolean()
  replace?: boolean;
}

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class RoutineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ChildAccess,
  ) {}

  async list(user: AuthUser, childId: string) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.routineStep.findMany({
      where: { childId },
      orderBy: [{ active: 'desc' }, { timeOfDay: 'asc' }],
    });
  }

  async create(user: AuthUser, childId: string, dto: CreateStepDto) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    return this.prisma.routineStep.create({
      data: {
        childId,
        title: dto.title,
        description: dto.description,
        icon: dto.icon,
        category: dto.category,
        timeOfDay: dto.timeOfDay,
        durationMins: dto.durationMins,
        daysOfWeek: dto.daysOfWeek ?? [],
        active: dto.active ?? true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateStepDto) {
    const step = await this.prisma.routineStep.findUnique({
      where: { id },
      select: { childId: true },
    });
    if (!step) throw new NotFoundException('Step not found');
    await this.access.assertCaregiver(user.id, user.role, step.childId);
    return this.prisma.routineStep.update({ where: { id }, data: dto });
  }

  async remove(user: AuthUser, id: string) {
    const step = await this.prisma.routineStep.findUnique({
      where: { id },
      select: { childId: true },
    });
    if (!step) return { ok: true };
    await this.access.assertCaregiver(user.id, user.role, step.childId);
    await this.prisma.routineStep.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Load a curated starter template (school-day, weekend, therapy-day,
   * toddler-basics) so parents don't face a blank slate. Steps are created
   * atomically; when `replace=true` every existing step is deleted first.
   */
  async loadPreset(user: AuthUser, childId: string, dto: LoadPresetDto) {
    await this.access.assertCaregiver(user.id, user.role, childId);
    const preset = ROUTINE_PRESETS[dto.preset];
    if (!preset) throw new BadRequestException('Unknown preset');

    const ops: unknown[] = [];
    if (dto.replace) {
      ops.push(this.prisma.routineStep.deleteMany({ where: { childId } }));
    }
    for (const s of preset.steps) {
      ops.push(
        this.prisma.routineStep.create({
          data: {
            childId,
            title: s.title,
            description: s.description,
            icon: s.icon,
            category: s.category,
            timeOfDay: s.timeOfDay,
            durationMins: s.durationMins,
            daysOfWeek: s.daysOfWeek ?? [],
            active: true,
          },
        }),
      );
    }
    await this.prisma.$transaction(ops as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    return { created: preset.steps.length, preset: dto.preset };
  }
}

// ─── Controller ───────────────────────────────────────────
@ApiTags('routine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class RoutineController {
  constructor(private readonly svc: RoutineService) {}

  @Get('children/:childId/routine')
  list(@CurrentUser() user: AuthUser, @Param('childId') childId: string) {
    return this.svc.list(user, childId);
  }

  @Post('children/:childId/routine')
  create(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Body() dto: CreateStepDto,
  ) {
    return this.svc.create(user, childId, dto);
  }

  @Post('children/:childId/routine/preset')
  preset(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Body() dto: LoadPresetDto,
  ) {
    return this.svc.loadPreset(user, childId, dto);
  }

  @Patch('routine/:id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateStepDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete('routine/:id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }

  // Publicly-readable so the frontend can render the picker without an
  // extra hardcoded copy of the templates.
  @Get('routine-presets')
  presets() {
    return Object.entries(ROUTINE_PRESETS).map(([key, p]) => ({
      key,
      name: p.name,
      description: p.description,
      stepCount: p.steps.length,
    }));
  }
}

@Module({
  controllers: [RoutineController],
  providers: [RoutineService, ChildAccess],
})
export class RoutineModule {}
