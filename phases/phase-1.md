# Phase 1 — Stack & Scaffolding

Stand up a bootable monorepo skeleton for **Occasio** (design a card on a canvas →
schedule it → email it as an image rendered exactly as the UI). No feature logic
yet — just the folders, infra, and seams later phases fill.

## Stack (confirmed)

| Concern          | Choice                                                         |
| ---------------- | ------------------------------------------------------------- |
| Repo             | pnpm workspace monorepo — `shared/`, `backend/`, `frontend/`  |
| Frontend         | React + Vite + TypeScript + Tailwind (v3) + react-konva       |
| Backend          | NestJS (API + scheduler + worker in one process for v1)       |
| Database         | PostgreSQL + Prisma (v6)                                      |
| Scheduler        | node-cron style polling, behind a `SchedulerService` seam     |
| Send-time render | Playwright headless Chromium → PNG                            |
| Email            | Nodemailer → Mailhog (local SMTP inbox)                       |
| Shared types     | `@occasio/shared` — canvas JSON schema + DTOs (one source)    |

## End-to-end flow (target)

1. Frontend: pick theme + shapes + edit title/subtitle → serialize to `CanvasDesign` JSON.
2. Set recipient email + send date/time → `POST /cards`.
3. Backend stores `Card { design, recipient, sendAt, status: PENDING }` in Postgres.
4. Scheduler polls for due `PENDING` cards → Playwright renders `design` to PNG → Nodemailer emails it → mark `SENT`/`FAILED`.
5. Recipient receives the card as an image, pixel-identical to the UI.

**Core constraint:** email clients can't run `<canvas>`/complex CSS, so we store
JSON and re-render to an image server-side at send time (not a browser snapshot
at submit) — keeps the render authoritative and lets cards be edited/previewed.

## Structure

```
Occasio/
├── shared/src/   canvas.ts (CanvasDesign, THEMES, createDefaultDesign), dto.ts (CreateCardDto, CardResponse, CardStatus)
├── backend/src/  health.controller · prisma/ · cards/ (controller+service+dto) · scheduler/ · render/ · mail/
├── backend/prisma/schema.prisma   Card model + CardStatus enum
├── frontend/src/ main.tsx (router) · pages/EditorPage · pages/RenderPage · lib/api.ts
├── docker-compose.yml   postgres + mailhog
└── package.json · pnpm-workspace.yaml · .env.example · README.md
```

Seams stubbed behind interfaces (throw "not implemented until Phase 3"):
`SchedulerService` (poll loop, start/stop on lifecycle), `RenderService.render(design)→Buffer`,
`MailService.sendCard()`. `Card` API is real (create / findAll / findOne).

## Key decisions

- **Generators, not hand-written package.json** — `create-vite`, `@nestjs/cli`, `tailwindcss init -p`, `prisma`.
- **Playwright over Puppeteer** — official Docker image bundles fonts + system deps (avoids the classic wrong-font server render) and per-job `browser.newContext()` isolation suits a long-lived render worker. We only need Chromium; multi-browser was not the deciding factor.
- **Backend on port 3001** — port 3000 is occupied on this machine by another app. Reflected in `.env`, `.env.example`, `frontend/src/lib/api.ts`, README.
- **Prisma pinned to v6** — Prisma 7's new ESM client generator is awkward with NestJS CommonJS; v6 keeps `import { PrismaClient } from '@prisma/client'`.
- **Tailwind pinned to v3** — classic `tailwind.config.js` + PostCSS model (Tailwind 4 changes the config/plugin model).
- **Removed `baseUrl` + `ignoreDeprecations`** from the Nest-generated `tsconfig.json` — it targeted TS 6 but TS 5.9 was installed (invalid `ignoreDeprecations` value; `baseUrl` unused).
- **`@occasio/shared` is CommonJS** with `.d.ts` — consumed by both NestJS (CJS) and Vite (bundler) without ESM/CJS interop friction. Must build before backend/frontend (pnpm `-r` handles topo order).
- Scheduler polls on `(status, sendAt)` — indexed in the schema.

## Verified

- `pnpm -r build` — shared → backend → frontend compile in topological order.
- `docker compose up -d` — Postgres healthy, Mailhog UI on `:8025`.
- `prisma migrate dev` — `Card` table created.
- Backend boots on `:3001`; `GET /health` → `{"status":"ok"}`, `GET /cards` → `[]`.
- `POST /cards` persists as `PENDING` (design JSON round-trips through DB); invalid email → `400`.
- Frontend dev server serves `/` (editor) and `/render`.

## Run

```bash
pnpm install
cp .env.example .env && cp .env.example backend/.env
pnpm infra:up          # postgres + mailhog (Mailhog UI: http://localhost:8025)
pnpm db:migrate
pnpm dev:backend       # http://localhost:3001  (GET /health)
pnpm dev:frontend      # http://localhost:5173
```

## Next — Phase 2

react-konva editor (themes, shapes, editable title/subtitle) → serialize to
`CanvasDesign` → schedule form (recipient + date/time) → wire `POST /cards`.
