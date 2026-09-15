import { Queue } from 'bullmq';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
};

export const MARKETING_DRIP_JOB = 'marketing.drip-sweep';
const REPEATABLE_JOB_ID = 'marketing-drip-sweep';

export const marketingQueue = new Queue('marketing-cron', {
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
 * Schedules the recurring merchant onboarding/activation drip sweep (see
 * services/marketing/MerchantDripService.ts). Safe to call on every server
 * boot: BullMQ keys repeatable jobs by their `jobId` + repeat options, so
 * re-registering the same pattern is a no-op rather than creating duplicate
 * schedules. Defaults to every 6 hours — override with MARKETING_DRIP_CRON
 * (standard cron syntax) if a different cadence is needed. Each drip step is
 * gated on real state (see MerchantDripService), so running more often than
 * daily just means a user crosses a threshold sooner, not that they get
 * emailed more than once per step.
 */
export const scheduleMarketingDripSweep = async () => {
  const pattern = process.env.MARKETING_DRIP_CRON || '0 */6 * * *'; // every 6 hours

  await marketingQueue.add(MARKETING_DRIP_JOB, {}, {
    repeat: { pattern },
    jobId: REPEATABLE_JOB_ID,
  });

  console.log(`[MarketingQueue] Merchant drip sweep scheduled (cron: "${pattern}").`);
};
