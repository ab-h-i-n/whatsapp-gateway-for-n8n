# Production-ready Dockerfile with multi-stage build
# Stage 1: Base image with common settings
FROM node:18-slim AS base

# Set up the application directory
WORKDIR /app

# Install system dependencies for Puppeteer/Chromium
RUN apt-get update && apt-get install -yq \
    chromium \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libgtk-3-0 \
    libgbm-dev \
    libasound2 \
    curl \
    # Clean up
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* 

# Stage 2: Build and dependencies
FROM base AS build

# Copy dependency manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Stage 3: Final image
FROM base

# Set NODE_ENV
ENV NODE_ENV=production

# Create app directory with proper permissions
WORKDIR /app

# Create a non-root user
RUN groupadd -r whatsapp && useradd -r -g whatsapp whatsapp \
    && mkdir -p /app/logs \
    && chown -R whatsapp:whatsapp /app

# Copy dependencies from build stage
COPY --from=build /app/node_modules ./node_modules

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/logs

# Change to non-root user
USER whatsapp

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Define command to run app
CMD ["node", "server.js"]