# Occasio

Design a greeting card on a canvas, schedule it, and have it **emailed as an image** at the time you choose. The card is stored as JSON and re-rendered server-side with a headless browser, so it arrives exactly as it looked in the editor.

## What it includes

- **Editor:** themes, shapes, and editable title/subtitle on a react-konva canvas, plus a recipient + send-time form.
- **Accounts:** register/login (JWT); every card belongs to its owner.
- **Scheduled cards:** live previews, status, edit, cancel, and retry.
- **Sending:** a BullMQ job (Redis) per card → Playwright renders a PNG → email, with automatic retry and a "Sent by" footer.
- **Stack:** pnpm monorepo (`frontend/` React + Vite + Tailwind, `backend/` NestJS + Prisma + Postgres, `shared/` types).

## Run it

Needs Node >= 22.22.3 (`nvm use` reads `.nvmrc`), pnpm >= 10, and Docker.

```bash
pnpm install
cp .env.example .env && cp .env.example backend/.env   # backend reads its own .env
pnpm infra:up                                          # Postgres + Redis + Mailhog (http://localhost:8025)
pnpm db:migrate
pnpm --filter backend exec playwright install chromium # once, for rendering
pnpm -r build                                          # builds shared first; re-run after editing shared/

pnpm dev:backend                                       # http://localhost:3001/api/health
pnpm dev:frontend                                      # http://localhost:5173
```

Open http://localhost:5173, register, design a card, and schedule it a minute out. With the default `.env` mail goes to Mailhog; check the email there. The frontend must be running, since the backend renders cards from it.

More: [CLAUDE.md](CLAUDE.md) (architecture), [DEPLOY.md](DEPLOY.md) (Render + Brevo), [phases/](phases/) (build notes).
