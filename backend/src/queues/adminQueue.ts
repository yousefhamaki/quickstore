import { Queue } from 'bullmq';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

const connection = {
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
};

export const adminQueue = new Queue('admin-events', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const publishAdminEvent = async (name: string, data: any) => {
  try {
    await adminQueue.add(name, data);
    console.log(`[BullMQ Queue] Event enqueued: ${name}`);
  } catch (error) {
    console.error(`[BullMQ Queue] Failed to enqueue event ${name}:`, error);
  }
};
