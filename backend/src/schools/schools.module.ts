import {
  Body,
  Controller,
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
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { SchoolBoard } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

// ─── DTOs ─────────────────────────────────────────────────
export class CreateSchoolDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: SchoolBoard, required: false })
  @IsOptional()
  @IsEnum(SchoolBoard)
  board?: SchoolBoard;

  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(150) principalName?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(300) website?: string;
  @IsOptional() @IsBoolean() isInclusive?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateSchoolDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) name?: string;
  @IsOptional() @IsEnum(SchoolBoard) board?: SchoolBoard;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(150) principalName?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(30) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(300) website?: string;
  @IsOptional() @IsBoolean() isInclusive?: boolean;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

// ─── Service ──────────────────────────────────────────────
@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Search by name (case-insensitive partial). Also returns child count so
   * the frontend can hint "5 children on the platform go here".
   */
  async search(query?: string) {
    const where = query?.trim()
      ? { name: { contains: query.trim(), mode: 'insensitive' as const } }
      : {};
    return this.prisma.school.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 50,
      include: { _count: { select: { children: true } } },
    });
  }

  async get(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!school) throw new NotFoundException('School not found');
    return school;
  }

  async create(dto: CreateSchoolDto) {
    return this.prisma.school.create({ data: dto });
  }

  async update(id: string, dto: UpdateSchoolDto) {
    try {
      return await this.prisma.school.update({ where: { id }, data: dto });
    } catch {
      throw new NotFoundException('School not found');
    }
  }
}

// ─── Controller ───────────────────────────────────────────
@ApiTags('schools')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('schools')
export class SchoolsController {
  constructor(private readonly svc: SchoolsService) {}

  @Get()
  list(@Query('q') q?: string) {
    return this.svc.search(q);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @Post()
  create(@Body() dto: CreateSchoolDto) {
    return this.svc.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.svc.update(id, dto);
  }
}

// ─── Module ───────────────────────────────────────────────
@Module({
  controllers: [SchoolsController],
  providers: [SchoolsService],
})
export class SchoolsModule {}
