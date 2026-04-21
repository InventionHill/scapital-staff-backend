# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

# Skip downloading Chromium during install (we install it separately in prod stage)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Copy dependency manifests first for better layer caching
COPY package.json yarn.lock ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDeps needed for building)
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the NestJS application
RUN yarn build

# ── Stage 2: Production ────────────────────────────────────────
FROM node:20-slim AS production

WORKDIR /app

# Install Chromium + minimal dependencies for Puppeteer in production
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system-installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

# Copy dependency manifests
COPY package.json yarn.lock start.sh ./
COPY prisma ./prisma/

# Install production dependencies only
RUN yarn install --frozen-lockfile --production && \
    npx prisma generate && \
    yarn cache clean && \
    chmod +x start.sh

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["./start.sh"]
