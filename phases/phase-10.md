# Phase 10 — Durable Send Queue (BullMQ + Redis)

Replace the in-process polling scheduler (Phase 3) with a durable queue, so a
send time survives restarts, sends can run in parallel, and failures retry
automatically.

## What was built (backend, `src/queue/`)

| File | Role |
| ---- | ---- |
| `card-queue.service.ts` | Owns the BullMQ `card-send` queue. One delayed job per card (`jobId = card.id`, `delay = sendAt - now`), so enqueue / reschedule / remove are idempotent. Retries use exponential backoff. |
| `send-worker.service.ts` | Drains the queue with bounded concurrency: atomically claims the card → render → mail → `markSent`. Marks `FAILED` only on the final attempt; earlier failures rethrow so BullMQ retries. |
| `reconciler.service.ts` | Safety net: on boot it enqueues every `PENDING` card lacking a job, then sweeps periodically for cards due soon. Covers Redis restarts and lost jobs. |
| `queue.constants.ts` | Queue/job names and the shared Redis connection factory (`REDIS_URL`). |

**Also changed**

- `CardsService` enqueues on create and retry, reschedules when `sendAt` changes,
  and removes the job on cancel. New helpers: `claimForSend`, `findDispatchable`.
- Prisma `Card` gained a `SENDING` status plus `attempts` and `lastAttemptAt`.
- `RenderService` caps concurrent Chromium contexts (`RENDER_CONCURRENCY`).
- `docker-compose.yml` and `render.yaml` add Redis (`noeviction`; AOF persistence
  locally).

## Key decisions

- **Postgres stays the source of truth; Redis only holds timers.** Losing Redis
  loses no cards — the reconciler rebuilds the jobs from `PENDING` rows.
- **Row locks on every status-dependent write.** `update`, `retry`, cancel and the
  worker claim run in a transaction that starts with `SELECT … FOR UPDATE` on the
  card, so an edit can't land on a card that's already `SENDING`, and the worker
  always sends the card as of its claim. Redis calls happen after the commit.
- **Claim rules:** `PENDING`, or `SENDING` when it's the job's own retry
  (`attempts === attemptsMade`) or the lease (`SEND_LEASE_MS`) expired — so a
  redelivered "stalled" job whose first run is still alive is skipped. The
  reconciler re-enqueues expired-lease cards so a dead worker can't strand one.
- **Finished jobs are cleared before re-enqueue** (BullMQ ignores `add()` under an
  existing `jobId`, so a retried card would otherwise never get a live job), and
  `has()` ignores finished jobs.
- **Cancelling a `SENDING` card returns 409** — the email can't be recalled.
- **Retry lives in the queue, not the worker loop**, so backoff survives a restart.

## Config

`REDIS_URL`, `SEND_WORKER_CONCURRENCY`, `RENDER_CONCURRENCY`, `SEND_MAX_ATTEMPTS`,
`SEND_BACKOFF_MS`, `RECONCILE_INTERVAL_MS`, `RECONCILE_LOOKAHEAD_MS`, `SEND_LEASE_MS` — defaults and
descriptions in `.env.example`.

## Run

```bash
pnpm infra:up        # Postgres + Redis + Mailhog
pnpm dev:frontend    # render target
pnpm dev:backend
```
