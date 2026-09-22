import api from '@shared/services/api';

export type StoreStaffRole = 'manager' | 'staff';
export type StoreStaffStatus = 'pending' | 'active' | 'removed';

export interface StoreStaffMember {
    _id: string;
    email: string;
    role: StoreStaffRole;
    status: StoreStaffStatus;
    invitedAt: string;
    acceptedAt?: string;
    user: { _id: string; name: string; email: string } | null;
}

export const getStoreStaff = async (storeId: string): Promise<StoreStaffMember[]> => {
    const { data } = await api.get<{ staff: StoreStaffMember[] }>(`/stores/${storeId}/staff`);
    return data.staff;
};

export const inviteStoreStaff = async (
    storeId: string,
    payload: { email: string; role: StoreStaffRole }
): Promise<StoreStaffMember> => {
    const { data } = await api.post<{ staff: StoreStaffMember }>(`/stores/${storeId}/staff/invite`, payload);
    return data.staff;
};

export const removeStoreStaff = async (storeId: string, staffId: string): Promise<void> => {
    await api.delete(`/stores/${storeId}/staff/${staffId}`);
};

export interface AcceptInvitePayload {
    token: string;
    email: string;
    name?: string;
    password?: string;
}

export interface AcceptInviteResponse {
    message: string;
    token: string;
    refreshToken: string;
    user: { _id: string; name: string; email: string; role: string };
    store: { _id: string; name: string } | null;
    storeRole: StoreStaffRole;
}

export const acceptStaffInvite = async (payload: AcceptInvitePayload): Promise<AcceptInviteResponse> => {
    const { data } = await api.post<AcceptInviteResponse>('/staff/accept-invite', payload);
    return data;
};
