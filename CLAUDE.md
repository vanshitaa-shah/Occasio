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
pnpm infra:up                   # Postgres + Redis + Mailhog (Mailhog UI: http://localhost:8025)
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
pnpm --filter backend test:e2e  # jest with test/jest-e2e.json (there are no unit tests yet)
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
- **`frontend/`** — React 19 + Vite + Tailwind v4 + react-konva. Routes (`main.tsx`): `/`
  (`EditorPage`; `/?edit=<id>` re-opens a PENDING card to edit its full design + recipient +
  time, saving via `PATCH`) and `/scheduled` (`ScheduledPage`) are **protected** by
  `RequireAuth`; `/login` + `/register` (`AuthPage`) are public; `/render` (`RenderPage`, the
  headless-render target) is public. An `AuthLayout` root route wraps everything in
  `AuthProvider` (`useAuth`); the token + user live in `localStorage` (`authStorage`) and the
  API client attaches `Authorization: Bearer` and bounces to `/login` on a 401.
- **`backend/`** — NestJS. Auth (JWT) + API + queue worker + render + mail all run **in one
  process**.

### Auth & ownership

`AuthModule` (JWT via `@nestjs/jwt`, passwords hashed with `bcryptjs`) exposes `POST
/auth/register` and `/auth/login` → `{ token, user }`. `JwtAuthGuard` + the `@CurrentUser()`
decorator protect the `Card` API; **every card is owned by a `User`** and all card queries are
scoped by `userId` (you only ever see/act on your own cards). `JWT_SECRET` comes from env. The
`/render` route stays unauthenticated so the headless browser can load it.

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

### The send pipeline

`CardQueueService`, `SendWorkerService`, `ReconcilerService` (in `backend/src/queue/`),
`RenderService` and `MailService` are the send pipeline:

- `CardQueueService` owns the BullMQ `card-send` queue (Redis, `REDIS_URL`). Each card gets one
  delayed job (`jobId = card.id`, fires at `sendAt`); `CardsService` enqueues on create/retry,
  reschedules on edit and removes on cancel. Failed sends retry with exponential backoff
  (`SEND_MAX_ATTEMPTS`, `SEND_BACKOFF_MS`).
- `SendWorkerService` drains the queue (`SEND_WORKER_CONCURRENCY`): atomically claims the card
  (`PENDING`/`SENDING` → `SENDING`, the double-send guard) → render → mail → `markSent`. A card is
  marked `FAILED` only after its final attempt.
- `ReconcilerService` is the safety net: on boot it enqueues every `PENDING` card that has no job,
  then sweeps every `RECONCILE_INTERVAL_MS` for cards due within `RECONCILE_LOOKAHEAD_MS`
  (covers Redis restarts / lost jobs).
- `RenderService.render(design, sentBy) → Buffer` drives Playwright headless Chromium: one reused
  browser, a fresh `context` per job (capped by `RENDER_CONCURRENCY`), loads
  `${RENDER_BASE_URL}/render?design=…`, waits for `window.__OCCASIO_READY__`, screenshots the
  canvas at `deviceScaleFactor: 2`. **Requires the frontend to be served** at `RENDER_BASE_URL`
  (Vite dev server in dev; the backend serves the built SPA in production).
- `MailService.sendCard()` sends via Brevo's HTTP API when `BREVO_API_KEY` is set, otherwise
  Nodemailer over SMTP (`SMTP_HOST`/`SMTP_PORT` + optional `SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`;
  Mailhog in dev), embedding the PNG inline via a `cid`. You can't send **as** an arbitrary user
  (SPF/DKIM/DMARC), so `From` is a fixed verified sender (`SMTP_FROM`), `Reply-To` is the owner's
  email, and the owner is shown via the "Sent by" footer baked into the card image. `To` is the
  card's `recipient`.

Pipeline DB helpers live in `cards.service` (`findForSend`, `findPendingDueSoon`, `markSending`,
`markSent`, `markFailed`, `designOf`), not in the queue services. The `Card` CRUD API
(`cards.controller` / `cards.service`) is also real.

### Data flow

Editor serializes `CanvasDesign` → `POST /cards` stores `Card { design: Json, recipient, sendAt,
status: PENDING }` in Postgres → a delayed queue job fires at `sendAt` → render to PNG → email → mark
`SENT`/`FAILED` (via `SENDING`). The design JSON round-trips verbatim through the DB (`Prisma.InputJsonValue`).

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

- **Prisma v7** with the `prisma-client-js` generator: the datasource URL lives in `backend/prisma.config.ts` (not `schema.prisma`) and `PrismaService` passes a `@prisma/adapter-pg` driver adapter.
- **Tailwind v4** via `@tailwindcss/vite` (CSS-first: `@import "tailwindcss"` in `index.css`, no `tailwind.config.js`/PostCSS).
- **TypeScript**: backend stays on 6.x (Nest CLI + typescript-eslint need the compiler API until TS 7.1); frontend/shared use 7.x. Node >= 22.22.3 (Nest CLI 12).
- **Backend on port 3001**, not 3000 (3000 is occupied on the dev machine) — reflected in `.env`,
  `frontend/src/lib/api.ts`, and README.

## Roadmap context

Phases 1–10 are documented in [phases/](phases/): scaffold + infra, editor + schedule form,
render/mail pipeline, scheduled-cards UI (cancel/retry/edit), editing a PENDING card's full canvas,
JWT auth + per-user ownership, real SMTP sending with a "Sent by" footer, Render single-container
deploy ([DEPLOY.md](DEPLOY.md)), Brevo HTTP API sending, and the durable BullMQ/Redis send queue
(which replaced the Phase 3 polling scheduler).
