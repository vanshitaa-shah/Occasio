# Phase 4 — Manage Scheduled Cards (status UI + cancel / retry / edit)

Give the sender a way to see and manage what they've scheduled: a status list
with live previews, plus cancel, retry-on-failure, and edit-before-send. Builds
on the Phase 1–3 pipeline; no changes to render/mail.

## What was built

**shared** — `UpdateCardDto { recipient?, sendAt?, design? }`.

**backend** (`cards.controller` / `cards.service` + `UpdateCardBody`):

| Endpoint | Behavior |
| -------- | -------- |
| `PATCH /cards/:id` | Edit a **PENDING** card (recipient / sendAt / design). `409` if not PENDING. |
| `POST /cards/:id/retry` | Re-queue a **FAILED** card → PENDING, clears `error`. `409` if not FAILED. |
| `DELETE /cards/:id` | Cancel/remove a card. `204`; `404` if missing. |

State transitions are guarded in the service (`ConflictException` for invalid
ones); DB access stays in `cards.service`.

**frontend** (all files < 250 lines):

| File | Role |
| ---- | ---- |
| `pages/ScheduledPage.tsx` | `/scheduled` route: loads cards, grid of previews, loading/empty/error states, Refresh. |
| `hooks/useScheduledCards.ts` | Fetch list + `cancel` / `retry` / `update` actions, each refreshing the list. |
| `components/scheduled/ScheduledCard.tsx` | One card: preview thumbnail + status + recipient + time + actions; toggles inline edit. |
| `components/scheduled/ScheduledCardEdit.tsx` | Inline form to edit recipient + send time (future-time validated). |
| `components/scheduled/StatusBadge.tsx` | Colored PENDING / SENT / FAILED badge. |
| `components/AppHeader.tsx` | Shared header with Design / Scheduled nav (used by both pages). |
| `lib/datetime.ts` | `toLocalInput` (ISO → datetime-local) + `formatWhen`. |
| `lib/api.ts` | `updateCard`, `retryCard`, `deleteCard` (handles `204`). |

## Key decisions

- **Previews reuse the shared `CanvasRenderer`** at a small `scale` — the list
  thumbnail is the same code that renders the editor and the email, so what you
  see is what sends.
- **Actions are status-scoped**: PENDING → Edit + Cancel; FAILED → Retry +
  Remove (+ error shown); SENT → Remove. Enforced on the backend too.
- **Edit covers recipient + send time only** in this phase (re-opening the full
  design came in Phase 5); `PATCH` already accepts `design`.
- **Manual retry** in this phase: retry just flips FAILED → PENDING for the next poll.
- **`window.confirm` before delete** to avoid accidental cancels.
- Header extracted to `AppHeader` so the editor and list share nav.

## Verified (Playwright, real UI + API + DB)

Seeded PENDING cards and forced one to FAILED via the DB, then drove
`/scheduled`:

- 12 preview canvases rendered; badges correct (SENT/PENDING/FAILED).
- **Retry**: FAILED card → Retry → flipped to PENDING.
- **Edit**: changed a pending card's recipient → new address shown, old gone.
- **Cancel**: removed a card → gone, list count 12 → 11.
- No console errors. Screenshot confirms the grid, badges, per-status actions,
  and the failed card's error message.

## Run (Node 22; frontend up for previews/rendering)

```bash
pnpm infra:up
pnpm dev:frontend    # :5173  → visit /scheduled
pnpm dev:backend     # :3001
```

## Status

The v1 product loop is complete: **design → schedule → manage → render → email.**
