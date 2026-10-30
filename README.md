# Occasio

Design a greeting card on an interactive canvas — pick a theme, drop in fun
shapes, edit the title/subtitle — then schedule it to be **emailed as an image**
to a recipient at a chosen date and time. The card is re-rendered server-side
with a headless browser so it arrives **pixel-for-pixel as it looked in the UI**
(email clients can't run a `<canvas>`).

> Example: wish `xyz@test.com` a happy birthday at 2:00 AM on 25 Jul — customize
> the template, save it, and Occasio delivers the rendered card at that moment.

## Stack

| Concern            | Choice                                                        |
| ------------------ | ------------------------------------------------------------- |
| Repo               | pnpm workspace monorepo (`frontend/`, `backend/`, `shared/`)  |
| Frontend           | React + Vite + TypeScript + Tailwind CSS                      |
| Canvas editor      | react-konva (serializes the scene to JSON)                    |
| Backend            | NestJS + TypeScript (API + queue worker in one process)       |
| Auth               | JWT (register/login), per-user card ownership                 |
| Database           | PostgreSQL + Prisma                                           |
| Send queue         | BullMQ delayed jobs on Redis, plus a reconciler safety net    |
| Send-time render   | Playwright headless Chromium → PNG                            |
| Email              | Nodemailer → Mailhog locally; Brevo HTTP API in production    |
| Shared types       | `@occasio/shared` — canvas JSON schema + DTOs                 |

## Prerequisites

- Node >= 22, pnpm >= 10, Docker

## Getting started

```bash
# 1. install all workspaces
pnpm install

# 2. env
cp .env.example .env
cp .env.example backend/.env   # backend reads its own .env

# 3. infra (Postgres + Redis + Mailhog)
pnpm infra:up                  # Mailhog UI: http://localhost:8025

# 4. database
pnpm db:migrate

# 5. run
pnpm dev:backend               # http://localhost:3001  (GET /health -> {status:"ok"})
pnpm dev:frontend              # http://localhost:5173
```

## What's implemented

- Canvas editor (themes, shapes, title/subtitle) + schedule form.
- Register/login; every card is owned by a user and scoped to them.
- Scheduled-cards page: live previews, status, edit (full canvas), cancel, retry.
- Send pipeline: a BullMQ delayed job per card → Playwright render → email
  (with a "Sent by" footer baked into the image), automatic retry with
  exponential backoff, `FAILED` once attempts are exhausted.
- Single-container Docker deploy (see [DEPLOY.md](DEPLOY.md)).

Per-phase notes live in [phases/](phases/).
