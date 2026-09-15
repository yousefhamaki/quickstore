/**
 * One-off: enable the Offers (Upsell/Cross-sell/Down-sell) feature for the
 * "Professional" plan, per explicit user decision (previously only
 * "Professional Plus" and "Enterprise" had features.allowUCD: true).
 *
 * Uses the same updatePlan() service the admin dashboard's plan editor
 * calls, so it's fully auditable (AdminAuditLog) and invalidates the
 * `plans:active` Redis cache exactly like a normal admin edit would.
 *
 * Run with: npx tsx src/scripts/enableUCDForProfessional.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';
import SubscriptionPlan from '../models/SubscriptionPlan';
import { updatePlan } from '../services/admin/plan.service';
import { redisClient } from '../config/redis';

const SYSTEM_ADMIN_EMAIL = 'admin@quickstore.live';

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: SYSTEM_ADMIN_EMAIL });
    if (!admin) throw new Error(`Admin ${SYSTEM_ADMIN_EMAIL} not found`);

    const plan = await SubscriptionPlan.findOne({ name: 'Professional' });
    if (!plan) throw new Error('Plan "Professional" not found');

    console.log('Before:', plan.features);

    const updated = await updatePlan(
        plan._id.toString(),
        { features: { ...(plan.features as any), allowUCD: true } },
        admin._id.toString(),
        'Enable Offers (UCD) for the Professional plan — merchant decision.',
        '127.0.0.1'
    );

    console.log('After:', updated.features);

    // Don't rely on the BullMQ worker being up to process the
    // 'plan.changed' event that updatePlan() already published — clear the
    // cache directly too so this takes effect immediately either way.
    await redisClient.del('plans:active');
    console.log('Cleared plans:active cache.');

    redisClient.disconnect();
    await mongoose.disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
});
