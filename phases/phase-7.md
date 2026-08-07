# Phase 7 — Real Email Sending + "Sent by" Attribution

Two changes (auth was **kept as-is** — no Google, Phase 6 unchanged):

1. A non-editable **"Sent by: &lt;owner email&gt;"** footer baked into the card.
2. Provider-ready SMTP sending with a correct, deliverable sender model.

## Why the sender isn't the user's own email

Email has anti-spoofing (SPF/DKIM/DMARC): a shared server can't send **as**
`someone@gmail.com`, so that would bounce or go to spam. The deliverable pattern:

- `From` = a fixed, verified address we control (`SMTP_FROM`).
- `Reply-To` = the card owner's email (replies reach them).
- Visible attribution = the "Sent by" line on the card image.

## What changed

**Frontend**
- `CanvasRenderer` gains `sentBy?: string` → a fixed footer strip (`listening:false`,
  not part of the editable design). Passed as `user.email` from `EditorPage` and
  `ScheduledCard`; the headless `/render` route reads it from `?sentBy=`.

**Backend**
- `RenderService.render(design, sentBy?)` appends `&sentBy=` to the render URL.
- `SchedulerService` passes `card.user.email` to both `render(...)` and
  `mail.sendCard({ replyTo })`.
- `MailService`: `From` = `SMTP_FROM` (fixed), `Reply-To` = owner; SMTP transport
  now supports auth (`SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE`) so any provider works.

## Going live with a real provider (free tiers)

Set env to your provider's SMTP + a **verified** sender (see `.env.example`):
- **Resend**: `smtp.resend.com:465` secure, user `resend`, pass = API key.
- **SendGrid**: `smtp.sendgrid.net:587`, user `apikey`, pass = API key.

Requires a domain (or single-sender) verified with the provider. Dev stays on
Mailhog (no auth) by default.

## Verified (Mailhog)

Registered a user, sent a due card to `friend-recipient@test.com`:
- **From** = `Occasio <no-reply@occasio.local>` (fixed), **Reply-To** = the owner,
  **To** = the recipient.
- The 1600×1200 PNG shows the design with a bottom strip **"Sent by:
  owner.<n>@occasio.test"**.
- Editor: the footer renders and is non-selectable (clicking it selects nothing).

## Note

To actually deliver to real inboxes, plug in provider SMTP creds + a verified
sender (above). Everything else — scheduling, render, per-user scoping — is
unchanged.
