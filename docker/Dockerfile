# -------- Build Stage --------
FROM node:20-alpine AS build

WORKDIR /app

# Install dependencies required by Prisma
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy project
COPY . .

# Generate Prisma client
RUN pnpm prisma generate

# Build NestJS
RUN pnpm build


# -------- Production Stage --------
FROM node:20-alpine

WORKDIR /app

# Install required runtime deps
RUN apk add --no-cache openssl

# Install pnpm
RUN npm install -g pnpm

# Copy dependency files
COPY package.json pnpm-lock.yaml ./

# Install production deps
RUN pnpm install --prod --frozen-lockfile

# Copy build output
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules ./node_modules

EXPOSE 8000

CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
