/**
 * Manually run one subscription renewal/expiry sweep immediately, without
 * waiting for the hourly BullMQ schedule. Useful for local testing.
 *
 * Run with: npx tsx src/scripts/runSubscriptionRenewalSweepOnce.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { runSubscriptionRenewalSweep } from '../services/billing/SubscriptionRenewalService';
import { redisClient } from '../config/redis';

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const summary = await runSubscriptionRenewalSweep();
    console.log('\n--- Renewal sweep summary ---');
    console.log(summary);

    await mongoose.disconnect();
    // The renewal service uses the shared ioredis client (for the
    // per-subscription lock), which otherwise keeps this process alive
    // indefinitely since it's a persistent connection, not a one-off request.
    redisClient.disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error('Renewal sweep failed:', err);
    process.exit(1);
});
