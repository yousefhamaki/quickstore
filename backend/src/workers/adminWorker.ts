import { Worker } from 'bullmq';
import { redisClient } from '../config/redis';
import { sendWalletUpdateNotification, sendMerchantBlockedNotification } from '../services/admin/notification.service';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
};

export const adminWorker = new Worker('admin-events', async (job) => {
  const { name, data } = job;
  console.log(`[BullMQ Worker] Processing event: ${name} (Job ID: ${job.id})`);

  try {
    switch (name) {
      case 'merchant.blocked': {
        const { email, name: merchantName, reason } = data;
        await sendMerchantBlockedNotification(email, merchantName, reason);
        break;
      }
      case 'wallet.updated': {
        const { email, name: merchantName, type, amount, reason, balanceAfter } = data;
        await sendWalletUpdateNotification(email, merchantName, type, amount, reason, balanceAfter);
        break;
      }
      case 'store.suspended': {
        const { storeId, reason } = data;
        console.log(`[BullMQ Worker] Store ${storeId} suspended. Reason: ${reason}`);
        break;
      }
      case 'plan.changed': {
        const cacheKey = 'plans:active';
        await redisClient.del(cacheKey);
        console.log(`[BullMQ Worker] Plans cache invalidated: ${cacheKey}`);
        break;
      }
      default:
        console.warn(`[BullMQ Worker] Unknown event registered: ${name}`);
    }
  } catch (error) {
    console.error(`[BullMQ Worker] Job ${job.id} failed with error:`, error);
    throw error;
  }
}, { connection });

adminWorker.on('completed', (job) => {
  console.log(`[BullMQ Worker] Job ${job.id} has completed successfully.`);
});

adminWorker.on('failed', (job, err) => {
  console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err);
});
export default adminWorker;
