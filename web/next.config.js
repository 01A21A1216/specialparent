/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 'standalone' emits a self-contained .next/standalone/ dir with a minimal
  // node_modules — used by the production Dockerfile to build a ~200 MB
  // image instead of ~800 MB. No-op in dev.
  output: 'standalone',
  experimental: {
    typedRoutes: false,
  },
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${apiBase}/api/:path*`,
      },
    ];
  },
};

// Wrap with Sentry only when a DSN is present. Without one the wrap is
// still safe (Sentry init is a no-op) but skipping keeps the dev bundle
// lean and avoids Sentry's build-time console chatter. Source-map upload
// runs only when SENTRY_AUTH_TOKEN is set (typically in CI).
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  const { withSentryConfig } = require('@sentry/nextjs');
  module.exports = withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    authToken: process.env.SENTRY_AUTH_TOKEN,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    tunnelRoute: '/monitoring',
    disableLogger: true,
  });
} else {
  module.exports = nextConfig;
}
