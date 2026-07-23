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
| Backend            | NestJS + TypeScript (API + scheduler + worker in one process) |
| Database           | PostgreSQL + Prisma                                           |
| Scheduler          | node-cron polling (behind a `SchedulerService` abstraction)   |
| Send-time render   | Playwright headless Chromium → PNG                            |
| Email              | Nodemailer → Mailhog (local inbox)                            |
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

# 3. infra (Postgres + Mailhog)
pnpm infra:up                  # Mailhog UI: http://localhost:8025

# 4. database
pnpm db:migrate

# 5. run
pnpm dev:backend               # http://localhost:3001  (GET /health -> {status:"ok"})
pnpm dev:frontend              # http://localhost:5173
```

## Roadmap

- **Phase 1 (current):** monorepo scaffold, infra, Prisma `Card` model, NestJS
  boots with `/health`, Vite app with placeholder editor + render pages.
- **Phase 2:** canvas editor (themes, shapes, title/subtitle) + schedule form + `POST /cards`.
- **Phase 3:** Playwright render → Nodemailer send → node-cron poll marks SENT/FAILED.
- **Phase 4:** preview/edit/cancel, status UI; optional swap to Temporal + a real email provider.
