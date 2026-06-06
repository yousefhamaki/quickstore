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

// ============================================================================
// RESILIENT WRAPPER & CIRCUIT BREAKER FOR GRACEFUL DEGRADATION
// ============================================================================

let consecutiveFailures = 0;
let circuitOpenUntil = 0;
const MAX_FAILURES = 3;
const COOLDOWN_MS = 5 * 60 * 1000; // 5 Minutes

function isCircuitOpen(): boolean {
  if (consecutiveFailures >= MAX_FAILURES) {
    const now = Date.now();
    if (now < circuitOpenUntil) {
      return true; // Circuit is Open -> Bypass Redis
    } else {
      // Cooldown expired -> Attempt to close the circuit
      console.warn('[Redis Cache] Circuit Breaker cooldown expired. Retrying connection...');
      consecutiveFailures = 0;
    }
  }
  return false;
}

function recordSuccess() {
  consecutiveFailures = 0;
}

function recordFailure(err: any) {
  consecutiveFailures++;
  if (consecutiveFailures >= MAX_FAILURES) {
    circuitOpenUntil = Date.now() + COOLDOWN_MS;
    console.error(`[Redis Cache] Circuit Breaker OPENED! 3 consecutive failures. Disabling Redis operations for 5 minutes. Last error: ${err?.message || err}`);
  }
}

// Wrap operations to degrade gracefully to MongoDB fallback mode
const originalGet = redisClient.get.bind(redisClient);
redisClient.get = async function(key: string, ...args: any[]) {
  if (isCircuitOpen()) return null;
  try {
    const result = await originalGet(key, ...args);
    recordSuccess();
    return result;
  } catch (err: any) {
    console.warn(`[Redis Cache] GET failed for key "${key}":`, err?.message || err);
    recordFailure(err);
    return null;
  }
} as any;

const originalSetex = redisClient.setex.bind(redisClient);
redisClient.setex = async function(key: string, seconds: number, value: string, ...args: any[]) {
  if (isCircuitOpen()) return 'OK';
  try {
    const result = await originalSetex(key, seconds, value, ...args);
    recordSuccess();
    return result;
  } catch (err: any) {
    console.warn(`[Redis Cache] SETEX failed for key "${key}":`, err?.message || err);
    recordFailure(err);
    return 'OK';
  }
} as any;

const originalSet = redisClient.set.bind(redisClient);
redisClient.set = async function(key: string, value: string, ...args: any[]) {
  if (isCircuitOpen()) return 'OK';
  try {
    const result = await originalSet(key, value, ...args);
    recordSuccess();
    return result;
  } catch (err: any) {
    console.warn(`[Redis Cache] SET failed for key "${key}":`, err?.message || err);
    recordFailure(err);
    return 'OK';
  }
} as any;

const originalDel = redisClient.del.bind(redisClient);
redisClient.del = async function(...args: any[]) {
  if (isCircuitOpen()) return 0;
  try {
    const result = await originalDel(...args);
    recordSuccess();
    return result;
  } catch (err: any) {
    console.warn(`[Redis Cache] DEL failed:`, err?.message || err);
    recordFailure(err);
    return 0;
  }
} as any;

const originalUnlink = redisClient.unlink.bind(redisClient);
redisClient.unlink = async function(...args: any[]) {
  if (isCircuitOpen()) return 0;
  try {
    const result = await originalUnlink(...args);
    recordSuccess();
    return result;
  } catch (err: any) {
    console.warn(`[Redis Cache] UNLINK failed:`, err?.message || err);
    recordFailure(err);
    return 0;
  }
} as any;

const originalKeys = redisClient.keys.bind(redisClient);
redisClient.keys = async function(pattern: string, ...args: any[]) {
  if (isCircuitOpen()) return [];
  try {
    const result = await originalKeys(pattern, ...args);
    recordSuccess();
    return result;
  } catch (err: any) {
    console.warn(`[Redis Cache] KEYS failed for pattern "${pattern}":`, err?.message || err);
    recordFailure(err);
    return [];
  }
} as any;

const originalScan = redisClient.scan.bind(redisClient);
redisClient.scan = async function(cursor: string, ...args: any[]) {
  if (isCircuitOpen()) return ['0', []];
  try {
    const result = await originalScan(cursor, ...args);
    recordSuccess();
    return result;
  } catch (err: any) {
    console.warn(`[Redis Cache] SCAN failed at cursor "${cursor}":`, err?.message || err);
    recordFailure(err);
    return ['0', []];
  }
} as any;

const originalPipeline = redisClient.pipeline.bind(redisClient);
redisClient.pipeline = function(...args: any[]) {
  const pipe = originalPipeline(...args);
  const originalExec = pipe.exec.bind(pipe);
  pipe.exec = async function() {
    if (isCircuitOpen()) return [];
    try {
      const results = await originalExec();
      recordSuccess();
      return results;
    } catch (err: any) {
      console.warn('[Redis Cache] Pipeline execution failed:', err?.message || err);
      recordFailure(err);
      return [];
    }
  };
  return pipe;
} as any;
