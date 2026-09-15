/**
 * One-time data migration for the WalletLedger/WalletTransaction consolidation.
 *
 * Run with: npx tsx src/scripts/migrateWalletLedgerUnify.ts
 *
 * What it does (safe, additive, idempotent — never deletes anything):
 *
 *  1. Renames the legacy `merchantId` field to `userId` on any existing
 *     WalletLedger documents written before this consolidation (the
 *     application code now only ever writes `userId`, but older documents
 *     in the database may still have the old field name).
 *
 *  2. Backfills WalletLedger entries for the one known gap: the
 *     ensureWallet() signup-gift credit used to be written ONLY to the
 *     now-deprecated WalletTransaction model, so it never appeared in the
 *     canonical ledger. For each such WalletTransaction gift row with no
 *     matching WalletLedger entry, this creates the missing ledger row.
 *     Because the gift is always the very first financial event for a
 *     wallet, `balanceAfter` is safely computed as the gift amount itself
 *     UNLESS an earlier-dated ledger entry already exists for that user, in
 *     which case the row is skipped and flagged for manual review instead
 *     of guessing.
 *
 * This script does NOT delete the WalletTransaction collection or any
 * documents in it — it is kept as a historical/rollback reference until a
 * human confirms it is safe to archive.
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import WalletLedger from '../models/WalletLedger';
import WalletTransaction from '../models/WalletTransaction';
import { WALLET_LEDGER_REASONS } from '../constants/walletLedgerReasons';

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to MongoDB');

    // --- Step 1: rename merchantId -> userId on any legacy WalletLedger docs ---
    const renameResult = await mongoose.connection.collection('walletledgers').updateMany(
        { merchantId: { $exists: true }, userId: { $exists: false } },
        [{ $set: { userId: '$merchantId' } }, { $unset: 'merchantId' } as any]
    );
    console.log(`[Step 1] Renamed merchantId -> userId on ${renameResult.modifiedCount} WalletLedger document(s).`);

    // --- Step 2: backfill missing signup-gift ledger entries ---
    const giftTransactions = await WalletTransaction.find({ reason: 'gift' }).sort({ createdAt: 1 });
    console.log(`[Step 2] Found ${giftTransactions.length} signup-gift WalletTransaction document(s) to check.`);

    let backfilled = 0;
    let skippedExisting = 0;
    let flaggedForReview = 0;

    for (const tx of giftTransactions) {
        // Does a ledger entry for this user/reason/amount already exist near this timestamp?
        const windowStart = new Date(tx.createdAt.getTime() - 60_000);
        const windowEnd = new Date(tx.createdAt.getTime() + 60_000);
        const existing = await WalletLedger.findOne({
            userId: tx.userId,
            reason: WALLET_LEDGER_REASONS.SIGNUP_GIFT,
            amount: tx.amount,
            createdAt: { $gte: windowStart, $lte: windowEnd }
        });
        if (existing) {
            skippedExisting++;
            continue;
        }

        // Is this genuinely the first-ever ledger entry for this user? (the
        // gift is always written at wallet-creation time, so it should be.)
        const earlierEntry = await WalletLedger.findOne({
            userId: tx.userId,
            createdAt: { $lt: tx.createdAt }
        });
        if (earlierEntry) {
            console.warn(
                `[Step 2] SKIPPED user ${tx.userId}: an earlier ledger entry already exists ` +
                `before this gift's timestamp, so balanceAfter cannot be safely inferred. ` +
                `Review manually (WalletTransaction _id: ${tx._id}).`
            );
            flaggedForReview++;
            continue;
        }

        await WalletLedger.create({
            userId: tx.userId,
            type: tx.type,
            amount: tx.amount,
            reason: WALLET_LEDGER_REASONS.SIGNUP_GIFT,
            referenceId: tx.referenceId,
            balanceAfter: tx.amount,
            createdAt: tx.createdAt
        });
        backfilled++;
    }

    console.log('\n--- Migration summary ---');
    console.log(`Ledger docs renamed (merchantId -> userId): ${renameResult.modifiedCount}`);
    console.log(`Gift entries backfilled into WalletLedger: ${backfilled}`);
    console.log(`Gift entries already present, skipped: ${skippedExisting}`);
    console.log(`Gift entries flagged for manual review: ${flaggedForReview}`);
    console.log('\nWalletTransaction collection left untouched (not deleted).');

    await mongoose.disconnect();
};

run().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
