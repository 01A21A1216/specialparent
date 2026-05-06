import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, SignupDto } from './auth.dto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
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

    const tokens = await this.issueTokens(user.id);
    return { user, ...tokens };
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

  // ── helpers ────────────────────────────────────────────
  private userSelect() {
    return {
      id: true,
      email: true,
      fullName: true,
      role: true,
      preferredLanguage: true,
      avatarUrl: true,
      createdAt: true,
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
