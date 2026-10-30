# Phase 9 — Production Email via Brevo

Send real email from the deployed service. Started as an SMTP-provider switch
(Resend → Brevo, free tier), then moved to Brevo's **HTTP API** because Render's
free plan blocks outbound SMTP.

## What changed

**backend** — `MailService`:

- When `BREVO_API_KEY` is set, it `POST`s to Brevo's `v3/smtp/email` with the PNG
  attached; otherwise it falls back to Nodemailer SMTP (Mailhog in dev).
- `SMTP_FROM` (`Name <email>` or a bare address) is parsed into Brevo's sender
  shape and must match a sender verified in Brevo. `Reply-To` is still the card
  owner (see Phase 7).
- A non-2xx response throws with Brevo's response body, so a failed send surfaces
  as a real error.

**config** — `.env.example` and `render.yaml` document `BREVO_API_KEY`
(from Brevo's **API Keys** tab — *not* the SMTP key used for `SMTP_PASS`).

## Key decisions

- **HTTP API over SMTP in production.** Blocked SMTP ports show up as a hung
  `Connection timeout` after ~2 minutes and a card marked `FAILED`; plain HTTPS
  isn't blocked.
- **SMTP kept as the fallback**, so local dev (Mailhog) and any SMTP-only host
  still work with no code change.
- **API key takes priority** over `SMTP_*` when both are set.

## Go-live steps

See [DEPLOY.md](../DEPLOY.md) §2 (sender verification) and §3.
