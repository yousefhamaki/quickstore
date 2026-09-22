/**
 * Manually run one abandoned-cart recovery sweep immediately, without
 * waiting for the recurring BullMQ schedule. Useful for local testing —
 * e.g. after backdating a test AbandonedCart's createdAt so it clears the
 * ABANDONED_CART_MIN_AGE_MS threshold (see
 * services/AbandonedCartRecoveryService.ts).
 *
 * Run with: npx tsx src/scripts/runAbandonedCartSweepOnce.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { runAbandonedCartRecoverySweep } from '../services/AbandonedCartRecoveryService';

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const summary = await runAbandonedCartRecoverySweep();
    console.log('\n--- Abandoned cart recovery sweep summary ---');
    console.log(summary);

    await mongoose.disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error('Abandoned cart recovery sweep failed:', err);
    process.exit(1);
});
