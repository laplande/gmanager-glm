# GManager Web Application - Production Dockerfile
# Multi-stage build for optimized image size with pnpm monorepo support

# ============================================================================
# Stage 1: Builder - Build the application with native dependencies
# ============================================================================
FROM node:20-alpine AS builder

# Install build dependencies for better-sqlite3 native module compilation
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    gcc \
    sqlite-dev

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Set working directory
WORKDIR /build

# Copy workspace configuration files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package.json files for proper dependency resolution
COPY packages/shared/package.json ./packages/shared/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/parser/package.json ./packages/parser/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install dependencies
# Using frozen-lockfile to ensure reproducible builds
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/
COPY tsconfig.base.json ./

# Build packages first (respecting monorepo dependencies)
RUN pnpm --filter './packages/**' build

# Build web application (frontend + backend server)
WORKDIR /build/apps/web
RUN pnpm run build && pnpm run server:build

# ============================================================================
# Stage 2: Runtime - Minimal production image
# ============================================================================
FROM node:20-alpine AS runtime

# Install runtime dependencies for better-sqlite3
RUN apk add --no-cache sqlite-libs

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Create app directory
WORKDIR /app

# Copy workspace configuration for production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/crypto/package.json ./packages/crypto/
COPY packages/parser/package.json ./packages/parser/
COPY packages/ui/package.json ./packages/ui/
COPY apps/web/package.json ./apps/web/

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built artifacts from builder stage
COPY --from=builder /build/packages/shared/dist ./packages/shared/dist
COPY --from=builder /build/packages/crypto/dist ./packages/crypto/dist
COPY --from=builder /build/packages/parser/dist ./packages/parser/dist
COPY --from=builder /build/packages/ui/dist ./packages/ui/dist
COPY --from=builder /build/apps/web/dist ./apps/web/dist

# Copy package.json files for ESM module resolution
COPY --from=builder /build/packages/shared/package.json ./packages/shared/
COPY --from=builder /build/packages/crypto/package.json ./packages/crypto/
COPY --from=builder /build/packages/parser/package.json ./packages/parser/
COPY --from=builder /build/packages/ui/package.json ./packages/ui/

# Create data directory for SQLite database with proper permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

# Set working directory to web app
WORKDIR /app/apps/web

# Switch to non-root user for security
USER node

# Expose application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/gmanager.db

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Start the server
CMD ["node", "dist/server/index.js"]
