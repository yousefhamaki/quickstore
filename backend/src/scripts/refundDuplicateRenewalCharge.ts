/**
 * One-off correction: refunds the duplicate 999 EGP `plan_renewal` charge
 * caused by the renewal-sweep double-charge bug (fixed in
 * services/billing/SubscriptionRenewalService.ts) that hit
 * yousefhamaki2@gmail.com's real account during development testing.
 *
 * Uses the same adjustBalance() service the admin dashboard's "Adjust
 * Wallet" action calls, so it's fully auditable (WalletLedger entry +
 * AdminAuditLog) exactly like a normal admin correction — then also sends
 * the wallet-update email directly (rather than relying on the BullMQ
 * worker being up) so delivery doesn't depend on the server running.
 *
 * Run with: npx tsx src/scripts/refundDuplicateRenewalCharge.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/User';
import { adjustBalance } from '../services/admin/wallet.service';
import { sendWalletUpdateNotification } from '../services/admin/notification.service';

const MERCHANT_EMAIL = 'yousefhamaki2@gmail.com';
const SYSTEM_ADMIN_EMAIL = 'admin@quickstore.live';
const REFUND_AMOUNT = 999;

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    const merchant = await User.findOne({ email: MERCHANT_EMAIL });
    if (!merchant) throw new Error(`Merchant ${MERCHANT_EMAIL} not found`);

    const admin = await User.findOne({ email: SYSTEM_ADMIN_EMAIL });
    if (!admin) throw new Error(`Admin ${SYSTEM_ADMIN_EMAIL} not found`);

    const result = await adjustBalance(
        merchant._id.toString(),
        REFUND_AMOUNT,
        'credit',
        admin._id.toString(),
        'Refund: duplicate plan_renewal charge caused by a renewal-sweep bug during development testing (fixed) — two 999 EGP renewals were charged ~2 minutes apart for the same billing cycle.',
        '127.0.0.1'
    );

    console.log(`Refund applied. Balance: ${result.originalBalance} -> ${result.newBalance} EGP`);

    await sendWalletUpdateNotification(
        merchant.email,
        merchant.name,
        'credit',
        REFUND_AMOUNT,
        'Refund for a duplicate subscription renewal charge (platform error, now fixed)',
        result.newBalance
    );

    console.log('Notification email sent (or attempted — check logs above for delivery status).');

    await mongoose.disconnect();
    process.exit(0);
};

run().catch((err) => {
    console.error('Refund script failed:', err);
    process.exit(1);
});
