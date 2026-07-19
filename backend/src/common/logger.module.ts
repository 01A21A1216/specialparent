import { Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import type { IncomingMessage } from 'http';
import * as crypto from 'crypto';

// Structured logging via pino:
//   • Production → single-line JSON, machine-parseable, log-aggregator ready
//   • Development → pino-pretty, human-readable, colourised
//
// Every request gets a correlationId (existing `x-correlation-id` header
// respected; otherwise we mint one). It flows into every log line for that
// request AND into the ErrorBoundary correlationId returned to the client on
// 5xx (so an operator can grep logs for the id a user reports).
//
// Sensitive fields are redacted at serialization time so a request body
// containing a password / token never lands in a log line.

const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.currentPassword',
  'req.body.newPassword',
  'req.body.refreshToken',
  'req.body.token',
  '*.passwordHash',
  '*.tokenHash',
];

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : {
                target: 'pino-pretty',
                options: {
                  singleLine: true,
                  translateTime: 'HH:MM:ss.l',
                  ignore: 'pid,hostname,req,res',
                  colorize: true,
                },
              },
        redact: {
          paths: REDACT_PATHS,
          censor: '[REDACTED]',
        },
        genReqId: (req: IncomingMessage) => {
          const incoming = req.headers['x-correlation-id'];
          const id = Array.isArray(incoming) ? incoming[0] : incoming;
          return id && /^[a-zA-Z0-9-_]{4,64}$/.test(id)
            ? id
            : crypto.randomBytes(6).toString('hex');
        },
        customLogLevel: (req, res, err) => {
          if (err || (res.statusCode ?? 200) >= 500) return 'error';
          if ((res.statusCode ?? 200) >= 400) return 'warn';
          if ((res.statusCode ?? 200) >= 300) return 'silent';
          return 'info';
        },
        // Compact serializers — no request/response body noise by default.
        serializers: {
          req: (req: { id: string; method: string; url: string }) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
          res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
