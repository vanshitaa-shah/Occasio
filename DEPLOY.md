# Deploying Occasio (Render + Brevo)

Occasio deploys as **one Docker web service** (NestJS API + node-cron scheduler +
Playwright/Chromium render, which also serves the React SPA) plus a **managed
Postgres**. The container renders cards against itself (`http://localhost:$PORT/render`)
and emails them via your SMTP provider.

> Why one container (not serverless): the scheduler runs continuously and Chromium
> needs a real OS, so the backend must be an **always-on container**, not functions.

---

## 1. Prerequisites

- The repo pushed to GitHub (Render deploys from a repo).
- A [Render](https://render.com) account and a [Brevo](https://brevo.com) account
  (free tiers are fine — Brevo's free plan sends up to 300 emails/day at no cost).
  Any SMTP provider works; Brevo is used here.
- Either a domain you control (best deliverability) or just an email address you can
  click a confirmation link on (single-sender verification — no domain needed).

## 2. Set up the email sender (Brevo)

Real inboxes reject mail sent *as* an address you don't control (SPF/DKIM/DMARC),
so we send from **your** verified sender and put the user in `Reply-To` + the
"Sent by" line on the card.

1. Brevo → **Senders, Domains & Dedicated IPs → Senders** → **Add a sender** → enter
   an email you control and a display name (e.g. `Occasio <no-reply@yourdomain.com>`
   or, for a quick demo, your own address).
2. Brevo emails a confirmation link to that address — click it; the sender shows
   **Verified**. (Optional: verify a full domain instead by adding the shown SPF/DKIM
   DNS records at your registrar — better deliverability, not required to send.)
3. Brevo → **SMTP & API → SMTP tab** → **Generate a new SMTP key** → copy it
   immediately (shown once; this is *not* the same as a Brevo API key).
4. Your `SMTP_USER` is your **Brevo account login email** (not a fixed string).
   `SMTP_FROM` must exactly match the sender you verified in step 1.

## 3. Deploy to Render

1. Render → **New → Blueprint** → connect this repo. Render reads `render.yaml`
   and provisions the **web service** + **Postgres**.
2. `DATABASE_URL` and `JWT_SECRET` are wired automatically. Set the three secrets in
   the service's **Environment** tab:
   - `SMTP_USER` = your Brevo account login email
   - `SMTP_PASS` = your Brevo SMTP key
   - `SMTP_FROM` = `Occasio <no-reply@yourdomain.com>` (must match the verified sender)
3. **Create / Apply**. The build runs the `Dockerfile`; on start it runs
   `prisma migrate deploy` then boots. Watch logs for
   `Occasio backend listening` and `Scheduler started`.
4. Open the service URL → **Register** → design a card → schedule it a couple of
   minutes out → it arrives in the recipient's real inbox.

## 4. Important notes

- **Always-on:** the scheduler only runs while the service is awake. Render's
  **free** web tier sleeps on idle — `render.yaml` uses the `starter` plan so it
  stays up. On a sleeping plan, sends are delayed until the next request wakes it.
- **Memory:** Chromium needs RAM; the `starter` instance is enough for one render
  at a time (renders run sequentially).
- **Free Postgres** on Render expires after 90 days — upgrade the DB plan for
  anything real.
- **Poll interval:** default 60s. Set `SCHEDULER_POLL_MS` if you want it snappier.
- **Custom domain:** add it under the service's Settings → Custom Domains (the app
  is same-origin, so nothing else changes).
- `RENDER_BASE_URL` is left unset on purpose so the service renders against itself.

## 5. Other hosts

The `Dockerfile` is platform-agnostic — the same image runs on **Railway**,
**Fly.io**, or any VPS. Provide the same env vars (`DATABASE_URL`, `JWT_SECRET`,
`SMTP_*`) and a Postgres instance; ensure the plan is always-on.

## 6. Verify the production build locally (optional)

```bash
export PATH="$HOME/.nvm/versions/node/v22.14.0/bin:$PATH"   # Node 22
pnpm -r build
docker build -t occasio .
docker run --rm -p 3001:3001 \
  -e DATABASE_URL=postgresql://occasio:occasio@host.docker.internal:5432/occasio \
  -e JWT_SECRET=dev-secret \
  -e SMTP_HOST=host.docker.internal -e SMTP_PORT=1025 \
  -e SMTP_FROM="Occasio <no-reply@occasio.local>" \
  occasio
# open http://localhost:3001, register, schedule; watch Mailhog at :8025
```
