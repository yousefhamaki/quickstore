/**
 * One-off: enables the WhatsApp feature and sets a safety-conscious,
 * tiered monthly message allowance on each real paid plan (Starter stays
 * excluded — it's the free tier). Values are deliberately much lower than
 * the equivalent emailLimit at each tier: unofficial WhatsApp automation
 * carries real account-ban risk that scales with volume, so these are
 * meant as a genuine safety cap, not a monetized "buy more" meter (see the
 * merchant conversation this was designed around — no per-message price
 * exists or is planned; WhatsApp access is plan-gated, not metered).
 *
 * Uses the same updatePlan() service the admin dashboard's plan editor
 * calls, so it's fully auditable (AdminAuditLog) and invalidates the
 * `plans:active` Redis cache exactly like a normal admin edit would —
 * same pattern as scripts/enableUCDForProfessional.ts.
 *
 * Already run once against production (2026-09-15) — set:
 *   Starter: allowWhatsApp=false, whatsappLimit=0
 *   Professional: allowWhatsApp=true, whatsappLimit=150
 *   Professional Plus: allowWhatsApp=true, whatsappLimit=400
 *   Enterprise: allowWhatsApp=true, whatsappLimit=800
 * Kept here (not deleted) as a historical record, same convention as
 * enableUCDForProfessional.ts. Safe to re-run — it's idempotent (just
 * re-applies the same target values via updatePlan()).
 *
 * Run with: npx ts-node --transpile-only src/scripts/setWhatsAppPlanLimits.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';
import SubscriptionPlan from '../models/SubscriptionPlan';
import { updatePlan } from '../services/admin/plan.service';
import { redisClient } from '../config/redis';

const SYSTEM_ADMIN_EMAIL = 'admin@quickstore.live';

// planName -> { allowWhatsApp, whatsappLimit }
const TARGETS: Record<string, { allowWhatsApp: boolean; whatsappLimit: number }> = {
    'Starter': { allowWhatsApp: false, whatsappLimit: 0 },
    'Professional': { allowWhatsApp: true, whatsappLimit: 150 },
    'Professional Plus': { allowWhatsApp: true, whatsappLimit: 400 },
    'Enterprise': { allowWhatsApp: true, whatsappLimit: 800 },
};

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: SYSTEM_ADMIN_EMAIL });
    if (!admin) throw new Error(`Admin ${SYSTEM_ADMIN_EMAIL} not found`);

    for (const [planName, target] of Object.entries(TARGETS)) {
        const plan = await SubscriptionPlan.findOne({ name: planName });
        if (!plan) {
            console.warn(`Plan "${planName}" not found — skipping.`);
            continue;
        }

        console.log(`\n${planName} — before:`, { allowWhatsApp: plan.features?.allowWhatsApp, whatsappLimit: (plan as any).whatsappLimit });

        const updated = await updatePlan(
            plan._id.toString(),
            {
                features: { ...(plan.features as any), allowWhatsApp: target.allowWhatsApp },
                whatsappLimit: target.whatsappLimit
            },
            admin._id.toString(),
            'Enable WhatsApp notifications feature with a safety-tiered monthly message cap — merchant decision.',
            '127.0.0.1'
        );

        console.log(`${planName} — after:`, { allowWhatsApp: updated.features?.allowWhatsApp, whatsappLimit: (updated as any).whatsappLimit });
    }

    await redisClient.del('plans:active');
    console.log('\nCleared plans:active cache.');

    redisClient.disconnect();
    await mongoose.disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
});
