# Phase 2 — Canvas Editor & Scheduling

Build the interactive card editor and the schedule flow: pick a theme, add fun
shapes, edit the title/subtitle, then schedule the card to an email + time,
persisting it via `POST /cards`. All work is frontend; the backend `POST /cards`
from Phase 1 is reused unchanged.

## What was built (frontend)

| File | Role |
| ---- | ---- |
| `src/components/CanvasRenderer.tsx` | **The one Konva renderer** — gradient theme bg, shapes, texts. Used by both the editor (interactive) and `/render` (static). Guarantees the email image === the UI. |
| `src/lib/shapes.ts` | Shape factory + defaults, heart SVG path, fill palette. |
| `src/components/Toolbar.tsx` | Theme picker (4 themes) + add-shape buttons (rect/circle/star/heart). |
| `src/components/PropertiesPanel.tsx` | Edit the selected element — text content/size/color/bold, or shape size/color/delete. |
| `src/components/ScheduleForm.tsx` | Recipient email + `datetime-local` → validates future time → `api.createCard`. |
| `src/pages/EditorPage.tsx` | Holds `design` + `selectedId` state; composes toolbar / canvas / panels. |
| `src/pages/RenderPage.tsx` | Parses `?design=` JSON, renders via `CanvasRenderer`, sets `window.__OCCASIO_READY__` (Phase 3 hook). |

## Key decisions

- **Single `CanvasRenderer` for editor + render page.** One code path means the
  scheduled email is pixel-identical to the editor. It takes an `interactive`
  flag; the editor passes selection/drag/transform callbacks, the render page
  passes only `onReady`.
- **Every element is anchored by its CENTER `(x, y)`** (texts via measured
  offset, shapes via Konva offset/natural center). Uniform drag + transformer
  behavior across all kinds; matches the shared defaults (`x = width/2`).
- **react-konva `Transformer` for shapes only** (resize + rotate). Text is
  drag-to-move + edited through the properties panel (no inline DOM overlay) —
  simpler and reliable for v1.
- **`window.__OCCASIO_READY__` readiness signal** set after first paint, typed
  in `vite-env.d.ts`. Phase 3's Playwright renderer waits on it before shooting.
- **`crypto.randomUUID()`** for new shape ids (browser-native).

## Fixes made during the phase

- **Vite dev couldn't resolve `@occasio/shared` named exports** (`THEMES`) —
  the shared package is CommonJS and Vite skips pre-bundling linked workspace
  deps in dev, so named ESM imports failed at runtime (prod build was fine via
  Rollup). Fix: `optimizeDeps.include: ['@occasio/shared']` in `vite.config.ts`.
- **Touch handler type error** — one handler served `onMouseDown` +
  `onTouchStart`; widened its param to `KonvaEventObject<MouseEvent | TouchEvent>`.
- **Node version** — the machine's default `node` is now v18, but Vite 8 needs
  Node 20+/22+. Use Node 22 (available via nvm): `v22.14.0`. Dev/build must run
  under it. *(Not a code change — an environment note.)*

## Verified (Playwright, headless Chromium)

- **Editor** mounts, canvas present, no console errors — screenshot shows theme
  picker, shape tools, live canvas, properties + schedule panels.
- **`/render?design=…`** rebuilds the exact scene (ocean gradient, star + heart,
  centered bold title + subtitle), `__OCCASIO_READY__` fires, canvas is 800×600.
- **Full UI flow**: added a star → filled recipient + future datetime → clicked
  *Schedule card* → success confirmation → card persisted (`GET /cards` count
  1→2, `PENDING`, `shapes:1`, correct `theme`).

## Run (Node 22 required)

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"   # or nvm use 22
pnpm infra:up
pnpm dev:backend    # :3001
pnpm dev:frontend   # :5173  → design a card, schedule it
```

## Next — Phase 3 (render + send pipeline)

Fill the backend seams: `RenderService` (Playwright loads `/render?design=…`,
waits on `__OCCASIO_READY__`, screenshots → PNG) → `MailService` (Nodemailer
inlines the PNG → Mailhog) → `SchedulerService.tick()` (poll due `PENDING`
cards, run render+send, mark `SENT`/`FAILED`).
