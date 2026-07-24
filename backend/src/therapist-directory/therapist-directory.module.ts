import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
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
import * as crypto from 'crypto';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  NotificationKind,
  Prisma,
  Role,
  ServiceMode,
  TherapistLevel,
  VerificationStatus,
} from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

// The therapist directory module owns three surfaces:
//   1. Self-serve — the therapist manages their own profile, education,
//      certifications, and submits for admin review.
//   2. Public — anonymous browse of VERIFIED profiles at /public/therapists.
//   3. Admin — verification queue, approve / reject with notes.
// Parent-initiated care-team invites live here too: the parent picks a
// verified therapist and generates a ChildInvite scoped to that person.

// ─── Roles that can own a therapist profile ─────────────────────────
const PRACTITIONER_ROLES = new Set<Role>([
  Role.THERAPIST,
  Role.DOCTOR,
  Role.SPECIAL_EDUCATOR,
]);

// ═══ DTOs ═══════════════════════════════════════════════════════════

export class UpsertTherapistProfileDto {
  @IsString() @MinLength(2) @MaxLength(120) specialization!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(120, { each: true })
  specializations?: string[];
  @IsOptional() @IsString() @MaxLength(1000) qualifications?: string;
  @IsInt() @Min(0) @Max(70) yearsExperience!: number;
  @IsOptional() @IsString() @MaxLength(3000) bio?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10_000_000) hourlyRate?: number; // paise
  @IsOptional() @IsArray() @ArrayMaxSize(15) @IsString({ each: true }) @MaxLength(6, { each: true })
  languages?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(3) @IsEnum(ServiceMode, { each: true })
  serviceModes?: ServiceMode[];
  @IsOptional() @IsString() @MaxLength(80) city?: string;
  @IsOptional() @IsString() @MaxLength(80) state?: string;
  @IsOptional() @IsUrl() @MaxLength(500) photoUrl?: string;
  @IsOptional() @IsUrl() @MaxLength(500) linkedinUrl?: string;
  @IsOptional() @IsUrl() @MaxLength(500) websiteUrl?: string;
  @IsOptional() @IsString() @MaxLength(300) availability?: string;
  @IsOptional() @IsBoolean() acceptingNewClients?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsString({ each: true }) @MaxLength(10, { each: true })
  ageGroups?: string[];
  @IsOptional() @IsEnum(TherapistLevel) level?: TherapistLevel;
}

export class UpsertEducationDto {
  @IsString() @MinLength(1) @MaxLength(80) degree!: string;
  @IsString() @MinLength(2) @MaxLength(200) institution!: string;
  @IsOptional() @IsString() @MaxLength(200) fieldOfStudy?: string;
  @IsOptional() @IsInt() @Min(1950) @Max(2100) yearCompleted?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpsertCertificationDto {
  @IsString() @MinLength(2) @MaxLength(200) name!: string;
  @IsString() @MinLength(2) @MaxLength(200) issuingOrganization!: string;
  @IsOptional() @IsString() @MaxLength(120) credentialId?: string;
  @IsOptional() @IsString() @MaxLength(30) issueDate?: string;   // YYYY-MM-DD
  @IsOptional() @IsString() @MaxLength(30) expiryDate?: string;  // YYYY-MM-DD
  @IsOptional() @IsUrl() @MaxLength(500) credentialUrl?: string;
  @IsOptional() @IsString() @MaxLength(300) fileName?: string;
  @IsOptional() @IsString() @MaxLength(500) filePath?: string;
}

export class RejectProfileDto {
  @IsString() @MinLength(4) @MaxLength(2000) reason!: string;
}

export class InviteTherapistDto {
  @ApiProperty()
  @IsString() @MinLength(1) @MaxLength(120) relationship!: string;

  @IsOptional() @IsInt() @Min(1) @Max(90) expiresInDays?: number;
}

// ═══ Service ════════════════════════════════════════════════════════

@Injectable()
export class TherapistDirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Self-serve ─────────────────────────────────────────────────

  private assertPractitioner(user: AuthUser) {
    if (!PRACTITIONER_ROLES.has(user.role)) {
      throw new ForbiddenException(
        'Only therapist / doctor / special educator accounts can manage a therapist profile',
      );
    }
  }

