# Occasio — single service: NestJS API + scheduler + Playwright render, and it
# also serves the built React SPA. One container renders against itself.
FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# 1) Install deps first for better layer caching (need all workspace manifests).
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile

# 2) Copy source and build: shared -> frontend -> backend (+ Prisma client).
COPY . .
RUN pnpm --filter @occasio/shared build \
 && pnpm --filter frontend build \
 && pnpm --filter backend exec prisma generate \
 && pnpm --filter backend build

# 3) Chromium + OS libraries for Playwright (matches the installed version).
RUN pnpm --filter backend exec playwright install --with-deps chromium

ENV NODE_ENV=production
# Render (and most hosts) inject $PORT; main.ts and the renderer honor it.
EXPOSE 3001

# Apply DB migrations, then start. The app serves the API under /api, serves the
# SPA for everything else, and Playwright renders http://localhost:$PORT/render.
CMD ["sh", "-c", "pnpm --filter backend exec prisma migrate deploy && node backend/dist/main.js"]
