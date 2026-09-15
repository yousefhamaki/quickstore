/**
 * Manually run one merchant onboarding/activation drip sweep immediately,
 * without waiting for the recurring BullMQ schedule. Useful for local
 * testing.
 *
 * Run with: npx tsx src/scripts/runMarketingDripSweepOnce.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { runMerchantDripSweep } from '../services/marketing/MerchantDripService';

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const summary = await runMerchantDripSweep();
    console.log('\n--- Marketing drip sweep summary ---');
    console.log(summary);

    await mongoose.disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error('Marketing drip sweep failed:', err);
    process.exit(1);
});
