import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/node';

// Feature-flagged Sentry init. Called once at boot before Nest starts. When
// SENTRY_DSN isn't set we no-op cleanly. When it is, we attach basic node
// integrations and expose Sentry via the module namespace for the exception
// filter to call captureException.

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return false;
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    // Traces off by default to keep event volume predictable. Bump when
    // real perf data is needed.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0'),
    release: process.env.npm_package_version,
  });
  initialized = true;
  new Logger('Sentry').log(`Error reporting enabled (env=${process.env.NODE_ENV ?? 'development'})`);
  return true;
}

export function captureError(err: unknown, ctx?: Record<string, unknown>): string | undefined {
  if (!initialized) return undefined;
  try {
    return Sentry.captureException(err, ctx ? { extra: ctx } : undefined);
  } catch {
    return undefined;
  }
}
