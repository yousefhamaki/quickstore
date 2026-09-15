import mongoose from 'mongoose';
import EmailAccount from '../models/EmailAccount';
import EmailLedgerEntry from '../models/EmailLedgerEntry';
import EmailCreditReservation from '../models/EmailCreditReservation';
import Store from '../models/Store';
import Subscription from '../models/Subscription';
// Side-effect import: getCreditBalance() below does
// Subscription.find().populate('planId'), which needs 'SubscriptionPlan'
// registered with Mongoose. Registered implicitly in the main server via
// other files' imports, but not guaranteed for standalone
// scripts/tests/workers that import this service directly.
import '../models/SubscriptionPlan';

export class CampaignQuotaService {
    /**
     * Get or initialize the email account balance for a store.
     * Automatically handles monthly billing cycle reset / plan change grants.
     */
    static async getCreditBalance(storeId: string | mongoose.Types.ObjectId): Promise<any> {
        let account = await EmailAccount.findOne({ storeId });
        
        // Fetch store details to find owner's active subscription plan
        const store = await Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }

        const sub = await Subscription.findOne({ userId: store.ownerId }).populate('planId');

        let allowance = 0;
        let planName = 'Free';
        if (sub && sub.status === 'active' && sub.planId) {
            const plan = sub.planId as any;
            planName = plan.name || 'Free';
            allowance = plan.emailLimit || 0;
        }