  /** Idempotent: creates the profile on first call, updates it on subsequent. */
  async upsertOwnProfile(user: AuthUser, dto: UpsertTherapistProfileDto) {
    this.assertPractitioner(user);
    const existing = await this.prisma.therapistProfile.findUnique({
      where: { userId: user.id },
    });

    // If the profile was previously VERIFIED and the therapist edits a
    // material field, drop it back to PENDING_REVIEW so the admin re-checks.
    const materialChange =
      existing &&
      existing.verificationStatus === 'VERIFIED' &&
      (existing.specialization !== dto.specialization ||
        existing.qualifications !== (dto.qualifications ?? existing.qualifications) ||
        (dto.linkedinUrl ?? '') !== (existing.linkedinUrl ?? ''));

    const nextStatus: VerificationStatus | undefined = materialChange
      ? 'PENDING_REVIEW'
      : undefined;

    const specializations = (dto.specializations ?? []).length
      ? dto.specializations!
      : [dto.specialization];

    return this.prisma.therapistProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        specialization: dto.specialization,
        specializations,
        qualifications: dto.qualifications,
        yearsExperience: dto.yearsExperience,
        bio: dto.bio,
        hourlyRate: dto.hourlyRate,
        languages: dto.languages ?? [],
        serviceModes: dto.serviceModes ?? [],
        city: dto.city,
        state: dto.state,
        photoUrl: dto.photoUrl,
        linkedinUrl: dto.linkedinUrl,
        websiteUrl: dto.websiteUrl,
        availability: dto.availability,
        acceptingNewClients: dto.acceptingNewClients ?? true,
        ageGroups: dto.ageGroups ?? [],
        level: dto.level ?? null,
      },
      update: {
        specialization: dto.specialization,
        specializations,
        qualifications: dto.qualifications,
        yearsExperience: dto.yearsExperience,
        bio: dto.bio,
        hourlyRate: dto.hourlyRate,
        languages: dto.languages ?? [],
        serviceModes: dto.serviceModes ?? [],
        city: dto.city,
        state: dto.state,
        photoUrl: dto.photoUrl,
        linkedinUrl: dto.linkedinUrl,
        websiteUrl: dto.websiteUrl,
        availability: dto.availability,
        acceptingNewClients: dto.acceptingNewClients ?? true,
        ageGroups: dto.ageGroups ?? [],
        level: dto.level ?? null,
        ...(nextStatus ? { verificationStatus: nextStatus, submittedAt: new Date() } : {}),
      },
    });
  }

  async getOwnProfile(user: AuthUser) {
    this.assertPractitioner(user);
    return this.prisma.therapistProfile.findUnique({
      where: { userId: user.id },
      include: {
        educations: { orderBy: { yearCompleted: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
      },
    });
  }

  /** Move DRAFT / REJECTED → PENDING_REVIEW. Requires the basics + at least one credential. */
  async submitForReview(user: AuthUser) {
    this.assertPractitioner(user);
    const profile = await this.getOwnProfile(user);
    if (!profile) {
      throw new BadRequestException('Complete your profile before submitting for review');
    }
    if (profile.verificationStatus === 'PENDING_REVIEW') {
      return profile;
    }
    if (profile.verificationStatus === 'VERIFIED') {
      throw new BadRequestException('Your profile is already verified');
    }
    // Editorial minimum: LinkedIn OR at least one certification, plus one education row.
    if (profile.educations.length === 0) {
      throw new BadRequestException('Add at least one education entry before submitting');
    }
    if (!profile.linkedinUrl && profile.certifications.length === 0) {
      throw new BadRequestException(
        'Add either a LinkedIn URL or at least one certification so the admin can verify you',
      );
    }
    return this.prisma.therapistProfile.update({
      where: { id: profile.id },
      data: {
        verificationStatus: 'PENDING_REVIEW',
        submittedAt: new Date(),
        rejectionReason: null,
      },
    });
  }

  async addEducation(user: AuthUser, dto: UpsertEducationDto) {
    const profile = await this.ensureOwnProfileId(user);
    return this.prisma.therapistEducation.create({
      data: { therapistProfileId: profile.id, ...dto },
    });
  }

  async updateEducation(user: AuthUser, id: string, dto: UpsertEducationDto) {
    await this.assertOwnsEducation(user, id);
    return this.prisma.therapistEducation.update({ where: { id }, data: dto });
  }

  async removeEducation(user: AuthUser, id: string) {
    await this.assertOwnsEducation(user, id);
    await this.prisma.therapistEducation.delete({ where: { id } });
    return { ok: true };
  }

  async addCertification(user: AuthUser, dto: UpsertCertificationDto) {
    const profile = await this.ensureOwnProfileId(user);
    return this.prisma.therapistCertification.create({
      data: {
        therapistProfileId: profile.id,
        ...dto,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });
  }

  async updateCertification(user: AuthUser, id: string, dto: UpsertCertificationDto) {
    await this.assertOwnsCertification(user, id);
    return this.prisma.therapistCertification.update({
      where: { id },
      data: {
        ...dto,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : null,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
      },
    });
  }

  async removeCertification(user: AuthUser, id: string) {
    await this.assertOwnsCertification(user, id);
    await this.prisma.therapistCertification.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureOwnProfileId(user: AuthUser) {
    this.assertPractitioner(user);
    const p = await this.prisma.therapistProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!p) throw new BadRequestException('Create your therapist profile first');
    return p;
  }

  private async assertOwnsEducation(user: AuthUser, educationId: string) {
    const row = await this.prisma.therapistEducation.findUnique({
      where: { id: educationId },
      select: { therapistProfile: { select: { userId: true } } },
    });
    if (!row) throw new NotFoundException('Education entry not found');
    if (row.therapistProfile.userId !== user.id) throw new ForbiddenException();
  }

  private async assertOwnsCertification(user: AuthUser, certId: string) {
    const row = await this.prisma.therapistCertification.findUnique({
      where: { id: certId },
      select: { therapistProfile: { select: { userId: true } } },
    });
    if (!row) throw new NotFoundException('Certification not found');
    if (row.therapistProfile.userId !== user.id) throw new ForbiddenException();
  }

  // ── Admin — verification queue ───────────────────────────────

  private assertAdmin(user: AuthUser) {
    if (user.role !== 'ADMIN') throw new ForbiddenException('Admin only');
  }

  async adminList(user: AuthUser, status?: VerificationStatus) {
    this.assertAdmin(user);
    return this.prisma.therapistProfile.findMany({
      where: status ? { verificationStatus: status } : {},
      orderBy: [{ verificationStatus: 'asc' }, { submittedAt: 'desc' }, { updatedAt: 'desc' }],
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true } },
        educations: { orderBy: { yearCompleted: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
      },
    });
  }

  async adminGet(user: AuthUser, id: string) {
    this.assertAdmin(user);
    const row = await this.prisma.therapistProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, fullName: true, email: true, role: true, phone: true } },
        educations: { orderBy: { yearCompleted: 'desc' } },
        certifications: { orderBy: { issueDate: 'desc' } },
      },
    });
    if (!row) throw new NotFoundException('Profile not found');
    return row;
  }

  async adminVerify(user: AuthUser, id: string) {
    this.assertAdmin(user);
    const updated = await this.prisma.therapistProfile.update({
      where: { id },
      data: {
        verificationStatus: 'VERIFIED',
        verifiedAt: new Date(),
        verifiedById: user.id,
        rejectionReason: null,
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: updated.userId,
        kind: 'SYSTEM',
        title: 'Your therapist profile is live',
        body: 'Parents can now discover you in the SpecialParents directory.',
        link: '/therapist/profile',
      },
    });
    return updated;
  }

  async adminReject(user: AuthUser, id: string, dto: RejectProfileDto) {
    this.assertAdmin(user);
    const updated = await this.prisma.therapistProfile.update({
      where: { id },
      data: {
        verificationStatus: 'REJECTED',
        rejectionReason: dto.reason,
        verifiedById: user.id,
      },
    });
    await this.prisma.notification.create({
      data: {
        userId: updated.userId,
        kind: 'SYSTEM',
        title: 'Your therapist profile needs changes',
        body: dto.reason.slice(0, 240),
        link: '/therapist/profile',
      },
    });
    return updated;
  }

  async adminSuspend(user: AuthUser, id: string, dto: RejectProfileDto) {
    this.assertAdmin(user);
    return this.prisma.therapistProfile.update({
      where: { id },
      data: {
        verificationStatus: 'SUSPENDED',
        rejectionReason: dto.reason,
        verifiedById: user.id,
      },
    });
  }

  // ── Public directory ─────────────────────────────────────────

  async publicList(filters: {
    specialization?: string;
    city?: string;
    language?: string;
    mode?: ServiceMode;
    accepting?: boolean;
    level?: TherapistLevel;
  }) {
    const where: Prisma.TherapistProfileWhereInput = {
      verificationStatus: 'VERIFIED',
    };
    if (filters.specialization) {
      where.OR = [
        { specialization: { equals: filters.specialization, mode: 'insensitive' } },
        { specializations: { has: filters.specialization } },
      ];
    }
    if (filters.city) where.city = { equals: filters.city, mode: 'insensitive' };
    if (filters.language) where.languages = { has: filters.language };
    if (filters.mode) where.serviceModes = { has: filters.mode };
    if (typeof filters.accepting === 'boolean') where.acceptingNewClients = filters.accepting;
    if (filters.level) where.level = filters.level;

    const rows = await this.prisma.therapistProfile.findMany({
      where,
      orderBy: [{ acceptingNewClients: 'desc' }, { verifiedAt: 'desc' }],
      select: {
        id: true,
        specialization: true,
        specializations: true,
        yearsExperience: true,
        bio: true,
        hourlyRate: true,
        languages: true,
        serviceModes: true,
        city: true,
        state: true,
        photoUrl: true,
        acceptingNewClients: true,
        ageGroups: true,
        level: true,
        verifiedAt: true,
        user: { select: { fullName: true } },
      },
    });
    return rows.map((r) => ({ ...r, fullName: r.user.fullName, user: undefined }));
  }

  async publicGet(id: string) {
    const row = await this.prisma.therapistProfile.findFirst({
      where: { id, verificationStatus: 'VERIFIED' },
      include: {
        educations: { orderBy: { yearCompleted: 'desc' } },
        certifications: {
          orderBy: { issueDate: 'desc' },
          // Never leak the raw storage path publicly.
          select: {
            id: true, name: true, issuingOrganization: true, credentialId: true,
            issueDate: true, expiryDate: true, credentialUrl: true,
          },
        },
        user: { select: { fullName: true } },
      },
    });
    if (!row) throw new NotFoundException('Therapist not found');
    return { ...row, fullName: row.user.fullName, user: undefined };
  }

  // ── Parent-initiated invite ──────────────────────────────────
  // A parent browsing the directory picks a therapist and generates a
  // ChildInvite. The invite is fully revocable and works with the existing
  // /invites/accept/:token flow.

  async inviteTherapist(
    user: AuthUser,
    childId: string,
    therapistProfileId: string,
    dto: InviteTherapistDto,
  ) {
    // Only the primary caregiver of the child (or admin) can create invites.
    if (user.role !== 'ADMIN') {
      const link = await this.prisma.caregiver.findUnique({
        where: { userId_childId: { userId: user.id, childId } },
      });
      if (!link) throw new ForbiddenException('Not a caregiver of this child');
      if (!link.isPrimary) {
        throw new ForbiddenException('Only the primary caregiver can invite therapists');
      }
    }

    const profile = await this.prisma.therapistProfile.findFirst({
      where: { id: therapistProfileId, verificationStatus: 'VERIFIED' },
      include: { user: { select: { id: true, email: true, fullName: true, role: true } } },
    });
    if (!profile) throw new NotFoundException('Verified therapist not found');

    // Refuse if the therapist already has caregiver access to this child.
    const already = await this.prisma.caregiver.findUnique({
      where: { userId_childId: { userId: profile.user.id, childId } },
    });
    if (already) {
      throw new BadRequestException('This therapist already has access to this child');
    }

    const child = await this.prisma.child.findUnique({
      where: { id: childId },
      select: { fullName: true },
    });
    if (!child) throw new NotFoundException('Child not found');

    const token = crypto.randomBytes(24).toString('base64url');
    const days = dto.expiresInDays ?? 14;
    const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);

    const invite = await this.prisma.childInvite.create({
      data: {
        childId,
        invitedById: user.id,
        token,
        role: profile.user.role,
        relationship: dto.relationship,
        email: profile.user.email,
        expiresAt,
      },
    });

    // Notify the therapist in-app. The email carbon is handled by the
    // mailer when SMTP is configured; for now the notification + link work.
    await this.prisma.notification.create({
      data: {
        userId: profile.user.id,
        kind: NotificationKind.SYSTEM,
        title: `You've been invited to ${child.fullName}'s care team`,
        body: `Invitation to join as "${dto.relationship}". Open to review and accept.`,
        link: `/invite/${token}`,
      },
    });

    return invite;
  }
}

