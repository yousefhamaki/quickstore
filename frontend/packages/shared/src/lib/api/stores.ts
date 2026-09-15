import api from '@shared/services/api';
import { Store, CreateStoreData, OnboardingChecklist } from '@shared/types/store';

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

export const deleteStore = async (
    { id, password, transferCreditsToStoreId }: { id: string; password?: string; transferCreditsToStoreId?: string }
): Promise<void> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await api.delete(`/stores/${id}`, { data: { password, transferCreditsToStoreId } } as any);
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

export const uploadStoreLogo = async (id: string, formData: FormData): Promise<{ message: string; logo: any; favicon: any }> => {
    const { data } = await api.post<{ message: string; logo: any; favicon: any }>(`/stores/${id}/upload-logo`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};

export const uploadEmailBlockImage = async (id: string, formData: FormData): Promise<{ url: string; publicId: string }> => {
    const { data } = await api.post<{ url: string; publicId: string }>(`/stores/${id}/email-blocks/upload-image`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return data;
};

export interface EmailSenderTestPayload {
    host: string;
    port: number;
    secure: boolean;
    username: string;
    password: string;
    fromEmail?: string;
    fromName?: string;
    sendTestEmail?: boolean;
}

export const testEmailSender = async (id: string, payload: EmailSenderTestPayload): Promise<{ ok: boolean; error?: string }> => {
    try {
        const { data } = await api.post<{ ok: boolean }>(`/stores/${id}/email-sender/test`, payload);
        return data;
    } catch (err: any) {
        return { ok: false, error: err?.response?.data?.error || 'Connection failed' };
    }
};

export interface CustomDomainVerification {
    type: 'TXT';
    host: string;
    value: string;
}

interface SetCustomDomainResponse {
    message: string;
    customDomain: string;
    verification: CustomDomainVerification;
    isVerified: boolean;
}

export const setCustomDomain = async (id: string, customDomain: string): Promise<SetCustomDomainResponse> => {
    const { data } = await api.post<SetCustomDomainResponse>(`/stores/${id}/domain`, { customDomain });
    return data;
};

export const verifyCustomDomain = async (id: string): Promise<{ isVerified: boolean; message?: string }> => {
    const { data } = await api.post<{ isVerified: boolean; message?: string }>(`/stores/${id}/domain/verify`);
    return data;
};

export const removeCustomDomain = async (id: string): Promise<{ message: string }> => {
    const { data } = await api.delete<{ message: string }>(`/stores/${id}/domain`);
    return data;
};
