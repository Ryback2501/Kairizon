# Stage 1: All dependencies (needed for build)
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build
# When PREBUILT=true (CI release), artifacts are already in the build context —
# prisma generate still runs but npm run build is skipped.
# When PREBUILT=false (default, local), the full build runs from source.
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG PREBUILT=false
RUN ./node_modules/.bin/prisma generate
RUN if [ "$PREBUILT" != "true" ]; then npm run build; fi
RUN mkdir -p public

# Stage 3: Production-only node_modules
# Install everything so prisma generate can run, then prune devDeps.
FROM node:24-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN ./node_modules/.bin/prisma generate && npm prune --omit=dev --legacy-peer-deps

# Stage 4: Production runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache chromium

COPY --from=prod-deps /app/node_modules ./node_modules

# Option 1: remove SWC compiler binary (build-time only, not needed at runtime)
RUN find /app/node_modules/@next -name "*.node" -delete
# Option 2: remove Debian Prisma engine binary (not needed on Alpine/musl)
RUN find /app/node_modules -name "libquery_engine-debian*" -delete

COPY --from=builder /app/.next ./.next
RUN rm -rf /app/.next/dev /app/.next/cache
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=file:/app/data/${DATABASE_FILE:-kairizon.db} && node dist/server.js"]
