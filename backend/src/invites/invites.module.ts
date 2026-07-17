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
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

// Roles a parent can invite via link. ADMIN is intentionally excluded.
const INVITEABLE_ROLES = new Set<Role>([
  Role.PARENT, // co-parent / secondary caregiver
  Role.THERAPIST,
  Role.DOCTOR,
  Role.TEACHER,
  Role.SPECIAL_EDUCATOR,
  Role.SCHOOL_ADMIN,
]);

export class CreateInviteDto {
  @IsEnum(Role)
  role!: Role;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  relationship!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}

@Injectable()
export class InvitesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertPrimaryOrAdmin(userId: string, role: Role, childId: string) {
    if (role === Role.ADMIN) return;
    const link = await this.prisma.caregiver.findUnique({
      where: { userId_childId: { userId, childId } },
    });
    if (!link) throw new ForbiddenException('Not a caregiver of this child');
    if (!link.isPrimary) {
      throw new ForbiddenException('Only the primary caregiver can manage invites');
    }
  }

  async create(user: AuthUser, childId: string, dto: CreateInviteDto) {
    await this.assertPrimaryOrAdmin(user.id, user.role, childId);
    if (!INVITEABLE_ROLES.has(dto.role)) {
      throw new BadRequestException('That role cannot be invited via link');
    }
    const token = crypto.randomBytes(24).toString('base64url');
    const days = dto.expiresInDays ?? 14;
    const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000);
    return this.prisma.childInvite.create({
      data: {
        childId,
        invitedById: user.id,
        token,
        role: dto.role,
        relationship: dto.relationship,
        email: dto.email,
        expiresAt,
      },
    });
  }

  async list(user: AuthUser, childId: string) {
    await this.assertPrimaryOrAdmin(user.id, user.role, childId);
    return this.prisma.childInvite.findMany({
      where: { childId },
      orderBy: { createdAt: 'desc' },
      include: {
        acceptedBy: {
          select: { id: true, fullName: true, email: true, role: true },
        },
      },
    });
  }

  async revoke(user: AuthUser, id: string) {
    const inv = await this.prisma.childInvite.findUnique({ where: { id } });
    if (!inv) return { ok: true };
    if (user.role !== Role.ADMIN && inv.invitedById !== user.id) {
      // Fall back to primary check if the caller isn't the original inviter.
      await this.assertPrimaryOrAdmin(user.id, user.role, inv.childId);
    }
    await this.prisma.childInvite.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  // ── Public: token lookup ─────────────────────────────────
  // Returns just enough context for someone opening the link (possibly
  // unauthenticated) to see what they'd be accepting.
  async lookup(token: string) {
    const inv = await this.prisma.childInvite.findUnique({
      where: { token },
      include: {
        child: { select: { fullName: true } },
        invitedBy: { select: { fullName: true } },
      },
    });
    if (!inv) throw new NotFoundException('Invite not found');
    const status = inv.revokedAt
      ? 'revoked'
      : inv.acceptedAt
        ? 'accepted'
        : inv.expiresAt < new Date()
          ? 'expired'
          : 'pending';
    return {
      childFullName: inv.child.fullName,
      invitedByName: inv.invitedBy.fullName,
      role: inv.role,
      relationship: inv.relationship,
      email: inv.email,
      expiresAt: inv.expiresAt,
      status,
    };
  }

  // ── Authed: accept ───────────────────────────────────────
  async accept(user: AuthUser, token: string) {
    const inv = await this.prisma.childInvite.findUnique({ where: { token } });
    if (!inv) throw new NotFoundException('Invite not found');
    if (inv.revokedAt) throw new BadRequestException('This invite has been revoked');
    if (inv.acceptedAt) throw new BadRequestException('This invite has already been used');
    if (inv.expiresAt < new Date()) throw new BadRequestException('This invite has expired');

    const existing = await this.prisma.caregiver.findUnique({
      where: { userId_childId: { userId: user.id, childId: inv.childId } },
    });
    if (existing) {
      throw new BadRequestException('You are already linked to this child');
    }

    const [, updated] = await this.prisma.$transaction([
      this.prisma.caregiver.create({
        data: {
          userId: user.id,
          childId: inv.childId,
          relationship: inv.relationship,
          isPrimary: false,
        },
      }),
      this.prisma.childInvite.update({
        where: { id: inv.id },
        data: { acceptedAt: new Date(), acceptedById: user.id },
      }),
    ]);
    return { ok: true, childId: updated.childId };
  }
}

@ApiTags('invites')
@Controller()
export class InvitesController {
  constructor(private readonly svc: InvitesService) {}

  @Post('children/:childId/invites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Param('childId') childId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.svc.create(user, childId, dto);
  }

  @Get('children/:childId/invites')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser, @Param('childId') childId: string) {
    return this.svc.list(user, childId);
  }

  @Delete('invites/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  revoke(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.svc.revoke(user, id);
  }

  // Public — no auth guard so someone with a shared link can preview.
  @Get('invites/lookup/:token')
  lookup(@Param('token') token: string) {
    return this.svc.lookup(token);
  }

  @Post('invites/accept/:token')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.svc.accept(user, token);
  }
}

@Module({
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
