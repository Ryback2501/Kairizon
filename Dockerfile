# Stage 1: Build
FROM node:24-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ \
    && npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Production node_modules
FROM node:24-alpine AS prod-deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN apk add --no-cache python3 make g++ \
    && npm ci --omit=dev --legacy-peer-deps \
    && rm -rf /app/node_modules/.cache

# Stage 3: Production runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Install Chromium then strip GPU/display libs unused in headless --disable-gpu mode:
# - LLVM (~170MB) + Gallium (~40MB): Mesa software renderer (not loaded with --disable-gpu)
# - Python (~36MB): pulled in by at-spi2-core (accessibility), not used in headless scraping
RUN apk add --no-cache chromium \
    && rm -f /usr/lib/libLLVM.so.* /usr/lib/libgallium-*.so \
    && rm -rf /usr/lib/python3.12 \
    && rm -f /usr/lib/libpython3*.so*

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

RUN mkdir -p /app/data

EXPOSE 3000

CMD ["sh", "-c", "export DATABASE_URL=file:/app/data/${DATABASE_FILE:-kairizon.db} && node dist/server.js"]
