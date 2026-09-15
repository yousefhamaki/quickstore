import { Worker } from 'bullmq';
import { MARKETING_DRIP_JOB } from '../queues/marketingQueue';
import { runMerchantDripSweep } from '../services/marketing/MerchantDripService';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
};

export const marketingWorker = new Worker('marketing-cron', async (job) => {
  console.log(`[MarketingWorker] Processing job: ${job.name} (Job ID: ${job.id})`);

  switch (job.name) {
    case MARKETING_DRIP_JOB:
      return runMerchantDripSweep();
    default:
      console.warn(`[MarketingWorker] Unknown job registered: ${job.name}`);
  }
}, { connection });

marketingWorker.on('completed', (job) => {
  console.log(`[MarketingWorker] Job ${job.id} (${job.name}) completed.`);
});

marketingWorker.on('failed', (job, err) => {
  console.error(`[MarketingWorker] Job ${job?.id} (${job?.name}) failed:`, err);
});

export default marketingWorker;
