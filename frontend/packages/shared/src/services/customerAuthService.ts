import customerApi from './customerApi';

export interface CustomerAddress {
    _id?: string;
    fullName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    isDefault: boolean;
}

export interface Customer {
    _id: string;
    storeId: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    addresses: CustomerAddress[];
    createdAt: string;
}

// Session token is namespaced per store — a shopper can hold separate
// accounts (and thus separate sessions) on any number of Buildora stores in
// the same browser, mirroring the same per-store convention CartContext
// already uses for `quickstore_cart_${storeId}`.
const tokenKey = (storeId: string) => `quickstore_customer_token_${storeId}`;

export const getCustomerToken = (storeId: string): string | null => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(tokenKey(storeId));
};

export const setCustomerToken = (storeId: string, token: string) => {
    localStorage.setItem(tokenKey(storeId), token);
};

export const clearCustomerToken = (storeId: string) => {
    localStorage.removeItem(tokenKey(storeId));
};

const authHeaders = (storeId: string) => {
    const token = getCustomerToken(storeId);
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const registerCustomer = async (
    storeId: string,
    data: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }
): Promise<{ token: string; customer: Customer }> => {
    const res = await customerApi.post<{ token: string; customer: Customer }>(`/account/${storeId}/register`, data);
    return res.data;
};

export const loginCustomer = async (
    storeId: string,
    email: string,
    password: string
): Promise<{ token: string; customer: Customer }> => {
    const res = await customerApi.post<{ token: string; customer: Customer }>(`/account/${storeId}/login`, { email, password });
    return res.data;
};

export const getMyProfile = async (storeId: string): Promise<Customer> => {
    const res = await customerApi.get<Customer>(`/account/${storeId}/me`, { headers: authHeaders(storeId) });
    return res.data;
};

export const updateMyProfile = async (
    storeId: string,
    data: { firstName?: string; lastName?: string; phone?: string }
): Promise<Customer> => {
    const res = await customerApi.put<Customer>(`/account/${storeId}/me`, data, { headers: authHeaders(storeId) });
    return res.data;
};

export const changeMyPassword = async (
    storeId: string,
    currentPassword: string,
    newPassword: string
): Promise<void> => {
    await customerApi.put(`/account/${storeId}/me/password`, { currentPassword, newPassword }, { headers: authHeaders(storeId) });
};

export const addMyAddress = async (storeId: string, address: Omit<CustomerAddress, '_id'>): Promise<Customer> => {
    const res = await customerApi.post<Customer>(`/account/${storeId}/addresses`, address, { headers: authHeaders(storeId) });
    return res.data;
};

export const updateMyAddress = async (
    storeId: string,
    addressId: string,
    address: Partial<CustomerAddress>
): Promise<Customer> => {
    const res = await customerApi.put<Customer>(`/account/${storeId}/addresses/${addressId}`, address, { headers: authHeaders(storeId) });
    return res.data;
};

export const deleteMyAddress = async (storeId: string, addressId: string): Promise<Customer> => {
    const res = await customerApi.delete<Customer>(`/account/${storeId}/addresses/${addressId}`, { headers: authHeaders(storeId) });
    return res.data;
};

export const getMyOrders = async (storeId: string): Promise<any[]> => {
    const res = await customerApi.get<any[]>(`/account/${storeId}/orders`, { headers: authHeaders(storeId) });
    return res.data;
};

export const getMyOrderById = async (storeId: string, orderId: string): Promise<any> => {
    const res = await customerApi.get<any>(`/account/${storeId}/orders/${orderId}`, { headers: authHeaders(storeId) });
    return res.data;
};

export const requestPasswordReset = async (storeId: string, email: string): Promise<{ message: string }> => {
    const res = await customerApi.post<{ message: string }>(`/account/${storeId}/forgot-password`, { email });
    return res.data;
};

export const resetPassword = async (
    storeId: string,
    token: string,
    newPassword: string
): Promise<{ message: string; token: string; customer: Customer }> => {
    const res = await customerApi.post<{ message: string; token: string; customer: Customer }>(
        `/account/${storeId}/reset-password`,
        { token, newPassword }
    );
    return res.data;
};

export interface RefundRequest {
    _id: string;
    orderId: string;
    requestedAmount: number;
    reason: string;
    photoUrl?: string;
    status: 'pending' | 'approved' | 'rejected';
    finalAmount?: number;
    merchantResponseNote?: string;
    resolvedAt?: string;
    createdAt: string;
}

export const uploadRefundEvidencePhoto = async (storeId: string, file: File): Promise<{ url: string; publicId: string }> => {
    const formData = new FormData();
    formData.append('photo', file);
    const res = await customerApi.post<{ url: string; publicId: string }>(`/account/${storeId}/upload`, formData, {
        headers: { ...authHeaders(storeId), 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
};

export const createRefundRequest = async (
    storeId: string,
    orderId: string,
    data: { amount: number; reason: string; photoUrl?: string; photoPublicId?: string }
): Promise<RefundRequest> => {
    const res = await customerApi.post<RefundRequest>(
        `/account/${storeId}/orders/${orderId}/refund-requests`,
        data,
        { headers: authHeaders(storeId) }
    );
    return res.data;
};

export const getMyRefundRequests = async (storeId: string, orderId?: string): Promise<RefundRequest[]> => {
    const res = await customerApi.get<RefundRequest[]>(
        `/account/${storeId}/refund-requests${orderId ? `?orderId=${orderId}` : ''}`,
        { headers: authHeaders(storeId) }
    );
    return res.data;
};
