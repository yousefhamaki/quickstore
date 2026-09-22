import { Queue } from 'bullmq';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
};

export const ABANDONED_CART_SWEEP_JOB = 'abandoned-cart.sweep';
const REPEATABLE_JOB_ID = 'abandoned-cart-sweep';

export const abandonedCartQueue = new Queue('abandoned-cart-cron', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 60_000,
    },
    removeOnComplete: {
      count: 100,
      age: 7 * 24 * 60 * 60,
    },
    removeOnFail: {
      count: 500,
      age: 30 * 24 * 60 * 60,
    },
  },
});

/**
 * Schedules the recurring abandoned-cart recovery sweep (see
 * services/AbandonedCartRecoveryService.ts). Safe to call on every server
 * boot: BullMQ keys repeatable jobs by their `jobId` + repeat options, so
 * re-registering the same pattern is a no-op rather than creating duplicate
 * schedules. Defaults to every 30 minutes — override with
 * ABANDONED_CART_SWEEP_CRON (standard cron syntax) if a different cadence is
 * needed. Running more often just means a cart crosses the "old enough to
 * email" threshold sooner, not that it gets emailed more than once (the
 * sweep only ever sends a cart's recovery email once, gated on
 * recoveryEmailSentAt).
 */
export const scheduleAbandonedCartSweep = async () => {
  const pattern = process.env.ABANDONED_CART_SWEEP_CRON || '*/30 * * * *'; // every 30 minutes

  await abandonedCartQueue.add(ABANDONED_CART_SWEEP_JOB, {}, {
    repeat: { pattern },
    jobId: REPEATABLE_JOB_ID,
  });

  console.log(`[AbandonedCartQueue] Abandoned-cart recovery sweep scheduled (cron: "${pattern}").`);
};
