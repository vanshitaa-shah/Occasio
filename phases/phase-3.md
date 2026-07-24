# Phase 3 — Render & Send Pipeline

Fill the three backend seams so a scheduled card actually gets rendered to an
image and emailed at its send time. The `Card` CRUD + editor from Phases 1–2 are
reused unchanged; this phase makes the stubs real.

## What was built (backend)

| File | Role |
| ---- | ---- |
| `src/render/render.service.ts` | Playwright headless Chromium → PNG. One reused browser, a fresh `context` per job; loads `${RENDER_BASE_URL}/render?design=…`, waits for `window.__OCCASIO_READY__`, screenshots the canvas at `deviceScaleFactor: 2`. Browser closed on module destroy. |
| `src/mail/mail.service.ts` | Nodemailer transport to SMTP (`SMTP_HOST`/`SMTP_PORT`); sends HTML with the PNG embedded inline via a `cid`. |
| `src/scheduler/scheduler.service.ts` | `tick()` — polls due cards, renders + sends each, marks `SENT`/`FAILED`. Overlap-guarded; interval from `SCHEDULER_POLL_MS` (default 60s). |
| `src/cards/cards.service.ts` | Pipeline DB helpers: `findDue(now)`, `markSent(id)`, `markFailed(id, error)`, `designOf(card)`. |

## Flow

```
scheduler tick (every SCHEDULER_POLL_MS)
  → cards.findDue(now)               // PENDING and sendAt <= now, oldest first
  → for each card (sequential):
      render.render(design)          // Playwright loads /render, waits __OCCASIO_READY__, screenshots → PNG
      mail.sendCard({to, subject, png})  // Nodemailer, PNG inline via cid → Mailhog
      cards.markSent(id)             // or markFailed(id, error) on throw
```

## Key decisions

- **Reuse one browser, isolate per job with `newContext()`** — matches the
  Playwright-over-Puppeteer rationale from Phase 1 (cheap per-job isolation for a
  long-lived worker). Browser is lazily launched and closed on shutdown.
- **Render at `deviceScaleFactor: 2`** → a crisp 1600×1200 PNG from the 800×600
  design (retina-quality email image).
- **The render page IS the shared `CanvasRenderer`** loaded via `/render` — the
  emailed image is produced by the exact same code as the editor preview.
- **Requires the frontend served at `RENDER_BASE_URL`** (Vite dev server in dev).
  This is the one runtime coupling; a bundled render target is a later concern.
- **DB access stays in `cards.service`**, not the scheduler — the scheduler
  orchestrates, the service owns Prisma.
- **`FAILED` on any render/send error** (no retry) — retry/backoff is Phase 4.
  Cycle is overlap-guarded so a slow render can't stack ticks.
- **`SCHEDULER_POLL_MS`** env knob (default 60000) so tests can poll fast.

## Verified (real pipeline, Mailhog)

Created a due card (`sendAt` in the past, forest theme + orange star, title
"Phase 3 OK") via `POST /cards`, ran the backend with `SCHEDULER_POLL_MS=3000`
and the frontend dev server up:

- card went `PENDING → SENT` within one poll cycle, `sentAt` set, `error` null;
- Mailhog received the email (subject "You have a card 🎉", PNG inline);
- extracted the attachment (matched by recipient): a **1600×1200 PNG** rendering
  the exact design — forest gradient, orange star, centered "Phase 3 OK" /
  "rendered + emailed". Screenshot matched the posted design pixel-for-pixel.

## Run (Node 22; frontend must be up for rendering)

```bash
pnpm infra:up
pnpm dev:frontend                          # :5173 — render target
SCHEDULER_POLL_MS=3000 pnpm dev:backend     # :3001 — fast poll for testing
# schedule a card in the UI (or POST /cards) with a near/past send time
# watch it land in Mailhog: http://localhost:8025
```

## Next — Phase 4

Preview/edit/cancel scheduled cards + a status list in the UI; retry/backoff on
`FAILED`; optionally swap node-cron → Temporal and Mailhog → a real email
provider (both already behind their seams).
