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
  Prisma,
  WellnessAudience,
  WellnessCategory,
  WellnessFormat,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { WELLNESS_SEED } from './wellness.seed';

// The wellness directory. Reads are public — parents don't need to log
// in to browse offerings. Writes are admin-only.

// ─── DTOs ─────────────────────────────────────────────────
export class CreateWellnessDto {
  @ApiProperty({ enum: WellnessCategory }) @IsEnum(WellnessCategory) category!: WellnessCategory;
  @ApiProperty({ enum: WellnessAudience }) @IsEnum(WellnessAudience) audience!: WellnessAudience;
  @ApiProperty({ enum: WellnessFormat }) @IsEnum(WellnessFormat) format!: WellnessFormat;
  @IsString() @MinLength(2) @MaxLength(200) title!: string;
  @IsString() @MinLength(2) @MaxLength(200) provider!: string;
  @IsString() @MinLength(2) @MaxLength(2000) description!: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsString() @MaxLength(120) costHint?: string;
  @IsOptional() @IsString() @MaxLength(200) scheduleHint?: string;
  @IsOptional() @IsString() @MaxLength(500) contactUrl?: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

export class UpdateWellnessDto {
  @IsOptional() @IsEnum(WellnessCategory) category?: WellnessCategory;
  @IsOptional() @IsEnum(WellnessAudience) audience?: WellnessAudience;
  @IsOptional() @IsEnum(WellnessFormat) format?: WellnessFormat;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) provider?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(2000) description?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsString() @MaxLength(120) costHint?: string;
  @IsOptional() @IsString() @MaxLength(200) scheduleHint?: string;
  @IsOptional() @IsString() @MaxLength(500) contactUrl?: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsOptional() @IsBoolean() published?: boolean;
}

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class WellnessService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * On first boot, load the curated seed if the table is empty. Idempotent —
   * we don't touch rows once they exist (admins may have edited them).
   */
  async onModuleInit() {
    const count = await this.prisma.wellnessOffering.count();
    if (count === 0) {
      await this.prisma.wellnessOffering.createMany({ data: WELLNESS_SEED });
    }
  }

  async list(filters: {
    category?: WellnessCategory;
    audience?: WellnessAudience;
    format?: WellnessFormat;
    city?: string;
  }) {
    const where: Prisma.WellnessOfferingWhereInput = { published: true };
    if (filters.category) where.category = filters.category;
    if (filters.audience) where.audience = filters.audience;
    if (filters.format) where.format = filters.format;
    if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' };
    return this.prisma.wellnessOffering.findMany({
      where,
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
    });
  }

  async create(user: AuthUser, dto: CreateWellnessDto) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
    return this.prisma.wellnessOffering.create({
      data: {
        ...dto,
        languages: dto.languages ?? [],
        published: dto.published ?? true,
      },
    });
  }

  async update(user: AuthUser, id: string, dto: UpdateWellnessDto) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
    try {
      return await this.prisma.wellnessOffering.update({ where: { id }, data: dto });
    } catch {
      throw new NotFoundException('Offering not found');
    }
  }

  async remove(user: AuthUser, id: string) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
    await this.prisma.wellnessOffering.delete({ where: { id } }).catch(() => undefined);
    return { ok: true };
  }
}

// ─── Controllers ──────────────────────────────────────────

// Public — read-only. No auth required; parents browsing haven't
// necessarily signed up yet.
@ApiTags('wellness')
@Controller('public/wellness')
export class PublicWellnessController {
  constructor(private readonly svc: WellnessService) {}

  @Get()
  list(
    @Query('category') category?: WellnessCategory,
    @Query('audience') audience?: WellnessAudience,
    @Query('format') format?: WellnessFormat,
    @Query('city') city?: string,
  ) {
    return this.svc.list({ category, audience, format, city });
  }
}

// Admin — write. Guarded by JWT + a role check in the service.
@ApiTags('wellness')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wellness')
export class AdminWellnessController {
  constructor(private readonly svc: WellnessService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateWellnessDto) {
    return this.svc.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateWellnessDto,
  ) {
    return this.svc.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.remove(user, id);
  }
}

@Module({
  controllers: [PublicWellnessController, AdminWellnessController],
  providers: [WellnessService],
})
export class WellnessModule {}
