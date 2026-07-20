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
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
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

// ─── School-facing dashboard ──────────────────────────────
// A view of the students the current TEACHER / SCHOOL_ADMIN caregivers,
// grouped by school, plus their IEP inbox (drafts + pending-review IEPs
// waiting for the user's signature). Uses existing caregiver access —
// we do NOT let a school admin see every child at their school just
// because those children have a matching schoolId. They still have to
// be on the care team, invited by a parent.

interface SchoolDashboard {
  role: 'TEACHER' | 'SCHOOL_ADMIN' | 'OTHER';
  studentsBySchool: Array<{
    school: {
      id: string | null;
      name: string;
      board?: string | null;
      city?: string | null;
      isInclusive?: boolean;
    };
    students: Array<{
      id: string;
      fullName: string;
      dateOfBirth: string;
      diagnoses: string[];
      photoUrl: string | null;
      activeIepId: string | null;
      draftIepCount: number;
      pendingIepCount: number;
      primaryCaregiver: { id: string; fullName: string } | null;
    }>;
  }>;
  iepInbox: Array<{
    id: string;
    childId: string;
    childName: string;
    schoolYear: string;
    title: string | null;
    status: 'DRAFT' | 'PENDING_REVIEW';
    updatedAt: string;
    approvalsCount: number;
    userHasSigned: boolean;
  }>;
  totals: {
    students: number;
    schools: number;
    pendingIepsForMe: number;
  };
}

@Injectable()
export class SchoolDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard(user: AuthUser): Promise<SchoolDashboard> {
    // 1) Every child the user caregivers.
    const caregiverLinks = await this.prisma.caregiver.findMany({
      where: { userId: user.id },
      select: { childId: true },
    });
    const childIds = caregiverLinks.map((l) => l.childId);

    if (childIds.length === 0) {
      return {
        role: (user.role as 'TEACHER' | 'SCHOOL_ADMIN' | 'OTHER') ?? 'OTHER',
        studentsBySchool: [],
        iepInbox: [],
        totals: { students: 0, schools: 0, pendingIepsForMe: 0 },
      };
    }

    const [children, ieps, myApprovals] = await Promise.all([
      this.prisma.child.findMany({
        where: { id: { in: childIds } },
        select: {
          id: true,
          fullName: true,
          dateOfBirth: true,
          diagnoses: true,
          photoUrl: true,
          schoolId: true,
          schoolName: true,
          school: {
            select: {
              id: true,
              name: true,
              board: true,
              city: true,
              isInclusive: true,
            },
          },
          caregivers: {
            where: { isPrimary: true },
            take: 1,
            select: {
              user: { select: { id: true, fullName: true } },
            },
          },
        },
      }),
      this.prisma.iep.findMany({
        where: {
          childId: { in: childIds },
          status: { in: ['DRAFT', 'PENDING_REVIEW', 'ACTIVE'] },
        },
        select: {
          id: true,
          childId: true,
          schoolYear: true,
          title: true,
          status: true,
          updatedAt: true,
          _count: { select: { approvals: true } },
        },
        orderBy: { updatedAt: 'asc' },
      }),
      this.prisma.iepApproval.findMany({
        where: {
          userId: user.id,
          iep: { childId: { in: childIds } },
        },
        select: { iepId: true },
      }),
    ]);

    const signedIepIds = new Set(myApprovals.map((a) => a.iepId));
    const childById = new Map(children.map((c) => [c.id, c]));

    // 2) IEP counts per child.
    const draftPerChild = new Map<string, number>();
    const pendingPerChild = new Map<string, number>();
    const activeIepPerChild = new Map<string, string>();
    for (const iep of ieps) {
      if (iep.status === 'DRAFT') {
        draftPerChild.set(iep.childId, (draftPerChild.get(iep.childId) ?? 0) + 1);
      } else if (iep.status === 'PENDING_REVIEW') {
        pendingPerChild.set(
          iep.childId,
          (pendingPerChild.get(iep.childId) ?? 0) + 1,
        );
      } else if (iep.status === 'ACTIVE' && !activeIepPerChild.has(iep.childId)) {
        activeIepPerChild.set(iep.childId, iep.id);
      }
    }

    // 3) Group students by school.
    interface SchoolBucket {
      school: {
        id: string | null;
        name: string;
        board?: string | null;
        city?: string | null;
        isInclusive?: boolean;
      };
      students: SchoolDashboard['studentsBySchool'][number]['students'];
    }
    const bySchool = new Map<string, SchoolBucket>();
    for (const c of children) {
      const key = c.school?.id ?? c.schoolName ?? '__unassigned__';
      if (!bySchool.has(key)) {
        bySchool.set(key, {
          school: c.school
            ? {
                id: c.school.id,
                name: c.school.name,
                board: c.school.board,
                city: c.school.city,
                isInclusive: c.school.isInclusive,
              }
            : {
                id: null,
                name: c.schoolName ?? 'Unassigned school',
              },
          students: [],
        });
      }
      bySchool.get(key)!.students.push({
        id: c.id,
        fullName: c.fullName,
        dateOfBirth: c.dateOfBirth.toISOString(),
        diagnoses: c.diagnoses,
        photoUrl: c.photoUrl,
        activeIepId: activeIepPerChild.get(c.id) ?? null,
        draftIepCount: draftPerChild.get(c.id) ?? 0,
        pendingIepCount: pendingPerChild.get(c.id) ?? 0,
        primaryCaregiver: c.caregivers[0]?.user ?? null,
      });
    }

    // 4) IEP inbox — DRAFT + PENDING_REVIEW, oldest first, mark whether
    //    the user already signed it.
    const iepInbox = ieps
      .filter((i) => i.status === 'DRAFT' || i.status === 'PENDING_REVIEW')
      .map((i) => ({
        id: i.id,
        childId: i.childId,
        childName: childById.get(i.childId)?.fullName ?? '',
        schoolYear: i.schoolYear,
        title: i.title,
        status: i.status as 'DRAFT' | 'PENDING_REVIEW',
        updatedAt: i.updatedAt.toISOString(),
        approvalsCount: i._count.approvals,
        userHasSigned: signedIepIds.has(i.id),
      }));

    return {
      role: (user.role as 'TEACHER' | 'SCHOOL_ADMIN' | 'OTHER') ?? 'OTHER',
      studentsBySchool: Array.from(bySchool.values()).sort((a, b) =>
        a.school.name.localeCompare(b.school.name),
      ),
      iepInbox,
      totals: {
        students: children.length,
        schools: bySchool.size,
        pendingIepsForMe: iepInbox.filter((i) => !i.userHasSigned).length,
      },
    };
  }
}

@ApiTags('school-dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('school-dashboard')
export class SchoolDashboardController {
  constructor(private readonly svc: SchoolDashboardService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.svc.dashboard(user);
  }
}

// ─── Module ───────────────────────────────────────────────
@Module({
  controllers: [SchoolsController, SchoolDashboardController],
  providers: [SchoolsService, SchoolDashboardService],
})
export class SchoolsModule {}
