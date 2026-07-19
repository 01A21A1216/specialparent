import {
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { GlobalExceptionFilter } from './global-exception.filter';

// The filter is the single boundary between server errors and the outside
// world. Every mapping change is a public API change — pin the behaviour.

describe('GlobalExceptionFilter', () => {
  const buildHost = () => {
    const reply = jest.fn();
    const res = { status: jest.fn().mockReturnThis() };
    const req = { method: 'GET', url: '/api/x' };
    const host = {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => req,
      }),
    } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
    return { host, reply, res, req };
  };

  const build = () => {
    const { host, reply } = buildHost();
    const filter = new GlobalExceptionFilter({
      httpAdapter: { reply },
    } as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    return { filter, host, reply };
  };

  it('passes an HttpException through with its status + message', () => {
    const { filter, host, reply } = build();
    filter.catch(new BadRequestException('bad'), host);
    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 400, message: 'bad' }),
      400,
    );
  });

  it('passes NotFoundException through as 404', () => {
    const { filter, host, reply } = build();
    filter.catch(new NotFoundException('nope'), host);
    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 404 }),
      404,
    );
  });

  it('joins array messages (class-validator shape) into a single string', () => {
    const { filter, host, reply } = build();
    filter.catch(
      new HttpException(
        { statusCode: 400, message: ['too short', 'must include a digit'] },
        400,
      ),
      host,
    );
    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        message: expect.stringContaining('too short, must include a digit'),
      }),
      400,
    );
  });

  it('maps Prisma P2002 (unique constraint) to 409', () => {
    const { filter, host, reply } = build();
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      }),
      host,
    );
    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 409 }),
      409,
    );
  });

  it('maps Prisma P2025 (not found) to 404', () => {
    const { filter, host, reply } = build();
    filter.catch(
      new Prisma.PrismaClientKnownRequestError('missing', {
        code: 'P2025',
        clientVersion: 'test',
      }),
      host,
    );
    expect(reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 404 }),
      404,
    );
  });

  it('never leaks stack traces on a generic Error; adds a correlationId', () => {
    const { filter, host, reply } = build();
    filter.catch(new Error('boom-with-stack'), host);
    const [, body, status] = reply.mock.calls[0];
    expect(status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(body.message).not.toMatch(/boom-with-stack/); // must be sanitized
    expect(body.correlationId).toMatch(/^[0-9a-f]{12}$/); // hex(6) → 12 chars
  });
});
