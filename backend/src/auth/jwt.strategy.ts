import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ACCESS_COOKIE_NAME } from './cookies';

interface JwtPayload {
  sub: string;
}

// Read access token from the sp_access httpOnly cookie first; fall back to the
// legacy Authorization header so tools like Swagger + curl still work.
function fromCookieOrHeader(req: Request): string | null {
  const fromCookie = req?.cookies?.[ACCESS_COOKIE_NAME];
  if (fromCookie) return fromCookie;
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: fromCookieOrHeader,
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid session');
    }
    return { id: user.id, email: user.email, role: user.role };
  }
}
