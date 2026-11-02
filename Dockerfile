# ─── Multi-Stage Dockerfile for Fack API's ────────────────────────────────────
# Optimized for Next.js standalone output, pnpm workspace, and minimal Alpine footprint

# ─── Stage 1: Dependencies ────────────────────────────────────────────────────
FROM node:26-alpine AS deps
# Install libc6-compat for musl compatibility and pnpm globally
RUN apk add --no-cache libc6-compat && npm install -g pnpm
WORKDIR /app

# Copy root workspace manifests, lockfile, and subproject package manifests
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY docs/package.json ./docs/package.json

# Install dependencies deterministically using frozen lockfile
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Builder ─────────────────────────────────────────────────────────
FROM node:26-alpine AS builder
RUN apk add --no-cache libc6-compat && npm install -g pnpm
WORKDIR /app

# Copy resolved node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/docs/node_modules ./docs/node_modules
COPY . .

# Set environment for build optimization
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js application in standalone mode (output: "standalone" in next.config.ts)
RUN pnpm build

# ─── Stage 3: Runner ──────────────────────────────────────────────────────────
FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV DATABASE_URL="file:/data/fack.db"
ENV FACK_DATA_DIR="/data"

# Install libc6-compat for native sqlite/libsql bindings, configure non-root user and persistent directory
RUN apk add --no-cache libc6-compat \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && mkdir -p /data \
    && chown -R nextjs:nodejs /data

# Persistent storage mount for SQLite database and backups
VOLUME ["/data"]

# Copy standalone build output, static assets, and migration schemas
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle

# Switch to non-root user
USER nextjs

EXPOSE 3000

# Container healthcheck using built-in Node.js fetch (zero external binary dependencies)
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then((r) => process.exit(r.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

# Start Next.js standalone server
CMD ["node", "server.js"]