        if (!account) {
            try {
                // Initialize default free monthly balance of 0 credits, or active allowance if subscribed
                account = await EmailAccount.create({
                    storeId,
                    planBalance: allowance,
                    purchasedBalance: 0,
                    balance: allowance,
                    reserved: 0,
                    lastRefreshedAt: new Date()
                });

                // Write initial grant to ledger
                if (allowance > 0) {
                    await EmailLedgerEntry.create({
                        storeId,
                        type: 'monthly_grant',
                        amount: allowance,
                        description: `Initial email monthly grant for plan: ${planName}`
                    });
                }
            } catch (error: any) {
                // Handle concurrent insert race condition (storeId unique index)
                if (error.code === 11000) {
                    account = await EmailAccount.findOne({ storeId });
                } else {
                    throw error;
                }
            }
        } else {
            const subStartedAt = sub ? new Date(sub.startedAt) : new Date(0);
            const now = new Date();
            const monthsSinceLastRefresh =
                (now.getFullYear() - account.lastRefreshedAt.getFullYear()) * 12 +
                (now.getMonth() - account.lastRefreshedAt.getMonth());

            // Two independent triggers for refreshing the monthly plan
            // allowance:
            //  1) monthElapsed — a full calendar month has passed since the
            //     last grant. This is the actual cadence the plan promises
            //     ("500 emails/month") and must fire every month regardless
            //     of the subscription's own billing cycle length.
            //  2) planChanged — the subscription's plan/cycle changed since
            //     the last grant (e.g. an upgrade), so the new allowance
            //     should apply immediately rather than waiting for the next
            //     calendar month boundary.
            //
            // Previously this ONLY checked planChanged (lastRefreshedAt <
            // sub.startedAt). That's fine for a monthly subscriber — every
            // renewal advances startedAt once a month — but for a YEARLY
            // subscriber, startedAt only changes once a year, so the
            // "monthly" allowance was silently granted exactly once for the
            // whole 12 months instead of refreshing every month.
            const monthElapsed = monthsSinceLastRefresh >= 1;
            const planChanged = account.lastRefreshedAt < subStartedAt;

            if (monthElapsed || planChanged) {
                console.log(`[CampaignQuotaService] Refreshing monthly allowance for store ${storeId} (monthElapsed=${monthElapsed}, planChanged=${planChanged}).`);

                // Old planBalance expires — it does NOT roll over into the
                // new cycle (unlike purchasedBalance, which is kept intact
                // below). Audited via its own 'expired' ledger entry so the
                // merchant can see exactly how many unused monthly credits
                // they lost, rather than the number just silently vanishing
                // from their balance with no trace in the ledger.
                const expiredAmount = account.planBalance;

                account.planBalance = allowance;
                account.lastRefreshedAt = now;
                account.balance = account.planBalance + account.purchasedBalance;
                await account.save();

                if (expiredAmount > 0) {
                    await EmailLedgerEntry.create({
                        storeId,
                        type: 'expired',
                        amount: -expiredAmount,
                        description: `${expiredAmount} unused monthly email credit${expiredAmount === 1 ? '' : 's'} expired at cycle renewal (did not roll over)`
                    });
                }

                await EmailLedgerEntry.create({
                    storeId,
                    type: 'monthly_grant',
                    amount: allowance,
                    description: `Monthly email quota grant for plan: ${planName}`
                });
            }
        }
        return account;
    }

    /**
     * Moves PURCHASED add-on email credits from one store to another owned
     * by the same merchant. Only `purchasedBalance` is transferable — the
     * monthly `planBalance` stays tied to the store it was granted to (it's
     * a per-store entitlement re-derived from the subscription's plan every
     * cycle in getCreditBalance(), not something the merchant "owns" and
     * moves around; purchased credits, on the other hand, were bought with
     * real money and the merchant reasonably expects to reallocate them
     * across their own stores).
     *
     * Caller is responsible for verifying both storeIds actually belong to
     * the requesting merchant BEFORE calling this — this method only
     * touches the two EmailAccount documents it's given.
     */
    static async transferPurchasedCredits(
        fromStoreId: string | mongoose.Types.ObjectId,
        toStoreId: string | mongoose.Types.ObjectId,
        amount: number
    ): Promise<{ from: any; to: any }> {
        if (String(fromStoreId) === String(toStoreId)) {
            throw new Error('Cannot transfer credits to the same store');
        }
        if (!Number.isInteger(amount) || amount <= 0) {
            throw new Error('Transfer amount must be a positive whole number');
        }

        // Ensure both accounts exist (and are refreshed to the current
        // plan's monthly allowance) before moving anything between them.
        await this.getCreditBalance(fromStoreId);
        await this.getCreditBalance(toStoreId);

        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            const fromAccount = await EmailAccount.findOneAndUpdate(
                { storeId: fromStoreId, purchasedBalance: { $gte: amount } },
                { $inc: { purchasedBalance: -amount, balance: -amount } },
                { new: true, session }
            );

            if (!fromAccount) {
                throw new Error('Insufficient purchased email credit balance on the source store');
            }

            const toAccount = await EmailAccount.findOneAndUpdate(
                { storeId: toStoreId },
                { $inc: { purchasedBalance: amount, balance: amount } },
                { new: true, session }
            );

            if (!toAccount) {
                throw new Error('Destination store email account not found');
            }

            await EmailLedgerEntry.create([{
                storeId: fromStoreId,
                type: 'transfer_out',
                amount: -amount,
                referenceId: String(toStoreId),
                description: `Transferred ${amount} email credits to another store`
            }], { session });

            await EmailLedgerEntry.create([{
                storeId: toStoreId,
                type: 'transfer_in',
                amount,
                referenceId: String(fromStoreId),
                description: `Received ${amount} email credits from another store`
            }], { session });

            await session.commitTransaction();
            return { from: fromAccount, to: toAccount };
        } catch (err) {
            await session.abortTransaction();
            throw err;
        } finally {
            session.endSession();
        }
    }

    /**
     * Atomically debits ONE credit for a single transactional email (order
     * confirmation / status update) — unlike reserveCredits/settleCredits
     * (built for a whole bulk campaign run), this is an immediate
     * debit-or-fail for exactly one recipient, with no reservation step.
     *
     * Returns `debited: false` (never throws) when the balance is 0 — the
     * caller is expected to alert the merchant instead of the customer in
     * that case, not treat it as a server error.
     */
    static async debitTransactional(
        storeId: string | mongoose.Types.ObjectId,
        description: string,
        referenceId?: string
    ): Promise<{ debited: boolean; newBalance: number; justCrossedLowThreshold: boolean }> {
        await this.getCreditBalance(storeId); // ensure account exists/refreshed

        const updated = await EmailAccount.findOneAndUpdate(
            { storeId, balance: { $gte: 1 } },
            { $inc: { balance: -1 } },
            { new: true }
        );

        if (!updated) {
            const existing = await EmailAccount.findOne({ storeId });
            return { debited: false, newBalance: existing?.balance ?? 0, justCrossedLowThreshold: false };
        }

        // Best-effort bucket bookkeeping: drain the monthly plan allowance
        // before purchased add-on credits, same order as settleCredits().
        // A rare race here could leave planBalance/purchasedBalance very
        // slightly inconsistent with the top-level `balance` under heavy
        // concurrent single-email sends, but `balance` itself (the only
        // number that gates "can we send") was already updated atomically
        // above, so that's a minor internal-accounting nuance, not a
        // double-spend risk.
        if (updated.planBalance > 0) {
            await EmailAccount.updateOne({ storeId, planBalance: { $gt: 0 } }, { $inc: { planBalance: -1 } });
        } else {
            await EmailAccount.updateOne({ storeId, purchasedBalance: { $gt: 0 } }, { $inc: { purchasedBalance: -1 } });
        }

        await EmailLedgerEntry.create({
            storeId,
            type: 'transactional_debit',
            amount: -1,
            referenceId,
            description,
        });

        const oldBalance = updated.balance + 1;
        const justCrossedLowThreshold = oldBalance >= 10 && updated.balance < 10;

        return { debited: true, newBalance: updated.balance, justCrossedLowThreshold };
    }

    /**
     * Reserve credits atomically for a campaign run
     */
    static async reserveCredits(
        storeId: string | mongoose.Types.ObjectId,
        campaignRunId: string | mongoose.Types.ObjectId,
        recipientCount: number
    ): Promise<any> {
        if (recipientCount <= 0) {
            throw new Error('Recipient count must be greater than zero');
        }

        // Ensure email account exists and monthly limits are verified
        await this.getCreditBalance(storeId);

        // Atomically deduct balance and add to reserved if sufficient balance
        const updatedAccount = await EmailAccount.findOneAndUpdate(
            { 
                storeId, 
                balance: { $gte: recipientCount } 
            },
            {
                $inc: { 
                    balance: -recipientCount, 
                    reserved: recipientCount 
                }
            },
            { new: true }
        );

        if (!updatedAccount) {
            throw new Error('Insufficient email credit balance');
        }

        // Create non-destructive reservation record (expiring in 24 hours)
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const reservation = await EmailCreditReservation.create({
            storeId,
            campaignRunId,
            status: 'pending',
            creditsReserved: recipientCount,
            creditsConsumed: 0,
            creditsRefunded: 0,
            expiresAt
        });

        return reservation;
    }

    /**
     * Settle credits after campaign execution completes.
     * Consumed credits are debited from the monthly plan allowance first, and add-on balance second.
     */
    static async settleCredits(
        storeId: string | mongoose.Types.ObjectId,
        campaignRunId: string | mongoose.Types.ObjectId,
        consumedCount: number
    ): Promise<any> {
        const reservation = await EmailCreditReservation.findOne({ storeId, campaignRunId, status: 'pending' });
        if (!reservation) {
            throw new Error('No pending credit reservation found for this campaign run');
        }

        const reservedCount = reservation.creditsReserved;
        const refundedCount = reservedCount - consumedCount;

        if (refundedCount < 0) {
            throw new Error(`Consumed credits (${consumedCount}) exceed reserved credits (${reservedCount})`);
        }

        const account = await EmailAccount.findOne({ storeId });
        if (!account) {
            throw new Error('Email account not found');
        }

        // Deduct from planBalance first, and then purchasedBalance
        const deductPlan = Math.min(account.planBalance, consumedCount);
        const deductPurchased = consumedCount - deductPlan;

        // Atomically update
        const updatedAccount = await EmailAccount.findOneAndUpdate(
            { storeId },
            {
                $inc: {
                    reserved: -reservedCount,
                    planBalance: -deductPlan,
                    purchasedBalance: -deductPurchased,
                    balance: refundedCount // restores unused reservation back to balance
                }
            },
            { new: true }
        );

        // Update reservation status and metrics
        reservation.status = consumedCount === reservedCount ? 'fully_consumed' : 'partially_consumed';
        reservation.creditsConsumed = consumedCount;
        reservation.creditsRefunded = refundedCount;
        await reservation.save();

        // Write actual consumption to the ledger
        if (consumedCount > 0) {
            await EmailLedgerEntry.create({
                storeId,
                type: 'campaign_debit',
                amount: -consumedCount,
                referenceId: campaignRunId.toString(),
                description: `Campaign execution usage debit for run ${campaignRunId}`
            });
        }

        return reservation;
    }

    /**
     * Release all reserved credits back to the balance (e.g. cancelled/failed run)
     */
    static async releaseCredits(
        storeId: string | mongoose.Types.ObjectId,
        campaignRunId: string | mongoose.Types.ObjectId
    ): Promise<any> {
        const reservation = await EmailCreditReservation.findOne({ storeId, campaignRunId, status: 'pending' });
        if (!reservation) {
            return null; // Already settled, released, or expired
        }

        const reservedCount = reservation.creditsReserved;

        // Refund all reserved credits back to balance
        await EmailAccount.findOneAndUpdate(
            { storeId },
            {
                $inc: {
                    reserved: -reservedCount,
                    balance: reservedCount
                }
            }
        );

        reservation.status = 'released';
        reservation.creditsRefunded = reservedCount;
        await reservation.save();

        return reservation;
    }

    /**
     * Reconcile any expired reservations by soft-expiring them and restoring credits
     */
    static async reconcileExpiredReservations(): Promise<number> {
        const expiredReservations = await EmailCreditReservation.find({
            status: 'pending',
            expiresAt: { $lt: new Date() }
        });

        let processedCount = 0;

        for (const reservation of expiredReservations) {
            const unreleasedCredits = reservation.creditsReserved - (reservation.creditsConsumed + reservation.creditsRefunded);

            if (unreleasedCredits > 0) {
                // Return held credits back to balance
                await EmailAccount.findOneAndUpdate(
                    { storeId: reservation.storeId },
                    {
                        $inc: {
                            reserved: -reservation.creditsReserved,
                            balance: unreleasedCredits
                        }
                    }
                );

                // Write ledger entry for restoration audit history
                await EmailLedgerEntry.create({
                    storeId: reservation.storeId,
                    type: 'correction',
                    amount: unreleasedCredits,
                    referenceId: reservation.campaignRunId.toString(),
                    description: `Correction refund for expired credit reservation of run ${reservation.campaignRunId}`
                });
            }

            reservation.status = 'expired';
            await reservation.save();
            processedCount++;
        }

        return processedCount;
    }

    /**
     * Start background job for reservation expiration reconciliation
     */
    static startReconciliationInterval(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
        console.log('[CampaignQuotaService] Background credit reservation reconciliation started.');
        const timer = setInterval(async () => {
            try {
                const reconciled = await this.reconcileExpiredReservations();
                if (reconciled > 0) {
                    console.log(`[CampaignQuotaService] Reconciled ${reconciled} expired credit reservations.`);
                }
            } catch (err) {
                console.error('[CampaignQuotaService] Error in background reconciliation loop:', err);
            }
        }, intervalMs);
        
        // Prevent blocking server shutdown/testing if unref is available
        if (timer && typeof timer.unref === 'function') {
            timer.unref();
        }
        return timer;
    }
}
