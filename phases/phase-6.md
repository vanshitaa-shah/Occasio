# Phase 6 — Authentication & Per-User Sender

Add accounts. Users register/log in, every card is **owned** by a user, the API
only exposes your own cards, and at send time the email's **From** is the
owner's email while **To** is the recipient they entered.

## What was built

**shared** — `AuthCredentialsDto`, `AuthUser`, `AuthResponse { token, user }`.

**backend**

| Piece | Role |
| ----- | ---- |
| `prisma`: `User` model + `Card.userId` relation (`onDelete: Cascade`) | Ownership. Required migration → dev DB reset (with consent). |
| `AuthModule` (`@nestjs/jwt`, `bcryptjs`) | `POST /auth/register`, `/auth/login` → `{ token, user }`; passwords hashed. |
| `JwtAuthGuard` + `@CurrentUser()` | Verifies `Authorization: Bearer`, attaches `{ userId, email }`. |
| `CardsController` (`@UseGuards(JwtAuthGuard)`) + `CardsService` | Every card op takes `userId`; queries scoped by owner (create sets owner; findOne/update/retry via `findFirst {id,userId}`; remove via `deleteMany {id,userId}`). |
| `CardsService.findDue` | `include`s the owner; `MailService.sendCard({ from })` uses `card.user.email`. |

**frontend**

| Piece | Role |
| ----- | ---- |
| `authStorage` | token + user in `localStorage`. |
| `lib/api.ts` | Attaches bearer token; on a 401 (non-`/auth`) clears auth and redirects to `/login`; surfaces server error messages. Adds `register`/`login`. |
| `useAuth` + `AuthProvider` + `AuthLayout` | Auth context (user, login, register, logout); root layout provides it to all routes. |
| `RequireAuth` | Redirects to `/login` when unauthenticated; wraps `/` and `/scheduled`. |
| `AuthPage` (`/login`, `/register`) | One component, both modes, with a link to switch. |
| `AppHeader` | Shows the signed-in email + Log out. |
| `EditorPage` | "Sent from <your email>" note by the schedule form. |

## Key decisions

- **JWT bearer tokens in localStorage** (not httpOnly cookies) — simplest for an
  SPA + separate API in v1; token carries `{ sub, email }`, 7-day expiry.
- **Ownership enforced server-side on every query**, not just in the UI — a
  scoped `userId` filter means one user can never read/mutate another's card
  (cross-user fetch → 404).
- **`From` = owner email, passed at send time** from the joined `user` in
  `findDue`; `MailService` no longer hard-codes `SMTP_FROM`. `To` stays the
  card's `recipient`.
- **`/render` stays public** — the headless browser has no token; only the
  human-facing routes are gated.
- **Dev DB reset** was required to add the non-null `userId` to existing rows
  (old test cards had no owner) — done with explicit user consent.

## Verified (API + Playwright + Mailhog)

- Unauthenticated `GET /cards` → **401**; unauth `/` → redirect to `/login`.
- Register/login issue tokens; protected calls work with the bearer token.
- **Scoping**: Alice sees her card, Carol does not; Carol `GET /cards/:aliceId` → **404**.
- **Sender**: a card owned by Alice, addressed to `bob-recipient@test.com`, sent
  → Mailhog message **From = Alice's email**, **To = bob-recipient@test.com**.
- UI flow: register → editor (header email + "Sent from"), schedule a card →
  `/scheduled` shows it, log out → `/login`, a new user's `/scheduled` is empty.

## Run (Node 22)

```bash
pnpm infra:up
pnpm db:migrate          # if not already applied (add_auth)
pnpm dev:frontend        # :5173 → register at /register, then design/schedule
pnpm dev:backend         # :3001  (set JWT_SECRET in backend/.env)
```

## Status

Accounts + ownership complete: **register/login → design → schedule (from your
address) → manage your cards → render → email.** Optional/future unchanged:
auto retry+backoff, node-cron → Temporal, Mailhog → a real provider (which would
also bring real sender-domain verification).
