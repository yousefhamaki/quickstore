import api from './api';

export interface CaptureAbandonedCartPayload {
    sessionId: string;
    customerEmail: string;
    customerName?: string;
    customerPhone?: string;
    items: any[];
    totalAmount: number;
}

/**
 * Upserts the shopper's in-progress cart as an abandoned-cart record, keyed
 * by the storefront's stable `storefront_session` id — see checkout/
 * page.tsx for the call sites (email field blur + cart changes once step
 * >= 2) and backend/src/controllers/abandonedCartController.ts's
 * captureAbandonedCart for the upsert behavior. Best-effort: callers should
 * swallow failures rather than surface them to the shopper.
 */
export const captureAbandonedCart = async (storeId: string, payload: CaptureAbandonedCartPayload) => {
    const response = await api.post(`/public/stores/${storeId}/abandoned-cart`, payload);
    return response.data;
};

export interface AbandonedCartRecoveryData {
    success: boolean;
    items: any[];
    totalAmount: number;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
}

/**
 * Looks up a saved cart by its recovery token (from a recovery email's
 * `?recover=` link) so the checkout page can repopulate the cart even if the
 * shopper's own browser localStorage no longer has it.
 */
export const getAbandonedCartByToken = async (storeId: string, token: string): Promise<AbandonedCartRecoveryData> => {
    const response = await api.get(`/public/stores/${storeId}/abandoned-cart/${token}`);
    return response.data as AbandonedCartRecoveryData;
};
