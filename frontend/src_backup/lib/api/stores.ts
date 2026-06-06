import api from '@/services/api';
import { Store, CreateStoreData, OnboardingChecklist } from '@/types/store';

export const getStores = async (): Promise<Store[]> => {
    const { data } = await api.get<Store[]>('/stores');
    return data;
};

export const getStore = async (id: string): Promise<Store> => {
    const { data } = await api.get<Store>(`/stores/${id}`);
    return data;
};

export const createStore = async (storeData: CreateStoreData): Promise<Store> => {
    const { data } = await api.post<Store>('/stores', storeData);
    return data;
};

export const updateStore = async (id: string, storeData: Partial<Store>): Promise<Store> => {
    const { data } = await api.put<Store>(`/stores/${id}`, storeData);
    return data;
};

export const deleteStore = async (id: string): Promise<void> => {
    await api.delete(`/stores/${id}`);
};

export const publishStore = async (id: string): Promise<{ message: string; store: Store; storeUrl: string }> => {
    const { data } = await api.post<{ message: string; store: Store; storeUrl: string }>(`/stores/${id}/publish`);
    return data;
};

export const pauseStore = async (id: string): Promise<Store> => {
    const { data } = await api.post<Store>(`/stores/${id}/pause`);
    return data;
};

export const resumeStore = async (id: string): Promise<Store> => {
    const { data } = await api.post<Store>(`/stores/${id}/resume`);
    return data;
};

export const generatePreviewToken = async (id: string): Promise<{ token: string; expiresAt: Date; previewUrl: string }> => {
    const { data } = await api.post<{ token: string; expiresAt: Date; previewUrl: string }>(`/stores/${id}/preview-token`);
    return data;
};

export const checkSubdomainAvailability = async (subdomain: string): Promise<{ available: boolean; message: string }> => {
    const { data } = await api.get<{ available: boolean; message: string }>(`/stores/check-subdomain/${subdomain}`);
    return data;
};

export const getStoreChecklist = async (id: string): Promise<OnboardingChecklist> => {
    const { data } = await api.get<OnboardingChecklist>(`/stores/${id}/checklist`);
    return data;
};
