import api from './api';

export const getCustomers = async (storeId?: string, search?: string, pageNumber: number = 1, consentStatus?: string) => {
    const params: any = { pageNumber };
    if (storeId) params.storeId = storeId;
    if (search) params.search = search;
    if (consentStatus) params.consentStatus = consentStatus;

    const response = await api.get('/customers', { params });
    return response.data;
};

export const getCustomerById = async (id: string) => {
    const response = await api.get(`/customers/${id}`);
    return response.data;
};
