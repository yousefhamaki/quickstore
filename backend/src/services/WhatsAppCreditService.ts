import mongoose from 'mongoose';
import WhatsAppCreditAccount from '../models/WhatsAppCreditAccount';
import WhatsAppLedgerEntry from '../models/WhatsAppLedgerEntry';
import Store from '../models/Store';
import Subscription from '../models/Subscription';
// Side-effect import: getCreditBalance() below does
// Subscription.find().populate('planId'), which needs 'SubscriptionPlan'
// registered with Mongoose — same reasoning as CampaignQuotaService.ts.
import '../models/SubscriptionPlan';

/**
 * A hard ceiling on the monthly WhatsApp plan allowance, enforced here
 * regardless of what any plan document says. This is a deliberate,
 * unconditional safety cap — "the user cannot use an open/unlimited
 * messages" is a system guarantee, not just an admin-configuration
 * convention that a plan edit could accidentally violate (unlike
 * `productLimit`, which legitimately uses -1 for "unlimited" elsewhere in
 * this codebase, WhatsApp volume must NEVER be unbounded, since higher
 * volume on one unofficial number directly raises the account's WhatsApp
 * ban risk).
 */
const MAX_SAFE_WHATSAPP_MONTHLY_LIMIT = 2000;

/**
 * WhatsApp's own credit ledger — a deliberate near-duplicate of
 * CampaignQuotaService's getCreditBalance/debitTransactional (email),
 * rather than a `channel` discriminator retrofitted onto EmailAccount/
 * EmailLedgerEntry, which carry a live production unique index on
 * storeId that would need a careful migration for zero functional gain
 * right now. Only the two methods Phase 1 actually needs are implemented
 * — no campaign reserve/settle/transfer yet, since WhatsApp has no bulk
 * marketing/campaign feature on the (unofficial) Baileys provider.
 */
export class WhatsAppCreditService {
    /**
     * Get or initialize the WhatsApp credit balance for a store. Same
     * plan-credit rules as email: a rolling 30-day refresh cadence while
     * the plan is active, immediate zero-out the moment it isn't, and
     * purchased credits that never expire and are drained only once plan
     * credits hit zero (see debitTransactional below).
     */
    static async getCreditBalance(storeId: string | mongoose.Types.ObjectId): Promise<any> {
        let account = await WhatsAppCreditAccount.findOne({ storeId });

        const store = await Store.findById(storeId);
        if (!store) {
            throw new Error('Store not found');
        }

        const sub = await Subscription.findOne({ userId: store.ownerId }).populate('planId');

        // WhatsApp is gated behind its own plan feature flag — a store
        // whose plan doesn't include it stays at 0 allowance even if
        // `whatsappLimit` happens to be set on the plan document (belt and
        // suspenders: connectWhatsApp in whatsappController.ts also
        // refuses to even start a connection for a plan without this flag,
        // so this is the second, independent enforcement point).
        let allowance = 0;
        let planName = 'Free';
        const planHasWhatsApp = !!(sub && sub.status === 'active' && sub.planId && (sub.planId as any).features?.allowWhatsApp);
        if (planHasWhatsApp) {
            const plan = sub.planId as any;
            planName = plan.name || 'Free';
            allowance = Math.min(plan.whatsappLimit || 0, MAX_SAFE_WHATSAPP_MONTHLY_LIMIT);
        }

        if (!account) {
            try {
                account = await WhatsAppCreditAccount.create({
                    storeId,
                    planBalance: allowance,
                    purchasedBalance: 0,
                    balance: allowance,
                    reserved: 0,
                    lastRefreshedAt: new Date()
                });

                if (allowance > 0) {
                    await WhatsAppLedgerEntry.create({
                        storeId,
                        type: 'monthly_grant',
                        amount: allowance,
                        description: `Initial WhatsApp monthly grant for plan: ${planName}`
                    });
                }
            } catch (error: any) {
                if (error.code === 11000) {
                    account = await WhatsAppCreditAccount.findOne({ storeId });
                } else {
                    throw error;
                }
            }
        } else {
            const now = new Date();
            const planIsActive = planHasWhatsApp;

            if (!planIsActive && account.planBalance > 0) {
                const expiredAmount = account.planBalance;
                account.planBalance = 0;
                account.lastRefreshedAt = now;
                account.balance = account.purchasedBalance;
                await account.save();

                await WhatsAppLedgerEntry.create({
                    storeId,
                    type: 'expired',
                    amount: -expiredAmount,
                    description: `${expiredAmount} plan WhatsApp credit${expiredAmount === 1 ? '' : 's'} expired — your subscription plan is no longer active`
                });
            } else if (planIsActive) {
                const daysSinceLastRefresh = (now.getTime() - account.lastRefreshedAt.getTime()) / (1000 * 60 * 60 * 24);
                const monthElapsed = daysSinceLastRefresh >= 30;
                const planChanged = account.lastRefreshedAt < sub!.updatedAt;

                if (monthElapsed || planChanged) {
                    console.log(`[WhatsAppCreditService] Refreshing plan allowance for store ${storeId} (monthElapsed=${monthElapsed}, planChanged=${planChanged}).`);

                    const expiredAmount = account.planBalance;

                    account.planBalance = allowance;
                    account.lastRefreshedAt = now;
                    account.balance = account.planBalance + account.purchasedBalance;
                    await account.save();

                    if (expiredAmount > 0) {
                        await WhatsAppLedgerEntry.create({
                            storeId,
                            type: 'expired',
                            amount: -expiredAmount,
                            description: `${expiredAmount} unused plan WhatsApp credit${expiredAmount === 1 ? '' : 's'} expired at cycle renewal (did not roll over)`
                        });
                    }

                    await WhatsAppLedgerEntry.create({
                        storeId,
                        type: 'monthly_grant',
                        amount: allowance,
                        description: `Plan WhatsApp credit grant (30 days) for plan: ${planName}`
                    });
                }
            }
        }
        return account;
    }

    /**
     * Atomically debits ONE credit for a single WhatsApp message. Returns
     * `debited: false` (never throws) when the balance is 0 — the caller
     * is expected to alert the merchant instead of the customer, exactly
     * like the email equivalent.
     */
    static async debitTransactional(
        storeId: string | mongoose.Types.ObjectId,
        description: string,
        referenceId?: string
    ): Promise<{ debited: boolean; newBalance: number }> {
        await this.getCreditBalance(storeId); // ensure account exists/refreshed

        const updated = await WhatsAppCreditAccount.findOneAndUpdate(
            { storeId, balance: { $gte: 1 } },
            { $inc: { balance: -1 } },
            { new: true }
        );

        if (!updated) {
            const existing = await WhatsAppCreditAccount.findOne({ storeId });
            return { debited: false, newBalance: existing?.balance ?? 0 };
        }

        // Drain the plan allowance before purchased add-on credits — same
        // ordering rule as email, enforced the same way (only ever touch
        // purchasedBalance in the branch where planBalance is already 0).
        if (updated.planBalance > 0) {
            await WhatsAppCreditAccount.updateOne({ storeId, planBalance: { $gt: 0 } }, { $inc: { planBalance: -1 } });
        } else {
            await WhatsAppCreditAccount.updateOne({ storeId, purchasedBalance: { $gt: 0 } }, { $inc: { purchasedBalance: -1 } });
        }

        await WhatsAppLedgerEntry.create({
            storeId,
            type: 'transactional_debit',
            amount: -1,
            referenceId,
            description
        });

        return { debited: true, newBalance: updated.balance };
    }
}
