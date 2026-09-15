import { IStore } from '../../models/Store';
import User from '../../models/User';
import { WhatsAppCreditService } from '../WhatsAppCreditService';
import { sendWhatsAppMessage } from './whatsappSender';
import { resolveWhatsAppTemplate, interpolateTokens, WhatsAppMessageType } from './whatsappTemplates';
import { sendWhatsAppZeroBalanceAlert } from '../emailService';

/**
 * Single entry point for every store-customizable transactional WhatsApp
 * message (order confirmation, order status changed) — mirrors
 * services/orderEmailService.ts's sendGatedCustomerEmail exactly, credit
 * source swapped to WhatsAppCreditService. Callers should NOT call
 * WhatsAppCreditService.debitTransactional or sendWhatsAppMessage directly
 * for these — route through here so the gating rule is enforced in
 * exactly one place: balance > 0 -> debit 1 credit, message the customer;
 * balance == 0 -> nothing debited, alert the merchant instead.
 *
 * Never throws — a failed WhatsApp send must never fail the caller's
 * primary request (order creation/status update), matching the
 * fire-and-forget pattern used for every other non-critical side effect.
 */
export async function sendGatedWhatsAppMessage(params: {
    store: Pick<IStore, '_id' | 'name' | 'ownerId' | 'settings'>;
    type: WhatsAppMessageType;
    customerPhone: string;
    vars: Record<string, string>;
    /** Short human description used in the merchant's zero-balance alert, e.g. "Order confirmation for order #1042 to +20123456789". */
    context: string;
    /** Ledger description for the credit debit, e.g. "Order confirmation WhatsApp message for order #1042". */
    ledgerDescription: string;
    referenceId?: string;
}): Promise<void> {
    const { store, type, customerPhone, vars, context, ledgerDescription, referenceId } = params;

    try {
        const result = await WhatsAppCreditService.debitTransactional(store._id, ledgerDescription, referenceId);

        if (!result.debited) {
            const owner = await User.findById(store.ownerId).select('email').lean();
            if (owner?.email) {
                await sendWhatsAppZeroBalanceAlert(owner.email, store.name, context).catch((err) =>
                    console.error('[whatsappMessageService] Failed to send zero-balance alert:', err)
                );
            }
            return;
        }

        const allVars = { storeName: store.name, ...vars };
        const template = resolveWhatsAppTemplate(store, type);
        const body = interpolateTokens(template, allVars);

        const sendResult = await sendWhatsAppMessage(store._id.toString(), {
            to: customerPhone,
            category: type === 'marketing' ? 'marketing' : 'utility',
            body
        });

        if (!sendResult.ok) {
            console.error(`[whatsappMessageService] Failed to send ${type} WhatsApp message:`, sendResult.error);
        }
    } catch (err) {
        console.error('[whatsappMessageService] sendGatedWhatsAppMessage failed:', err);
    }
}
