# ── Stage 1: deps ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# ── Stage 2: production ────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS production

# Install LibreOffice for PPTX→PDF conversion + ClamAV for file scanning
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    libreoffice-impress \
    libreoffice-writer \
    libreoffice-common \
    clamav \
    clamav-daemon \
    curl \
    && update-ca-certificates \
    && freshclam --quiet || true \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy production node_modules from deps stage (no devDependencies)
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Create upload directories with correct permissions
RUN mkdir -p uploads/slides uploads/pdfs uploads/thumbnails uploads/slideo-previews \
    && chown -R node:node /app

# Generate Prisma client
RUN npx prisma generate

# Switch to non-root user
USER node

EXPOSE 5001

# Health check built into the image
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5001/api/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "run", "start"]
