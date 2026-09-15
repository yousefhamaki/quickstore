import { IStore } from '../models/Store';
import User from '../models/User';
import { CampaignQuotaService } from './CampaignQuotaService';
import {
    sendStoreTemplatedEmail,
    sendLowEmailBalanceAlert,
    sendZeroBalanceSkippedEmailAlert,
    StoreEmailTemplateType,
} from './emailService';

/**
 * Single entry point for every store-customizable transactional customer
 * email (order confirmation, order status changed). Callers should NOT call
 * CampaignQuotaService.debitTransactional or sendStoreTemplatedEmail
 * directly for these — route through here so the credit-gating rules from
 * the merchant's request are enforced in exactly one place:
 *
 *   - balance > 0  -> debit 1 credit, email the CUSTOMER.
 *   - balance == 0 -> nothing debited, email the MERCHANT instead,
 *                     explaining their customer was NOT notified because
 *                     the store is out of email credits.
 *   - balance just crossed below 10 (from >=10) as a result of this send
 *                  -> ALSO email the merchant a low-balance warning (fires
 *                     once per crossing, not on every send under 10).
 *
 * Never throws — an email failure here must never fail the caller's
 * primary request (order creation / status update), matching the
 * fire-and-forget pattern used for every other non-critical side effect in
 * this codebase.
 */
export async function sendGatedCustomerEmail(params: {
    store: Pick<IStore, '_id' | 'name' | 'ownerId' | 'settings' | 'logo'>;
    type: StoreEmailTemplateType;
    customerEmail: string;
    vars: Record<string, string>;
    /** Short human description used in the merchant's zero-balance alert, e.g. "Order confirmation for order #1042 to jane@example.com". */
    context: string;
    /** Ledger description for the credit debit, e.g. "Order confirmation email for order #1042". */
    ledgerDescription: string;
    referenceId?: string;
}): Promise<void> {
    const { store, type, customerEmail, vars, context, ledgerDescription, referenceId } = params;

    try {
        const result = await CampaignQuotaService.debitTransactional(store._id, ledgerDescription, referenceId);

        if (!result.debited) {
            // Store is out of email credits — the customer is deliberately
            // NOT emailed here (per the merchant's own request: don't risk
            // an unexpected charge from an over-limit send). Alert the
            // merchant instead so they know to follow up / top up.
            const owner = await User.findById(store.ownerId).select('email').lean();
            if (owner?.email) {
                await sendZeroBalanceSkippedEmailAlert(owner.email, store.name, context).catch((err) =>
                    console.error('[orderEmailService] Failed to send zero-balance alert:', err)
                );
            }
            return;
        }

        await sendStoreTemplatedEmail(customerEmail, store, type, vars).catch((err) =>
            console.error(`[orderEmailService] Failed to send ${type} email to customer:`, err)
        );

        if (result.justCrossedLowThreshold) {
            const owner = await User.findById(store.ownerId).select('email').lean();
            if (owner?.email) {
                await sendLowEmailBalanceAlert(owner.email, store.name, result.newBalance).catch((err) =>
                    console.error('[orderEmailService] Failed to send low-balance alert:', err)
                );
            }
        }
    } catch (err) {
        console.error('[orderEmailService] sendGatedCustomerEmail failed:', err);
    }
}
