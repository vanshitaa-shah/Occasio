# Phase 8 — Production Deploy (Render, single Docker service)

Ship Occasio as **one always-on Docker web service**: the NestJS API, the send
worker and the Playwright/Chromium renderer, which also serves the built React SPA.
Not serverless — the worker runs continuously and Chromium needs a real OS.

## What was built

| Piece | Role |
| ----- | ---- |
| `Dockerfile` | Installs deps, builds shared → frontend → Prisma client → backend, installs Chromium for Playwright. On start: `prisma migrate deploy`, then `node backend/dist/main.js`. |
| `render.yaml` | Render blueprint: the web service (`/api/health` health check, generated `JWT_SECRET`, secrets set in the dashboard) and, since the queue work, a Redis instance. |
| `ServeStaticModule` in `app.module.ts` | Serves `frontend/dist` for everything outside `/api` — enabled only when the build exists, so local dev (Vite) is unaffected. |
| `main.ts` | Global `/api` prefix, `PORT` from env, CORS for the dev origin. |

## Key decisions

- **One container, same origin.** The SPA and API share a host, so there's no CORS
  or API-URL config in production, and the renderer loads
  `http://localhost:$PORT/render` — the service renders against itself
  (`RENDER_BASE_URL` stays unset).
- **Prisma binary targets** include the Debian OpenSSL target the image runs on.
- **Secrets stay out of git** — `DATABASE_URL`, email keys and `SMTP_FROM` are
  `sync: false` in `render.yaml` and set in the dashboard.

## Go-live steps

See [DEPLOY.md](../DEPLOY.md).
