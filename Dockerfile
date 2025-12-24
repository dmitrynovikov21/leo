# syntax=docker/dockerfile:1

FROM node:20-slim AS base

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* pnpm-lock.yaml* ./
COPY prisma ./prisma/

RUN \
  if [ -f pnpm-lock.yaml ]; then \
    corepack enable pnpm && pnpm i; \
  elif [ -f package-lock.json ]; then \
    npm ci; \
  else \
    echo "No lockfile found." && exit 1; \
  fi


# Development image
FROM base AS development
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000
CMD ["npm", "run", "dev"]


# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION=1

# Copy .env.prod as .env for build (NEXT_PUBLIC_ vars are needed at build time)
RUN cp .env.prod .env || true

# Generate Prisma Client
RUN npx prisma generate

# Build the application
RUN npm run build


# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Standalone output includes all needed node_modules (including Prisma)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
