import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthTokenType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailerService } from '../common/mail/mail.module';
import { ChangePasswordDto, LoginDto, SignupDto, UpdateMeDto } from './auth.dto';

const PASSWORD_RESET_TTL_MIN = 60; // 1 hour
const EMAIL_VERIFY_TTL_MIN = 60 * 24 * 3; // 3 days

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailerService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        fullName: dto.fullName,
        passwordHash,
        role: dto.role ?? 'PARENT',
        preferredLanguage: dto.preferredLanguage ?? 'EN',
        phone: dto.phone,
      },
      select: this.userSelect(),
    });

    // Best-effort verification email — never blocks signup.
    this.sendVerificationEmail(user.id).catch((err) =>
      this.logger.warn(`Verification mail failed for ${user.id}: ${err?.message}`),
    );

    const tokens = await this.issueTokens(user.id);
    return { user, ...tokens };
  }

  // ── Password reset ─────────────────────────────────────
  // Never leak whether an email exists — always return { ok: true }.
  async requestPasswordReset(rawEmail: string): Promise<{ ok: true }> {
    const email = rawEmail.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return { ok: true };

    const { rawToken, tokenHash, expiresAt } = this.newToken(PASSWORD_RESET_TTL_MIN);
    await this.prisma.authToken.create({
      data: { userId: user.id, type: 'PASSWORD_RESET', tokenHash, expiresAt },
    });

    const link = `${this.webUrl()}/reset-password?token=${rawToken}`;
    await this.mail.send({
      to: user.email,
      subject: 'Reset your SpecialParents.in password',
      html: `
        <p>Hi ${escapeHtml(user.fullName)},</p>
        <p>Someone (hopefully you) asked to reset the password on your SpecialParents.in account.</p>
        <p><a href="${link}">Click here to choose a new password</a>. This link is valid for the next hour.</p>
        <p>If you didn't request this, you can ignore this email — your account stays as it was.</p>
      `,
    });
    return { ok: true };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<{ ok: true }> {
    const token = await this.consumeToken(rawToken, 'PASSWORD_RESET');
    const passwordHash = await bcrypt.hash(newPassword, 12);
    // Password change → revoke every existing refresh token; user must log in again everywhere.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: token.userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  // ── Email verification ────────────────────────────────
  async sendVerificationEmail(userId: string): Promise<{ ok: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, fullName: true, emailVerifiedAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.emailVerifiedAt) return { ok: true }; // already verified — no-op

    const { rawToken, tokenHash, expiresAt } = this.newToken(EMAIL_VERIFY_TTL_MIN);
    await this.prisma.authToken.create({
      data: { userId: user.id, type: 'EMAIL_VERIFICATION', tokenHash, expiresAt },
    });

    const link = `${this.webUrl()}/verify-email?token=${rawToken}`;
    await this.mail.send({
      to: user.email,
      subject: 'Verify your SpecialParents.in email',
      html: `
        <p>Hi ${escapeHtml(user.fullName)},</p>
        <p>Confirm this email is yours so we can send you appointment reminders and important account notices.</p>
        <p><a href="${link}">Verify your email address</a>. This link is valid for the next 3 days.</p>
      `,
    });
    return { ok: true };
  }

  async verifyEmail(rawToken: string): Promise<{ ok: true }> {
    const token = await this.consumeToken(rawToken, 'EMAIL_VERIFICATION');
    await this.prisma.user.update({
      where: { id: token.userId },
      data: { emailVerifiedAt: new Date() },
    });
    return { ok: true };
  }

  private newToken(ttlMin: number) {
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64 char hex
    const tokenHash = this.hash(rawToken);
    const expiresAt = new Date(Date.now() + ttlMin * 60_000);
    return { rawToken, tokenHash, expiresAt };
  }

  private async consumeToken(rawToken: string, type: AuthTokenType) {
    if (!rawToken || rawToken.length !== 64) {
      throw new BadRequestException('Invalid or expired token');
    }
    const tokenHash = this.hash(rawToken);
    const record = await this.prisma.authToken.findUnique({ where: { tokenHash } });
    if (
      !record ||
      record.type !== type ||
      record.usedAt !== null ||
      record.expiresAt < new Date()
    ) {
      throw new BadRequestException('Invalid or expired token');
    }
    await this.prisma.authToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return record;
  }

  private webUrl(): string {
    return (this.config.get<string>('WEB_URL') ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  async login(dto: LoginDto, meta?: { ip?: string; ua?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user.id, meta);
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        avatarUrl: user.avatarUrl,
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token invalid or expired');
    }
    // rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    return this.issueTokens(stored.userId);
  }

  async logout(refreshToken: string) {
    const tokenHash = this.hash(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { ok: true };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: this.userSelect(),
    });
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    // Trim/normalise light fields; treat empty string as "clear" for nullable fields.
    const data: Record<string, unknown> = {};
    if (dto.fullName !== undefined) data.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) data.phone = dto.phone.trim() || null;
    if (dto.preferredLanguage !== undefined) data.preferredLanguage = dto.preferredLanguage;
    if (dto.avatarUrl !== undefined) data.avatarUrl = dto.avatarUrl.trim() || null;
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: this.userSelect(),
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) throw new UnauthorizedException();
    const ok = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!ok) throw new BadRequestException('Current password is incorrect');
    if (dto.newPassword === dto.currentPassword) {
      throw new BadRequestException('New password must differ from the current one');
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);
    // Also invalidate every existing refresh token — signs the user out of
    // any other browsers / devices.
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { ok: true };
  }

  // ── helpers ────────────────────────────────────────────
  private userSelect() {
    return {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      role: true,
      preferredLanguage: true,
      avatarUrl: true,
      emailVerifiedAt: true,
      createdAt: true,
      lastLoginAt: true,
    } as const;
  }

  private hash(token: string) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(
    userId: string,
    meta?: { ip?: string; ua?: string },
  ): Promise<TokenPair> {
    const accessTtl = parseInt(this.config.getOrThrow('JWT_ACCESS_TTL'), 10);
    const refreshTtl = parseInt(this.config.getOrThrow('JWT_REFRESH_TTL'), 10);

    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: accessTtl,
      },
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const tokenHash = this.hash(refreshToken);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        ipAddress: meta?.ip,
        userAgent: meta?.ua,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken, expiresIn: accessTtl };
  }
}

// Small helper for the plain-text email templates. Keeps HTML from being
// derived from user-controlled data (fullName).
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
