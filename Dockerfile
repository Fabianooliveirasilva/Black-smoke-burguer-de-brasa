# syntax=docker/dockerfile:1.7
# Multi-stage build: deps → build → minimal non-root runtime (Next.js standalone).

FROM node:22-alpine AS base
RUN corepack enable && apk add --no-cache libc6-compat
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma.config.ts ./
COPY prisma ./prisma
# prisma generate (postinstall) reads DATABASE_URL from config; a placeholder is enough.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    DATABASE_URL=postgresql://build:build@localhost:5432/build pnpm install --frozen-lockfile

FROM base AS build
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate && pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 UPLOAD_DIR=/app/storage/uploads
RUN addgroup -S app && adduser -S app -G app && mkdir -p /app/storage/uploads && chown -R app:app /app/storage
COPY --from=build --chown=app:app /app/.next/standalone ./
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:3000/api/menu >/dev/null || exit 1
CMD ["node", "server.js"]
