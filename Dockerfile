# Stage 1: Install dependencies
FROM node:24-bookworm-slim AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# Stage 2: Build + download Playwright Chromium browser
FROM node:24-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Store the browser binary inside the project so it can be copied to the runner
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers

RUN npx prisma generate
RUN npm run build
RUN npx playwright install chromium

# Stage 3: Production runner
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright-browsers

# Copy node_modules first — needed to run the playwright CLI below
COPY --from=builder /app/node_modules ./node_modules

# Install Chromium system dependencies (libX11, libnss3, libatk, etc.)
# Must run as root before switching to the app user
RUN apt-get update \
  && npx playwright install-deps chromium \
  && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.playwright-browsers ./.playwright-browsers

RUN chown -R nextjs:nodejs /app/.playwright-browsers \
  && mkdir -p /app/data && chown nextjs:nodejs /app/data

USER nextjs

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/server.js"]
