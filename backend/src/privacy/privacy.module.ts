import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Injectable,
  Module,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { clearAuthCookies } from '../auth/cookies';

// DPDP Act (2023) requires operators to give the individual, on request:
//   • a copy of their personal data ("data portability" / right to access)
//   • deletion of their personal data ("right to erasure")
// This module implements both as authenticated user-scoped endpoints so
// users can act on their own account without going through support.

export class ConfirmDeleteDto {
  @ApiProperty({ description: 'Current password — required to confirm deletion' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'Must equal "delete my account" — a spoken-word confirmation' })
  @IsString()
  confirm!: string;
}

@Injectable()
export class PrivacyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assemble the user's full data footprint into one JSON document. Includes
   * every table where the user is the subject or the actor: profile,
   * caregiver links, moods/behavior they've logged, session notes they
   * authored, community posts, AI chat history, notifications, audit trail.
   *
   * Child records are only included if the user is a PRIMARY caregiver —
   * co-caregivers see a stub (their link to the child) but not the child's
   * medical data, because the primary caregiver "owns" the child's record.
   */
  async exportUserData(userId: string) {
    const [user, caregiverLinks, aiMessages, communityPosts, communityComments, notifications, auditLogs, authoredSessions, behaviorEvents, authTokens] =
      await Promise.all([
        this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            phone: true,
            fullName: true,
            role: true,
            preferredLanguage: true,
            avatarUrl: true,
            emailVerifiedAt: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            therapistProfile: true,
          },
        }),
        this.prisma.caregiver.findMany({
          where: { userId },
          include: {
            child: {
              select: {
                id: true,
                fullName: true,
                dateOfBirth: true,
                diagnoses: true,
                schoolName: true,
              },
            },
          },
        }),
        this.prisma.aiMessage.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
        this.prisma.communityPost.findMany({ where: { authorId: userId } }),
        this.prisma.communityComment.findMany({ where: { authorId: userId } }),
        this.prisma.notification.findMany({ where: { userId } }),
        this.prisma.auditLog.findMany({ where: { userId } }),
        this.prisma.therapySession.findMany({
          where: { therapistId: userId },
          select: {
            id: true,
            childId: true,
            type: true,
            scheduledAt: true,
            durationMins: true,
            status: true,
            notes: true,
            createdAt: true,
          },
        }),
        this.prisma.behaviorEvent.findMany({
          where: { loggedById: userId },
          select: {
            id: true,
            childId: true,
            kind: true,
            occurredAt: true,
            severity: true,
            trigger: true,
            note: true,
            createdAt: true,
          },
        }),
        this.prisma.authToken.findMany({
          where: { userId },
          select: { id: true, type: true, expiresAt: true, usedAt: true, createdAt: true },
        }),
      ]);

    // For each caregiver link, if the user is the PRIMARY caregiver, deep-load
    // the child so the parent can export their child's full care record too.
    const childrenAsPrimary = await Promise.all(
      caregiverLinks
        .filter((cg) => cg.isPrimary)
        .map(async (cg) =>
          this.prisma.child.findUnique({
            where: { id: cg.childId },
            include: {
              milestones: true,
              goals: true,
              therapySessions: {
                select: {
                  id: true,
                  type: true,
                  scheduledAt: true,
                  durationMins: true,
                  status: true,
                  notes: true,
                  aiSummary: true,
                  createdAt: true,
                  therapist: { select: { id: true, fullName: true, email: true } },
                },
              },
              moodEntries: true,
              appointments: true,
              behaviorEvents: true,
              diagnosticReports: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  fileName: true,
                  fileSize: true,
                  mimeType: true,
                  uploadedByName: true,
                  createdAt: true,
                },
              },
              ieps: {
                include: {
                  goals: true,
                  reviews: true,
                },
              },
              school: true,
            },
          }),
        ),
    );

    return {
      exportedAt: new Date().toISOString(),
      note: 'This export contains all personal data SpecialParents.in holds about you and — where you are the primary caregiver — your child(ren). Diagnostic report FILES are not included (their metadata is); download them separately from each child\'s Reports tab. Under DPDP Act 2023 you may request deletion at any time.',
      user,
      caregiverLinks,
      childrenAsPrimary,
      authoredSessions,
      behaviorEvents,
      aiMessages,
      communityPosts,
      communityComments,
      notifications,
      auditLogs,
      authTokens,
    };
  }

  /**
   * Hard-deletes the user account. All FK-attached records cascade via the
   * schema (RefreshToken, AiMessage, CommunityPost, CommunityComment,
   * Notification, AuditLog, AuthToken, Caregiver, MessageThread, Message).
   *
   * NOT deleted: Child rows where the user is a caregiver — because other
   * caregivers may still need access. If the user is the ONLY caregiver of
   * a child, that child is also deleted (with all cascades).
   *
   * Password re-confirmation is required to defeat CSRF-style tricks even
   * though we use httpOnly cookies + SameSite.
   */
  async deleteAccount(userId: string, dto: ConfirmDeleteDto) {
    if (dto.confirm.trim().toLowerCase() !== 'delete my account') {
      throw new BadRequestException(
        'Please type exactly "delete my account" to confirm.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, isActive: true },
    });
    if (!user || !user.isActive) throw new BadRequestException('Account not found');
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');

    // Find children where this user is the ONLY caregiver — those get deleted
    // along with the user (Child cascade wipes every child-scoped table).
    const mine = await this.prisma.caregiver.findMany({
      where: { userId },
      select: { childId: true },
    });
    const soleChildIds: string[] = [];
    for (const link of mine) {
      const others = await this.prisma.caregiver.count({
        where: { childId: link.childId, userId: { not: userId } },
      });
      if (others === 0) soleChildIds.push(link.childId);
    }
    await this.prisma.$transaction([
      this.prisma.child.deleteMany({ where: { id: { in: soleChildIds } } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
    return {
      ok: true,
      deletedChildren: soleChildIds.length,
    };
  }
}

@ApiTags('privacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('privacy')
export class PrivacyController {
  constructor(private readonly svc: PrivacyService) {}

  @Get('export')
  @ApiOperation({
    summary: 'Download all personal data for the current user (DPDP Act §11)',
  })
  async export(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) res: Response) {
    const data = await this.svc.exportUserData(user.id);
    const filename = `specialparent-export-${new Date().toISOString().slice(0, 10)}.json`;
    res.set({
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return data;
  }

  @Delete('account')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Permanently delete the current user account (DPDP Act §12)',
  })
  async delete(
    @CurrentUser() user: AuthUser,
    @Body() dto: ConfirmDeleteDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.svc.deleteAccount(user.id, dto);
    // Clear the httpOnly cookies so the browser can't keep hitting protected
    // routes with a token that maps to a deleted user id.
    clearAuthCookies(res);
    return result;
  }
}

@Module({
  controllers: [PrivacyController],
  providers: [PrivacyService],
})
export class PrivacyModule {}
