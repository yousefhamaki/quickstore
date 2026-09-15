import { Worker } from 'bullmq';
import { SUBSCRIPTION_RENEWAL_JOB } from '../queues/billingQueue';
import { runSubscriptionRenewalSweep } from '../services/billing/SubscriptionRenewalService';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
};

export const billingWorker = new Worker('billing-cron', async (job) => {
  console.log(`[BillingWorker] Processing job: ${job.name} (Job ID: ${job.id})`);

  switch (job.name) {
    case SUBSCRIPTION_RENEWAL_JOB:
      return runSubscriptionRenewalSweep();
    default:
      console.warn(`[BillingWorker] Unknown job registered: ${job.name}`);
  }
}, { connection });

billingWorker.on('completed', (job) => {
  console.log(`[BillingWorker] Job ${job.id} (${job.name}) completed.`);
});

billingWorker.on('failed', (job, err) => {
  console.error(`[BillingWorker] Job ${job?.id} (${job?.name}) failed:`, err);
});

export default billingWorker;
