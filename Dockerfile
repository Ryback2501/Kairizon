# Stage 1: All dependencies (needed for build)
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

# Stage 3: Production-only node_modules
FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --legacy-peer-deps
COPY prisma ./prisma
RUN ./node_modules/.bin/prisma generate

# Stage 4: Production runner (slim Node + Chromium only)
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY --from=prod-deps /app/node_modules ./node_modules
RUN ./node_modules/.bin/playwright install --with-deps chromium

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=file:/app/data/${DATABASE_FILE:-kairizon.db} && ./node_modules/.bin/prisma db push && node dist/server.js"]
