import api from './api';

export interface MerchantRefundRequest {
    _id: string;
    storeId: string;
    orderId: { _id: string; orderNumber: string; total: number; refundedAmount: number; paymentStatus: string };
    customerId: { _id: string; firstName?: string; lastName?: string; email: string };
    requestedAmount: number;
    reason: string;
    photoUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    finalAmount?: number;
    merchantResponseNote?: string;
    resolvedAt?: string;
    createdAt: string;
}

export const getRefundRequests = async (storeId: string, status?: string): Promise<MerchantRefundRequest[]> => {
    const params = new URLSearchParams({ storeId });
    if (status) params.set('status', status);
    const response = await api.get<MerchantRefundRequest[]>(`/refund-requests?${params.toString()}`);
    return response.data;
};

export const approveRefundRequest = async (id: string, amount: number, note?: string): Promise<MerchantRefundRequest> => {
    const response = await api.put<MerchantRefundRequest>(`/refund-requests/${id}/approve`, { amount, note });
    return response.data;
};

export const rejectRefundRequest = async (id: string, note: string): Promise<MerchantRefundRequest> => {
    const response = await api.put<MerchantRefundRequest>(`/refund-requests/${id}/reject`, { note });
    return response.data;
};
