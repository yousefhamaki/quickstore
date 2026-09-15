import api from './api';
import customerApi from './customerApi';
import { getCustomerToken } from './customerAuthService';

export interface PublicReview {
    _id: string;
    customerName: string;
    rating: number;
    title?: string;
    comment: string;
    merchantReply?: { message: string; repliedAt: string };
    createdAt: string;
}

export const getProductReviews = async (productId: string, page = 1): Promise<{
    reviews: PublicReview[];
    pagination: { page: number; limit: number; total: number; pages: number };
}> => {
    const response = await api.get(`/public/products/${productId}/reviews?page=${page}`);
    return response.data as any;
};

export const submitReview = async (productId: string, data: {
    storeId: string;
    orderNumber: string;
    email: string;
    rating: number;
    title?: string;
    comment: string;
}): Promise<{ message: string; review: { _id: string; status: string } }> => {
    const response = await api.post(`/public/products/${productId}/reviews`, data);
    return response.data as any;
};

// Same endpoint as submitReview, but for an already-logged-in customer:
// no orderNumber/email needed since the backend verifies purchase against
// their own order history via the Bearer token. Goes through `customerApi`
// (not the shared `api` instance) so the token isn't clobbered by that
// client's merchant/admin-token interceptor — see customerApi.ts.
export const submitReviewAsCustomer = async (productId: string, storeId: string, data: {
    rating: number;
    title?: string;
    comment: string;
}): Promise<{ message: string; review: { _id: string; status: string } }> => {
    const token = getCustomerToken(storeId);
    const response = await customerApi.post(
        `/public/products/${productId}/reviews`,
        { storeId, ...data },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
    );
    return response.data as any;
};

// --- Merchant-side moderation ---

export interface MerchantReview extends Omit<PublicReview, 'customerName'> {
    storeId: string;
    productId: { _id: string; name: string; images?: { url: string }[] };
    customerName: string;
    status: 'pending' | 'approved' | 'rejected';
}

export const getMerchantReviews = async (params: { storeId: string; status?: string; page?: number }): Promise<{
    reviews: MerchantReview[];
    pagination: { page: number; limit: number; total: number; pages: number };
}> => {
    const search = new URLSearchParams();
    search.set('storeId', params.storeId);
    if (params.status) search.set('status', params.status);
    if (params.page) search.set('page', String(params.page));
    const response = await api.get(`/reviews?${search.toString()}`);
    return response.data as any;
};

export const updateReviewStatus = async (id: string, storeId: string, status: 'approved' | 'rejected') => {
    const response = await api.put(`/reviews/${id}/status`, { status, storeId });
    return response.data;
};

export const replyToReview = async (id: string, storeId: string, message: string) => {
    const response = await api.post(`/reviews/${id}/reply`, { message, storeId });
    return response.data;
};

export const deleteReview = async (id: string, storeId: string) => {
    const response = await api.delete(`/reviews/${id}`, { data: { storeId } } as any);
    return response.data;
};
