import api from './api';

// ============================================================================
// Password
// ============================================================================

export const changePassword = async (currentPassword: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.put('/security/change-password', { currentPassword, newPassword });
    return response.data as { message: string };
};

// ============================================================================
// Sessions
// ============================================================================

export interface ActiveSession {
    _id: string;
    deviceLabel: string;
    ip: string;
    createdAt: string;
    lastActiveAt: string;
    isCurrent: boolean;
}

export const getActiveSessions = async (): Promise<ActiveSession[]> => {
    const response = await api.get<ActiveSession[]>('/security/sessions');
    return response.data;
};

export const revokeSession = async (sessionId: string): Promise<{ message: string }> => {
    const response = await api.delete(`/security/sessions/${sessionId}`);
    return response.data as { message: string };
};

export const revokeAllOtherSessions = async (): Promise<{ message: string; count: number }> => {
    const response = await api.post('/security/sessions/revoke-others');
    return response.data as { message: string; count: number };
};

export const logoutSession = async (): Promise<void> => {
    await api.post('/security/logout');
};

// ============================================================================
// Login History
// ============================================================================

export interface LoginHistoryEntry {
    _id: string;
    success: boolean;
    reason?: string;
    ip: string;
    deviceLabel: string;
    createdAt: string;
}

export interface LoginHistoryResponse {
    entries: LoginHistoryEntry[];
    pagination: { page: number; limit: number; total: number; pages: number };
}

export const getLoginHistory = async (page = 1, limit = 20): Promise<LoginHistoryResponse> => {
    const response = await api.get<LoginHistoryResponse>(`/security/login-history?page=${page}&limit=${limit}`);
    return response.data;
};

// ============================================================================
// Two-Factor Authentication — setup / management
// ============================================================================

export const setupTotp = async (): Promise<{ qrCodeDataUrl: string; manualEntryKey: string }> => {
    const response = await api.post('/security/2fa/totp/setup');
    return response.data as { qrCodeDataUrl: string; manualEntryKey: string };
};

export const verifyTotpSetup = async (code: string): Promise<{ message: string; backupCodes: string[] }> => {
    const response = await api.post('/security/2fa/totp/verify-setup', { code });
    return response.data as { message: string; backupCodes: string[] };
};

export const enableEmailTwoFactor = async (password: string): Promise<{ message: string; backupCodes: string[] }> => {
    const response = await api.post('/security/2fa/email/enable', { password });
    return response.data as { message: string; backupCodes: string[] };
};

export const disableTwoFactor = async (password: string): Promise<{ message: string }> => {
    const response = await api.post('/security/2fa/disable', { password });
    return response.data as { message: string };
};

export const regenerateBackupCodes = async (password: string): Promise<{ backupCodes: string[] }> => {
    const response = await api.post('/security/2fa/backup-codes/regenerate', { password });
    return response.data as { backupCodes: string[] };
};

// ============================================================================
// Two-Factor Authentication — the login-time challenge
// ============================================================================

export interface TwoFactorLoginResult {
    _id: string;
    name: string;
    email: string;
    role: string;
    isVerified: boolean;
    token: string;
    usedBackupCode?: boolean;
    backupCodesRemaining?: number;
}

export const verifyTwoFactorLogin = async (
    challengeToken: string,
    codeOrBackup: { code: string } | { backupCode: string }
): Promise<TwoFactorLoginResult> => {
    const response = await api.post('/security/2fa/verify-login', { challengeToken, ...codeOrBackup });
    return response.data as TwoFactorLoginResult;
};

export const resendTwoFactorEmailCode = async (challengeToken: string): Promise<{ message: string }> => {
    const response = await api.post('/security/2fa/resend-email-code', { challengeToken });
    return response.data as { message: string };
};
