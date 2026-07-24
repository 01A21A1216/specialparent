# SpecialParents.in web — multi-stage build using Next.js standalone output.
# Final image is ~200 MB (Alpine + minimal runtime deps) vs ~800 MB if we
# copied full node_modules. Runs as an unprivileged user.

# ── deps: install everything once, cached until package.json changes ──────
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package*.json ./
# React 19 RC + Next 15 + @types/react 18 → peer dep mismatch, needs legacy resolver
RUN npm install --no-audit --no-fund --legacy-peer-deps

# ── build: compile Next.js in production mode ─────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# NEXT_PUBLIC_* are baked in at build time. Callers pass them as build args:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com …
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_SENTRY_DSN=
ARG NEXT_PUBLIC_APP_VERSION=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN
ENV NEXT_PUBLIC_APP_VERSION=$NEXT_PUBLIC_APP_VERSION

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── runtime: ship only .next/standalone + static + public ─────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user so a container escape doesn't grant root on the host.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# The standalone build bundles its own minimal node_modules; we still need
# to hand-copy /public and /.next/static because Next only inlines the
# server bundle in standalone.
COPY --from=build --chown=nextjs:nodejs /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Standalone builds emit their own entrypoint at server.js.
CMD ["node", "server.js"]
