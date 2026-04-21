# Stage 1: All dependencies (needed for build and runtime)
FROM node:24-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build
# When PREBUILT=true (CI release), artifacts are already in the build context —
# prisma generate still runs but npm run build is skipped.
# When PREBUILT=false (default, local), the full build runs from source.
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG PREBUILT=false
RUN ./node_modules/.bin/prisma generate
RUN if [ "$PREBUILT" != "true" ]; then npm run build; fi
RUN mkdir -p public

# Stage 3: Production runner (Playwright base includes Chromium + all system deps)
FROM mcr.microsoft.com/playwright:v1.59.1-noble AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Create non-root user (--force/--non-unique tolerate GID/UID already existing in the base image)
RUN groupadd --force --system --gid 1001 nodejs \
  && (id -u nextjs > /dev/null 2>&1 || useradd --non-unique --system --uid 1001 --gid nodejs nextjs)

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=file:./data/${DATABASE_FILE:-kairizon.db} && ./node_modules/.bin/prisma db push && node dist/server.js"]
