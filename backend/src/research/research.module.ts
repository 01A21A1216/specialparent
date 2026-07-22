import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Injectable,
  Module,
  NotFoundException,
  OnModuleInit,
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
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  EvidenceLevel,
  Prisma,
  TreatmentFocus,
  TreatmentSystem,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TREATMENT_RESEARCH_SEED } from './research.seed';

// The treatments-research library. Reads are public — this is educational
// information every family should be able to consult without a login.
// Writes are admin-only, and the seed itself should be reviewed by a
// clinical panel before public launch (see research.seed.ts).

// ─── DTOs ─────────────────────────────────────────────────
export class CreateTreatmentResearchDto {
  @ApiProperty({ enum: TreatmentSystem }) @IsEnum(TreatmentSystem) system!: TreatmentSystem;
  @ApiProperty({ enum: TreatmentFocus }) @IsEnum(TreatmentFocus) focus!: TreatmentFocus;
  @ApiProperty({ enum: EvidenceLevel }) @IsEnum(EvidenceLevel) evidenceLevel!: EvidenceLevel;
  @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(200) alsoKnownAs?: string;
  @IsString() @MinLength(10) @MaxLength(1000) summary!: string;
  @IsString() @MinLength(10) @MaxLength(4000) whatItIs!: string;
  @IsString() @MinLength(10) @MaxLength(4000) whatResearchShows!: string;
  @IsString() @MinLength(10) @MaxLength(4000) considerations!: string;
  @IsOptional() @IsString() @MaxLength(4000) indiaContext?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) references?: string[];
  @IsOptional() @IsBoolean() prescriptionRequired?: boolean;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateTreatmentResearchDto {
  @IsOptional() @IsEnum(TreatmentSystem) system?: TreatmentSystem;
  @IsOptional() @IsEnum(TreatmentFocus) focus?: TreatmentFocus;
  @IsOptional() @IsEnum(EvidenceLevel) evidenceLevel?: EvidenceLevel;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(200) alsoKnownAs?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(1000) summary?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(4000) whatItIs?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(4000) whatResearchShows?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(4000) considerations?: string;
  @IsOptional() @IsString() @MaxLength(4000) indiaContext?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) references?: string[];
  @IsOptional() @IsBoolean() prescriptionRequired?: boolean;
  @IsOptional() @IsBoolean() published?: boolean;
}

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class TreatmentResearchService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Load the curated seed on boot. Idempotent: title is unique so
   * skipDuplicates makes this safe against dev-mode restarts and against
   * admins who've edited an existing row (their row wins on title match).
   */
  async onModuleInit() {
    await this.prisma.treatmentResearch.createMany({
      data: TREATMENT_RESEARCH_SEED.map((r) => ({
        ...r,
        references: r.references ?? [],
      })),
      skipDuplicates: true,
    });
  }

  async list(filters: {
    system?: TreatmentSystem;
    focus?: TreatmentFocus;
    evidenceLevel?: EvidenceLevel;
  }) {
    const where: Prisma.TreatmentResearchWhereInput = { published: true };
    if (filters.system) where.system = filters.system;
    if (filters.focus) where.focus = filters.focus;
    if (filters.evidenceLevel) where.evidenceLevel = filters.evidenceLevel;
    return this.prisma.treatmentResearch.findMany({
      where,
      // Deliberate ordering: strongest evidence first within each system, so
      // parents skimming a system see standard-of-care ahead of experimental.
      orderBy: [
        { system: 'asc' },
        { evidenceLevel: 'asc' },
        { title: 'asc' },
      ],
    });
  }

  async create(user: AuthUser, dto: CreateTreatmentResearchDto) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
    return this.prisma.treatmentResearch.create({
      data: {
        ...dto,
        references: dto.references ?? [],
        published: dto.published ?? true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateTreatmentResearchDto) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
    try {
      return await this.prisma.treatmentResearch.update({ where: { id }, data: dto });
    } catch {
      throw new NotFoundException('Entry not found');
    }
  }

  async remove(user: AuthUser, id: string) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
    await this.prisma.treatmentResearch.delete({ where: { id } }).catch(() => undefined);
    return { ok: true };
  }
}

// ─── Controllers ──────────────────────────────────────────

// Public — read-only. No auth required.
@ApiTags('research')
@Controller('public/research')
export class PublicTreatmentResearchController {
  constructor(private readonly svc: TreatmentResearchService) {}

  @Get()
  list(
    @Query('system') system?: TreatmentSystem,
    @Query('focus') focus?: TreatmentFocus,
    @Query('evidenceLevel') evidenceLevel?: EvidenceLevel,
  ) {
    return this.svc.list({ system, focus, evidenceLevel });
  }
}

// Admin — write. Role check enforced in the service.
@ApiTags('research')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('research')
export class AdminTreatmentResearchController {
  constructor(private readonly svc: TreatmentResearchService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTreatmentResearchDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentResearchDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@Module({
  controllers: [
    PublicTreatmentResearchController,
    AdminTreatmentResearchController,
  ],
  providers: [TreatmentResearchService],
})
export class TreatmentResearchModule {}
