import mongoose from 'mongoose';
import EmailAccount from '../models/EmailAccount';
import EmailLedgerEntry from '../models/EmailLedgerEntry';
import EmailCreditReservation from '../models/EmailCreditReservation';
import Store from '../models/Store';
import Subscription from '../models/Subscription';

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
            // Check if we need to refresh monthly allowance (cycle renewal or plan change detected)
            const subStartedAt = sub ? new Date(sub.startedAt) : new Date(0);
            if (account.lastRefreshedAt < subStartedAt) {
                console.log(`[CampaignQuotaService] Cycle reset detected. Refreshing monthly allowance for store ${storeId}.`);
                
                // Old planBalance expires. Purchased credits are kept intact.
                account.planBalance = allowance;
                account.lastRefreshedAt = new Date();
                account.balance = account.planBalance + account.purchasedBalance;
                await account.save();

                await EmailLedgerEntry.create({
                    storeId,
                    type: 'monthly_grant',
                    amount: allowance,
                    description: `Monthly renewal email quota grant for plan: ${planName}`
                });
            }
        }
        return account;
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