// ═══ Controllers ═══════════════════════════════════════════════════

// Self-serve — the therapist manages their own profile.
@ApiTags('therapist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('therapist-profile')
export class TherapistSelfController {
  constructor(private readonly svc: TherapistDirectoryService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.svc.getOwnProfile(user);
  }

  @Post()
  upsert(@CurrentUser() user: AuthUser, @Body() dto: UpsertTherapistProfileDto) {
    return this.svc.upsertOwnProfile(user, dto);
  }

  @Post('submit')
  submit(@CurrentUser() user: AuthUser) {
    return this.svc.submitForReview(user);
  }

  @Post('educations')
  addEducation(@CurrentUser() user: AuthUser, @Body() dto: UpsertEducationDto) {
    return this.svc.addEducation(user, dto);
  }

  @Patch('educations/:id')
  updateEducation(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertEducationDto,
  ) {
    return this.svc.updateEducation(user, id, dto);
  }

  @Delete('educations/:id')
  removeEducation(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.removeEducation(user, id);
  }

  @Post('certifications')
  addCertification(@CurrentUser() user: AuthUser, @Body() dto: UpsertCertificationDto) {
    return this.svc.addCertification(user, dto);
  }

  @Patch('certifications/:id')
  updateCertification(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpsertCertificationDto,
  ) {
    return this.svc.updateCertification(user, id, dto);
  }

  @Delete('certifications/:id')
  removeCertification(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.removeCertification(user, id);
  }
}

// Admin — verification queue.
@ApiTags('therapist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/therapists')
export class AdminTherapistController {
  constructor(private readonly svc: TherapistDirectoryService) {}

  @Get()
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: VerificationStatus,
  ) {
    return this.svc.adminList(user, status);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.adminGet(user, id);
  }

  @Post(':id/verify')
  verify(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.adminVerify(user, id);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectProfileDto,
  ) {
    return this.svc.adminReject(user, id, dto);
  }

  @Post(':id/suspend')
  suspend(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RejectProfileDto,
  ) {
    return this.svc.adminSuspend(user, id, dto);
  }
}

