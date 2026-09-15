import api from './api';

export type WhatsAppConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'logged_out';

export interface WhatsAppStatusResponse {
    status: WhatsAppConnectionStatus;
    qrCode: string | null;
    phoneNumber: string | null;
    displayName: string | null;
}

export interface WhatsAppLedgerEntry {
    _id: string;
    storeId: string;
    type: 'monthly_grant' | 'purchase' | 'transactional_debit' | 'correction' | 'expired';
    amount: number;
    referenceId?: string;
    description: string;
    createdAt: string;
}

export interface WhatsAppAccountBalanceResponse {
    balance: number;
    planBalance: number;
    purchasedBalance: number;
    reserved: number;
    planIsActive: boolean;
    planRefreshAt: string;
    ledgerHistory: WhatsAppLedgerEntry[];
}

export const connectWhatsApp = async (storeId: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(`/stores/${storeId}/whatsapp/connect`);
    return data;
};

export const getWhatsAppStatus = async (storeId: string): Promise<WhatsAppStatusResponse> => {
    const { data } = await api.get<WhatsAppStatusResponse>(`/stores/${storeId}/whatsapp/status`);
    return data;
};

export const disconnectWhatsApp = async (storeId: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>(`/stores/${storeId}/whatsapp/disconnect`);
    return data;
};

export const getWhatsAppAccountBalance = async (storeId: string): Promise<WhatsAppAccountBalanceResponse> => {
    const { data } = await api.get<WhatsAppAccountBalanceResponse>(`/stores/${storeId}/whatsapp/account`);
    return data;
};
