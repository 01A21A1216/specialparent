import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { captureError } from './sentry';

// Catches *everything* — HttpException, Prisma errors, plain JS Errors — and
// returns a stable JSON shape without ever leaking a stack trace to the
// client. Every non-4xx response gets a correlationId so an operator can grep
// logs and find the exact error a user hit.

interface ErrorBody {
  statusCode: number;
  message: string;
  correlationId?: string;
  errors?: unknown; // preserved for class-validator's array-of-messages shape
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ method?: string; url?: string; id?: string }>();
    const res = ctx.getResponse();

    const { status, body, isServerError } = this.mapException(exception);

    if (isServerError) {
      // Reuse pino-http's per-request id when present so the client-facing
      // correlationId matches every other log line for the same request.
      body.correlationId = req?.id ?? crypto.randomBytes(6).toString('hex');
      this.logger.error(
        `[${body.correlationId}] ${req?.method ?? '?'} ${req?.url ?? '?'} → ${status}: ${
          exception instanceof Error ? exception.stack : String(exception)
        }`,
      );
      // Best-effort Sentry report. No-op when SENTRY_DSN isn't configured.
      captureError(exception, {
        correlationId: body.correlationId,
        method: req?.method,
        url: req?.url,
      });
    } else if (status >= 400) {
      // 4xx: log at debug so we don't drown in noise, but keep visibility.
      this.logger.debug(
        `${req?.method ?? '?'} ${req?.url ?? '?'} → ${status}: ${body.message}`,
      );
    }

    httpAdapter.reply(res, body, status);
  }

  private mapException(exception: unknown): {
    status: number;
    body: ErrorBody;
    isServerError: boolean;
  } {
    // Nest / user-thrown HttpException — trust its status and payload.
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'string') {
        return {
          status,
          body: { statusCode: status, message: raw },
          isServerError: status >= 500,
        };
      }
      // Object response — spread the raw payload first (so extra fields like
      // `error` come through) and THEN normalise `message` on top so an array
      // shape from class-validator becomes a single string.
      const rawObj = raw as { message?: string | string[] };
      const message =
        rawObj.message === undefined
          ? exception.message
          : Array.isArray(rawObj.message)
            ? rawObj.message.join(', ')
            : String(rawObj.message);
      return {
        status,
        body: {
          ...(raw as Record<string, unknown>),
          statusCode: status,
          message,
        } as ErrorBody,
        isServerError: status >= 500,
      };
    }

    // Common Prisma failures mapped to sensible HTTP responses.
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': // unique constraint
          return {
            status: HttpStatus.CONFLICT,
            body: {
              statusCode: HttpStatus.CONFLICT,
              message: 'A record with these details already exists.',
            },
            isServerError: false,
          };
        case 'P2025': // not found
          return {
            status: HttpStatus.NOT_FOUND,
            body: {
              statusCode: HttpStatus.NOT_FOUND,
              message: 'Record not found.',
            },
            isServerError: false,
          };
        case 'P2003': // foreign key
          return {
            status: HttpStatus.BAD_REQUEST,
            body: {
              statusCode: HttpStatus.BAD_REQUEST,
              message: 'Referenced record does not exist.',
            },
            isServerError: false,
          };
      }
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid data shape for database operation.',
        },
        isServerError: false,
      };
    }

    // Everything else is treated as a 500. The client sees a generic message
    // + correlationId; the full stack goes to server logs only.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Something went wrong. Please try again.',
      },
      isServerError: true,
    };
  }
}
