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
# Remove .next artifacts not needed at runtime before runner copies this stage
RUN rm -rf /app/.next/dev /app/.next/cache /app/.next/trace /app/.next/trace-build /app/.next/types

# Stage 3: Production-only node_modules (pruned + cleaned)
# Install everything so prisma generate can run, prune devDeps, then strip
# runtime-unnecessary files — all before the runner copies from this stage.
FROM node:24-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts
RUN ./node_modules/.bin/prisma generate && npm prune --omit=dev --legacy-peer-deps
# Strip everything not needed at runtime (done here so the COPY into runner is already clean)
RUN find /app/node_modules/@next -name "*.node" -delete \
    && find /app/node_modules -name "libquery_engine-debian*" -delete \
    && find /app/node_modules/@prisma/client/runtime -name "query_compiler*" ! -name "*sqlite*" -delete \
    && rm -rf /app/node_modules/@prisma/client/generator-build \
              /app/node_modules/@prisma/client/scripts \
    && find /app/node_modules/@prisma/client/runtime -name "*.map" -delete \
    && rm -rf /app/node_modules/@types \
    && rm -rf /app/node_modules/.cache

# Stage 4: Production runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache chromium

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/dist ./dist

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=file:/app/data/${DATABASE_FILE:-kairizon.db} && node dist/server.js"]
