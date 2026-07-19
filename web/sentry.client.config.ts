// Sentry — browser side. Loads only when NEXT_PUBLIC_SENTRY_DSN is set,
// so local dev without a DSN is fully quiet. Session replays are OFF by
// default (they're expensive and can leak child health data — decide
// deliberately when you turn them on).

import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? process.env.NODE_ENV ?? 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION,
    tracesSampleRate: parseFloat(process.env.NEXT_PUBLIC_SENTRY_TRACES_RATE ?? '0'),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Never phone home about noise from browser extensions or bots.
    ignoreErrors: [
      /ResizeObserver loop/,
      /chrome-extension:\/\//,
      'Non-Error promise rejection captured',
    ],
    beforeSend(event) {
      // Strip anything that looks like a JWT or a session cookie from the
      // request context before it leaves the browser.
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
}
