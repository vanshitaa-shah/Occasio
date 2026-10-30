# Occasio backend

NestJS API + BullMQ send worker + Playwright renderer + mailer, all in one process.
See the [root README](../README.md) for setup and [CLAUDE.md](../CLAUDE.md) for architecture.

## Modules

| Module | Role |
| ------ | ---- |
| `auth/` | JWT register/login, `JwtAuthGuard`, `@CurrentUser()` |
| `cards/` | Card CRUD (`POST/GET/PATCH/DELETE /cards`, `POST /cards/:id/retry`), scoped per user |
| `queue/` | BullMQ delayed jobs, send worker (retry/backoff), reconciler safety net |
| `render/` | Playwright headless Chromium → PNG of `/render?design=…` |
| `mail/` | Brevo HTTP API (`BREVO_API_KEY`) or Nodemailer SMTP (Mailhog in dev) |
| `prisma/` | `PrismaService` (Prisma 7 + `@prisma/adapter-pg`); config in `prisma.config.ts` |

All routes are served under `/api`; the built SPA is served for everything else when present.

## Commands

Run from the repo root (see the root README for infra and env setup).

```bash
pnpm dev:backend                          # http://localhost:3001
pnpm --filter backend lint                # eslint --fix
pnpm --filter backend test:e2e            # jest with test/jest-e2e.json
```
