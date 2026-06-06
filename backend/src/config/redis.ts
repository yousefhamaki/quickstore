import Redis from 'ioredis';

const redisHost = process.env.REDIS_HOST || 'localhost';
const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
const redisPassword = process.env.REDIS_PASSWORD || '';

export const redisClient = new Redis({
  host: redisHost,
  port: redisPort,
  password: redisPassword ? redisPassword : undefined,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 3) {
      console.warn('[Redis Cache] Max connection retries reached. Operating in MongoDB fallback mode.');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 500, 2000);
    return delay;
  },
});

redisClient.on('connect', () => {
  console.log('Redis Cache Connected successfully.');
});

redisClient.on('error', (err: any) => {
  // Prevent terminal pollution by stripping the nested AggregateError block natively 
  if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
      // Only log softly
      console.warn(`[Redis Cache] Offline or Refused Connection. Skipping...`);
  } else {
      console.error('Redis Cache Connection Error:', err.message || err);
  }
});
