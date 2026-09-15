import { Queue } from 'bullmq';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
};

export const SUBSCRIPTION_RENEWAL_JOB = 'subscription.renewal-sweep';
const REPEATABLE_JOB_ID = 'subscription-renewal-sweep';

export const billingQueue = new Queue('billing-cron', {
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
 * Schedules the recurring subscription renewal/expiry sweep. Safe to call
 * on every server boot: BullMQ keys repeatable jobs by their `jobId` +
 * repeat options, so re-registering the same pattern is a no-op rather than
 * creating duplicate schedules. Defaults to hourly — override with
 * SUBSCRIPTION_RENEWAL_CRON (standard cron syntax) if a different cadence
 * is needed.
 */
export const scheduleSubscriptionRenewalSweep = async () => {
  const pattern = process.env.SUBSCRIPTION_RENEWAL_CRON || '0 * * * *'; // hourly, on the hour

  await billingQueue.add(SUBSCRIPTION_RENEWAL_JOB, {}, {
    repeat: { pattern },
    jobId: REPEATABLE_JOB_ID,
  });

  console.log(`[BillingQueue] Subscription renewal sweep scheduled (cron: "${pattern}").`);
};
