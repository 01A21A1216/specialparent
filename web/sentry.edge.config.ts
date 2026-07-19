// Sentry — Edge runtime (middleware, edge route handlers). Same shape as
// the Node.js server config. Kept as a separate entrypoint because Next.js
// bundles the edge runtime independently and needs its own init call.

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.APP_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.APP_VERSION,
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_RATE ?? '0'),
  });
}
