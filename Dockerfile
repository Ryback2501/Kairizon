# Stage 1: Production dependencies only
FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps

# Stage 2: All dependencies (needed for build)
FROM node:24-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 3: Build
# When PREBUILT=true (CI release), artifacts are already in the build context —
# prisma generate still runs but npm run build is skipped.
# When PREBUILT=false (default, local), the full build runs from source.
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG PREBUILT=false
RUN npx prisma generate
RUN if [ "$PREBUILT" != "true" ]; then npm run build; fi

# Stage 4: Production runner (Playwright base includes Chromium + all system deps)
FROM mcr.microsoft.com/playwright:v1.59.1-noble AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Create non-root user
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=file:./data/${DATABASE_FILE:-kairizon.db} && npx prisma db push && node dist/server.js"]
