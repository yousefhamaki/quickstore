import { IPaymentProvider } from './IPaymentProvider';
import { IOrder } from '../../models/Order';
import { IStore } from '../../models/Store';

/**
 * UNFINISHED — not reachable in production. See StripePaymentService.ts for
 * why: fake checkout URL, and validateWebhookPayload() accepts any
 * signature. Blocked at PaymentFactory + Store schema/storeController level
 * (constants/paymentProviders.ts) until this has a real implementation.
 * (Unrelated to the Paymob-mediated 'fawry' wallet-recharge method in
 * billingController.ts/rechargeWallet — that path is real and unaffected.)
 */
export class FawryPaymentService implements IPaymentProvider {
    private merchantCode: string;
    private secureKey: string;
    
    constructor(merchantCode: string, secureKey: string) {
        this.merchantCode = merchantCode;
        this.secureKey = secureKey;
    }

    async initializePayment(order: IOrder, store: IStore): Promise<{ paymentUrl: string; transactionId: string }> {
        // FawryPay Skeleton implementation: Maps to Fawry atFawry REST intent
        return {
            paymentUrl: `https://atfawry.com/ECommercePlugin/FawryPay.jsp?chargeRequest=PLACEHOLDER`,
            transactionId: `FAWRY_REF_${order._id}`
        };
    }

    validateWebhookPayload(payload: any, signature: string): boolean {
        // Skeleton logic for Fawry's MD5/SHA256 signature verification array
        if (!this.secureKey) return false;
        return true; 
    }
}
