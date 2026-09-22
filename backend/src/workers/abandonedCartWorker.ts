import { Worker } from 'bullmq';
import { ABANDONED_CART_SWEEP_JOB } from '../queues/abandonedCartQueue';
import { runAbandonedCartRecoverySweep } from '../services/AbandonedCartRecoveryService';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
};

export const abandonedCartWorker = new Worker('abandoned-cart-cron', async (job) => {
  console.log(`[AbandonedCartWorker] Processing job: ${job.name} (Job ID: ${job.id})`);

  switch (job.name) {
    case ABANDONED_CART_SWEEP_JOB:
      return runAbandonedCartRecoverySweep();
    default:
      console.warn(`[AbandonedCartWorker] Unknown job registered: ${job.name}`);
  }
}, { connection });

abandonedCartWorker.on('completed', (job) => {
  console.log(`[AbandonedCartWorker] Job ${job.id} (${job.name}) completed.`);
});

abandonedCartWorker.on('failed', (job, err) => {
  console.error(`[AbandonedCartWorker] Job ${job?.id} (${job?.name}) failed:`, err);
});

export default abandonedCartWorker;