// Public — anonymous browse of verified profiles.
@ApiTags('therapist')
@Controller('public/therapists')
export class PublicTherapistController {
  constructor(private readonly svc: TherapistDirectoryService) {}

  @Get()
  list(
    @Query('specialization') specialization?: string,
    @Query('city') city?: string,
    @Query('language') language?: string,
    @Query('mode') mode?: ServiceMode,
    @Query('accepting') accepting?: string,
    @Query('level') level?: TherapistLevel,
  ) {
    return this.svc.publicList({
      specialization,
      city,
      language,
      mode,
      accepting: accepting === 'true' ? true : accepting === 'false' ? false : undefined,
      level,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.publicGet(id);
  }
}

// Parent-initiated invite — lives alongside so the same service holds
// the "verified therapist" access check.
@ApiTags('therapist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('children/:childId/invite-therapist')
export class InviteTherapistController {
  constructor(private readonly svc: TherapistDirectoryService) {}

  @Post(':therapistProfileId')
  invite(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Param('therapistProfileId') therapistProfileId: string,
    @Body() dto: InviteTherapistDto,
  ) {
    return this.svc.inviteTherapist(user, childId, therapistProfileId, dto);
  }
}

@Module({
  controllers: [
    TherapistSelfController,
    AdminTherapistController,
    PublicTherapistController,
    InviteTherapistController,
  ],
  providers: [TherapistDirectoryService],
})
export class TherapistDirectoryModule {}
