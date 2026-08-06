# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Occasio is

Design a greeting card on a canvas → schedule it → have it **emailed as a PNG**, re-rendered
server-side so it arrives pixel-identical to the UI (email clients can't run `<canvas>`). The
core architectural constraint that drives everything: **store the design as JSON, re-render to
an image at send time** — never snapshot the browser at submit time. This keeps the render
authoritative and lets cards be previewed/edited/cancelled before they send.

## Commands

Run from the repo root (pnpm workspace monorepo; Node >= 22, pnpm >= 10, Docker required).

```bash
pnpm install                    # install all workspaces
cp .env.example .env && cp .env.example backend/.env   # backend reads its OWN .env
pnpm infra:up                   # Postgres + Mailhog (Mailhog UI: http://localhost:8025)
pnpm infra:down
pnpm db:migrate                 # prisma migrate dev
pnpm db:generate                # regenerate Prisma client after schema.prisma edits
pnpm dev:backend                # http://localhost:3001  (backend runs on 3001, NOT 3000)
pnpm dev:frontend               # http://localhost:5173
pnpm -r build                   # builds shared → backend → frontend in topological order
```

Per-workspace:

```bash
pnpm --filter frontend lint     # oxlint
pnpm --filter backend lint      # eslint --fix
pnpm --filter backend test      # jest (unit)
pnpm --filter backend test -- cards.service   # single test file by name pattern
pnpm --filter backend test:e2e  # jest with test/jest-e2e.json
```

**Always `pnpm -r build` (or build `@occasio/shared`) before running backend/frontend after
editing `shared/`** — both consume its compiled `dist/`, not the source.

## Architecture

Three workspaces, one shared contract:

- **`shared/`** (`@occasio/shared`) — the single source of truth. `canvas.ts` defines
  `CanvasDesign` (theme + shapes + texts, JSON-only, versioned) plus `THEMES` and
  `createDefaultDesign()`; `dto.ts` defines the API contract (`CreateCardDto`, `CardResponse`,
  `CardStatus`). It is **CommonJS with `.d.ts`** so both NestJS (CJS) and Vite (bundler) consume
  it without interop friction. Everything about "what a card is" lives here — change it here, not
  in a workspace copy.
- **`frontend/`** — React 19 + Vite + Tailwind v3 + react-konva. Three routes (`main.tsx`):
  `/` (`EditorPage`; `/?edit=<id>` re-opens a PENDING card to edit its full design +
  recipient + time, saving via `PATCH`), `/scheduled` (`ScheduledPage` — status list +
  cancel/retry, Edit links to the editor), and `/render` (`RenderPage`, the headless-render
  target).
- **`backend/`** — NestJS. API + scheduler + render + mail all run **in one process** for v1.

### The CanvasRenderer is the crux

[frontend/src/components/CanvasRenderer.tsx](frontend/src/components/CanvasRenderer.tsx) is the
**one** component that turns a `CanvasDesign` into pixels, used two ways:

1. Interactively in `EditorPage` (draggable/selectable, transformer shown).
2. Statically on the `/render` route, which the backend's Playwright headless browser loads at
   send time to screenshot. It sets `window.__OCCASIO_READY__` once painted so the screenshot
   captures a fully-rendered canvas.

Because both paths share this component, the emailed image is guaranteed identical to the editor.
**Every element is anchored by its CENTER `(x, y)`** so drag/transform behaves uniformly across
shape kinds and text. Preserve that invariant when adding elements.

### The send pipeline (implemented — Phase 3)

`SchedulerService`, `RenderService`, and `MailService` are the send pipeline, each behind a
single-method seam so the mechanism can change without touching callers:

- `SchedulerService` polls `(status, sendAt)` every `SCHEDULER_POLL_MS` (default 60s; indexed in
  the schema). Each cycle is guarded (`running` flag) so a slow cycle can't overlap the next. It
  is written behind a `CardScheduler` interface so a durable-timer backend (e.g. Temporal) can
  drop in later. On error a card is marked `FAILED` (retry/backoff is Phase 4).
- `RenderService.render(design) → Buffer` drives Playwright headless Chromium: one reused browser,
  a fresh `context` per job, loads `${RENDER_BASE_URL}/render?design=…`, waits for
  `window.__OCCASIO_READY__`, screenshots the canvas at `deviceScaleFactor: 2`. **Requires the
  frontend to be served** at `RENDER_BASE_URL` (Vite dev server in dev).
- `MailService.sendCard()` sends via Nodemailer to SMTP (`SMTP_HOST`/`SMTP_PORT`, Mailhog in dev),
  embedding the PNG inline via a `cid`.

Pipeline DB helpers live in `cards.service` (`findDue`, `markSent`, `markFailed`, `designOf`), not
in the scheduler. The `Card` CRUD API (`cards.controller` / `cards.service`) is also real.

### Data flow

Editor serializes `CanvasDesign` → `POST /cards` stores `Card { design: Json, recipient, sendAt,
status: PENDING }` in Postgres → scheduler finds due PENDING cards → render to PNG → email → mark
`SENT`/`FAILED`. The design JSON round-trips verbatim through the DB (`Prisma.InputJsonValue`).

## Conventions

- **Modular components; keep each file under ~250 lines.** When a component grows past that,
  extract sub-components or pull logic into a custom hook. (`CanvasRenderer.tsx` is the one file
  over the line, and it already splits into internal `ShapeNode`/`TextNode` — follow that pattern
  rather than growing a single function.)
- **Custom hooks when business logic outweighs markup.** If a component accumulates non-trivial
  state derivation, effects, or data logic, move it into a `use*` hook so the component stays
  presentational. `EditorPage` currently holds design state inline; extract to a hook if it grows.
- **`CanvasDesign` stays JSON-serializable** — no functions or class instances. It is stored
  verbatim and rebuilt in a headless browser; anything non-serializable breaks the render.
- **Types come from `@occasio/shared`.** Never redefine card/design/DTO shapes in a workspace.
  Frontend imports as `@occasio/shared`; backend maps Prisma rows to `CardResponse` via a
  `toResponse` helper (Prisma `Json` ⇄ `CanvasDesign` cast lives only there).
- **Backend validation** uses `class-validator` DTOs (`CreateCardBody`) with a global
  `ValidationPipe({ whitelist: true, transform: true })`. Add validation there, not in services.
- Frontend lints with **oxlint**, backend with **eslint + prettier**. Match the existing style of
  the file you're editing.

## Version pins that matter

- **Prisma pinned to v6** (v7's ESM client generator conflicts with NestJS CommonJS).
- **Tailwind pinned to v3** (classic `tailwind.config.js` + PostCSS; v4 changes the config model).
- **Backend on port 3001**, not 3000 (3000 is occupied on the dev machine) — reflected in `.env`,
  `frontend/src/lib/api.ts`, and README.

## Roadmap context

Phases 1–5 are done — see [phases/](phases/): Phase 1 (scaffold + infra + Card model + stubs),
Phase 2 (editor + schedule form + `POST /cards`), Phase 3 (render/mail/poll pipeline), Phase 4
(scheduled-cards status UI + cancel/retry: `DELETE /cards/:id`, `POST /cards/:id/retry`,
`PATCH /cards/:id`), Phase 5 (edit a PENDING card's full canvas — Edit re-opens it in the
editor and saves via `PATCH`, replacing the old email/date-only inline edit). Still
optional/future: automatic retry+backoff, swap node-cron → Temporal and Mailhog → a real email
provider (both already behind their seams).
