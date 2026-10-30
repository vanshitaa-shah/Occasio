# Deploying Occasio (Render + Brevo)

Occasio deploys as **one Docker web service** (NestJS API + BullMQ send worker +
Playwright/Chromium render, which also serves the React SPA) plus Postgres (Neon)
and Redis (Render Key Value). The container renders cards against itself (`http://localhost:$PORT/render`)
and emails them via your SMTP provider.

> Why one container (not serverless): the send worker runs continuously and Chromium
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
3. Brevo → **SMTP & API → API Keys tab** → **Generate a new API key** → copy it
   immediately (this is `BREVO_API_KEY` — the app sends via Brevo's HTTP API, not
   raw SMTP, since many hosts including Render's free plan block outbound SMTP
   ports; see the note in step 3 below). Note: this is a *different* key from the
   SMTP key on the **SMTP tab** — grab one from the SMTP tab too if you want the
   SMTP fallback to work locally against a real provider (optional; Mailhog is
   used for local dev by default).
4. `SMTP_FROM` must exactly match the sender you verified in step 1.

## 3. Deploy to Render

1. Render → **New → Blueprint** → connect this repo. Render reads `render.yaml`
   and provisions the **web service** + Redis (the database is on Neon).
2. `JWT_SECRET` is generated automatically. Set the secrets in
   the service's **Environment** tab:
   - `DATABASE_URL` = your Neon connection string (pooled, ending in `?sslmode=require`)
   - `BREVO_API_KEY` = your Brevo API key (from the API Keys tab — **required**;
     without it the app falls back to raw SMTP, which times out on Render's
     free plan — see the note below)
   - `SMTP_USER` = your Brevo account login email (SMTP fallback only — safe to
     set anyway)
   - `SMTP_PASS` = your Brevo SMTP key (SMTP fallback only)
   - `SMTP_FROM` = `Occasio <no-reply@yourdomain.com>` (must match the verified sender
     — used by both the API and SMTP paths)
3. **Create / Apply**. The build runs the `Dockerfile`; on start it runs
   `prisma migrate deploy` then boots. Watch logs for
   `Occasio backend listening` and `Send worker started`.
   > **Why the API key matters:** Render's free plan (and many free tiers) blocks
   > or silently drops outbound SMTP connections. Without `BREVO_API_KEY` set,
   > `MailService` falls back to SMTP on port 587 and a scheduled send will hang
   > for ~2 minutes before failing with `Connection timeout` — the card is marked
   > `FAILED` and never arrives. Setting `BREVO_API_KEY` sends over plain HTTPS
   > instead, which isn't blocked.
4. **Keep it awake (required on the free plan).** Render's free web tier sleeps
   after ~15 min with no HTTP traffic, which would pause the send worker. Set up a
   free external pinger to hit `https://<your-service>.onrender.com/api/health`
   every 10 minutes — e.g. [UptimeRobot](https://uptimerobot.com) or
   [cron-job.org](https://cron-job.org) (both have free tiers), or a scheduled
   GitHub Actions workflow (`curl` on a `schedule: cron` trigger). This costs
   nothing but is a real external dependency — if the pinger stops, the service
   sleeps again and sends resume only once something wakes it.
5. Open the service URL → **Register** → design a card → schedule it a couple of
   minutes out → it arrives in the recipient's real inbox.

## 4. Important notes

- **Free plan tradeoffs:** `render.yaml` uses `plan: free` for a $0 demo, relying
  on the keep-alive ping above to stay awake. This is fine for demoing but not a
  guarantee — Render can still restart/evict a free instance, and there's no SLA.
  For anything real, switch `render.yaml` to `plan: starter` (paid, genuinely
  always-on, no ping needed) — see the comment inline in the file.
- **Memory:** the free plan gives 512MB RAM. Playwright/Chromium fits for a
  single render at a time (renders already run sequentially), but it's tight —
  if you see the process get OOM-killed under any concurrent load, that's the
  free tier's ceiling, not a bug; upgrading to `starter` fixes it.
- **Neon free tier** auto-suspends when idle; the first query after a pause takes
  a moment to wake it.
- **Redis on the free plan has no persistence:** queued jobs are lost on a Redis
  restart. The boot-time reconciler re-enqueues every PENDING card, and re-checks
  every 5 minutes (`RECONCILE_INTERVAL_MS`).
- **Custom domain:** add it under the service's Settings → Custom Domains (the app
  is same-origin, so nothing else changes).
- `RENDER_BASE_URL` is left unset on purpose so the service renders against itself.

## 5. Other hosts

The `Dockerfile` is platform-agnostic — the same image runs on **Railway**,
**Fly.io**, or any VPS. Provide the same env vars (`DATABASE_URL`, `JWT_SECRET`,
`REDIS_URL`, `SMTP_*`/`BREVO_API_KEY`) and Postgres + Redis instances; ensure the plan is always-on.

## 6. Verify the production build locally (optional)

```bash
nvm use 22                                                  # Node >= 22.22.3
pnpm -r build
docker build -t occasio .
docker run --rm -p 3001:3001 \
  -e DATABASE_URL=postgresql://occasio:occasio@host.docker.internal:5432/occasio \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e JWT_SECRET=dev-secret \
  -e SMTP_HOST=host.docker.internal -e SMTP_PORT=1025 \
  -e SMTP_FROM="Occasio <no-reply@occasio.local>" \
  occasio
# open http://localhost:3001, register, schedule; watch Mailhog at :8025
```
