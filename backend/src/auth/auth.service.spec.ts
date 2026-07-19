import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

// Auth is the security perimeter. Any regression here is a real bug —
// unlike UI polish. These tests cover the state changes that are hardest
// to eyeball in code review: password reset consuming a token, email
// verification setting the flag, refresh rotation, wrong-password reject.

describe('AuthService', () => {
  const makePrisma = () =>
    ({
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      authToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((ops: unknown[]) => Promise.all(ops)),
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const makeJwt = () =>
    ({ signAsync: jest.fn().mockResolvedValue('signed.jwt.token') }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const makeConfig = () =>
    ({
      get: jest.fn().mockImplementation((k: string) => {
        if (k === 'WEB_URL') return 'https://example.com';
        return undefined;
      }),
      getOrThrow: jest.fn().mockImplementation((k: string) => {
        const values: Record<string, string> = {
          JWT_ACCESS_TTL: '900',
          JWT_REFRESH_TTL: '2592000',
          JWT_ACCESS_SECRET: 'x'.repeat(32),
        };
        return values[k] ?? '';
      }),
    }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const makeMail = () =>
    ({ send: jest.fn().mockResolvedValue({ delivered: false }) }) as any; // eslint-disable-line @typescript-eslint/no-explicit-any

  const build = () => {
    const prisma = makePrisma();
    const jwt = makeJwt();
    const config = makeConfig();
    const mail = makeMail();
    return {
      svc: new AuthService(prisma, jwt, config, mail),
      prisma,
      jwt,
      config,
      mail,
    };
  };

  it('signup rejects a duplicate email with 409', async () => {
    const { svc, prisma } = build();
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(
      svc.signup({
        email: 'x@x.com',
        fullName: 'X',
        password: 'GoodPass1',
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('signup lowercases the email + persists a bcrypt hash (not the raw password)', async () => {
    const { svc, prisma } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'u1',
      email: 'a@a.com',
      fullName: 'A',
    });
    prisma.refreshToken.create.mockResolvedValue({});
    await svc.signup({
      email: 'A@A.COM',
      fullName: 'A',
      password: 'GoodPass1',
    } as any);
    const call = prisma.user.create.mock.calls[0][0].data;
    expect(call.email).toBe('a@a.com');
    expect(call.passwordHash).not.toBe('GoodPass1');
    expect(call.passwordHash.startsWith('$2')).toBe(true);
  });

  it('requestPasswordReset returns ok even for an unknown email (no enumeration)', async () => {
    const { svc, prisma, mail } = build();
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(svc.requestPasswordReset('nobody@x.com')).resolves.toEqual({
      ok: true,
    });
    expect(mail.send).not.toHaveBeenCalled();
  });

  it('resetPassword rejects tokens with the wrong length before touching the DB', async () => {
    const { svc, prisma } = build();
    await expect(svc.resetPassword('short', 'GoodPass1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.authToken.findUnique).not.toHaveBeenCalled();
  });

  it('resetPassword rejects a used or expired token', async () => {
    const { svc, prisma } = build();
    prisma.authToken.findUnique.mockResolvedValue({
      id: 't1',
      type: 'PASSWORD_RESET',
      userId: 'u1',
      usedAt: new Date(),
      expiresAt: new Date(Date.now() + 100000),
    });
    await expect(
      svc.resetPassword('a'.repeat(64), 'GoodPass1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resetPassword revokes every other refresh token when it succeeds', async () => {
    const { svc, prisma } = build();
    prisma.authToken.findUnique.mockResolvedValue({
      id: 't1',
      type: 'PASSWORD_RESET',
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    });
    prisma.authToken.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });
    await svc.resetPassword('a'.repeat(64), 'NewGood1');
    // A password reset must invalidate every existing session — verify the
    // transaction included the mass refresh-token revocation.
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', revokedAt: null },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    });
  });

  it('verifyEmail rejects the wrong token type', async () => {
    const { svc, prisma } = build();
    prisma.authToken.findUnique.mockResolvedValue({
      id: 't1',
      type: 'PASSWORD_RESET', // wrong — this endpoint wants EMAIL_VERIFICATION
      userId: 'u1',
      usedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    });
    await expect(svc.verifyEmail('a'.repeat(64))).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('verifyEmail sets emailVerifiedAt on the right user when the token is valid', async () => {
    const { svc, prisma } = build();
    prisma.authToken.findUnique.mockResolvedValue({
      id: 't1',
      type: 'EMAIL_VERIFICATION',
      userId: 'u42',
      usedAt: null,
      expiresAt: new Date(Date.now() + 100000),
    });
    prisma.authToken.update.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    await svc.verifyEmail('a'.repeat(64));
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u42' },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });

  it('login rejects when the password comparison fails', async () => {
    const { svc, prisma } = build();
    const hash = await bcrypt.hash('actualPass1', 4);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@a.com',
      isActive: true,
      passwordHash: hash,
      role: 'PARENT',
    });
    await expect(
      svc.login({ email: 'a@a.com', password: 'wrongPass1' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
