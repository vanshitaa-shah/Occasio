# Phase 5 — Edit a Scheduled Card's Canvas

Phase 4 only let you edit a scheduled card's email + date. Phase 5 lets you
re-open the **full design** in the editor, change anything (theme, shapes,
title/subtitle) plus recipient/time, and save it back to the same card. The
backend `PATCH /cards/:id` already accepted `design`, so this is a
frontend-flow change — no backend work.

## Flow

```
/scheduled → Edit (on a PENDING card)
  → navigate to /?edit=<id>
  → EditorPage fetches the card, loads its design into the canvas,
    shows an "Editing scheduled card" banner, prefills recipient + time
  → user edits canvas / recipient / time
  → "Save changes" → PATCH /cards/:id { recipient, sendAt, design }
  → navigate back to /scheduled
```

## What changed (frontend only)

| File | Change |
| ---- | ------ |
| `hooks/useCardDesign.ts` | `load(design)` — replace the working design (used when opening a card to edit). |
| `hooks/useScheduleCard.ts` | Takes optional `editing` + `onSaved`. Prefills recipient/time (effect keyed on card id), and submits via `PATCH` when editing, `POST` otherwise — always sending the current design. |
| `components/ScheduleForm.tsx` | Button reflects mode ("Save changes" vs "Schedule card"); takes `editing`/`onSaved`. |
| `pages/EditorPage.tsx` | Reads `?edit=<id>`; fetches + `load`s the card, sets edit state, shows the banner with a "Start a new card" exit; resets to a fresh design when leaving edit mode; navigates to `/scheduled` on save. |
| `components/scheduled/ScheduledCard.tsx` | **Edit** now navigates to `/?edit=<id>` (opens the editor). |

## Key decisions

- **One place to edit everything.** The inline email/date-only form
  (`ScheduledCardEdit`) is gone; the editor is the single edit surface for
  design + recipient + time. Removed the now-unused component and the
  `update` action from `useScheduledCards`.
- **`?edit=<id>` in the URL**, not router state — the edit link is
  refresh-safe and shareable; the editor fetches the card by id.
- **Same controlled editor, create vs edit by presence of an id** — reuses the
  entire editor and schedule form; only the submit verb and button label differ.
- **Editing is PENDING-only** (enforced by the backend `PATCH` guard); SENT/FAILED
  cards show no Edit.

## Verified (Playwright, real UI + API)

Created a card (sunset, 1 circle, `orig@test.com`), clicked Edit on `/scheduled`,
switched theme to Forest, added a Star, changed the recipient, saved. Result via
API on the **same card id**:

- recipient `orig@test.com` → `edited-canvas@test.com`
- theme `sunset` → `forest`
- shapes `1` → `2` (circle, star)
- still `PENDING`; **no duplicate** created (it was a PATCH)

Screenshot confirmed the edit banner, loaded canvas, "Update scheduled card"
panel with prefilled fields, and "Save changes".

## Status

v1 loop with full editing: **design → schedule → manage → edit (design/email/time)
→ render → email.**
