import IORedis, { type Redis } from 'ioredis';

/** BullMQ queue name for the card-send pipeline. */
export const CARD_SEND_QUEUE = 'card-send';

/** The single job kind on that queue. */
export const SEND_JOB = 'send';

/** Payload of a send job. Kept tiny — the worker loads the fresh card by id. */
export interface SendJobData {
  cardId: string;
}

/**
 * A new ioredis connection for BullMQ. `maxRetriesPerRequest: null` is required
 * by BullMQ (it manages its own retry/blocking semantics). Queue and Worker
 * each need their own connection (the Worker uses blocking commands).
 */
export function createRedisConnection(): Redis {
  return new IORedis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });
}
