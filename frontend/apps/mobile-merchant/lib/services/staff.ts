import api from '../api';
import { StoreStaffMember, StoreStaffRole } from '../types';

// GET /api/stores/:storeId/staff — owner-only (backend 403s a manager/staff
// account; the Team screen itself is only reachable by the owner, see
// app/(tabs)/profile/index.tsx's role gate).
export async function getStoreStaff(storeId: string): Promise<StoreStaffMember[]> {
  const { data } = await api.get<{ staff: StoreStaffMember[] }>(`/stores/${storeId}/staff`);
  return data.staff;
}

export interface InviteStaffPayload {
  email: string;
  role: StoreStaffRole;
}

export interface InviteStaffResponse {
  message: string;
  emailSent: boolean;
  emailError?: string;
  acceptUrl: string;
  staff: StoreStaffMember;
}

// POST /api/stores/:storeId/staff/invite — creates (or refreshes) a pending
// invite and emails an accept link. `emailSent` can be false even though the
// invite itself was created (e.g. the sending account hit its provider
// quota) — callers must check it and surface `emailError` + `acceptUrl`
// rather than assuming a generic success, since the link is the only way the
// owner can get the invite to the teammate when the email didn't go out.
export async function inviteStoreStaff(storeId: string, payload: InviteStaffPayload): Promise<InviteStaffResponse> {
  const { data } = await api.post<InviteStaffResponse>(`/stores/${storeId}/staff/invite`, payload);
  return data;
}

// DELETE /api/stores/:storeId/staff/:staffId — soft-delete (status becomes
// 'removed' server-side); listStaff already filters those out so the row
// simply disappears from the next load.
export async function removeStoreStaff(storeId: string, staffId: string): Promise<void> {
  await api.delete(`/stores/${storeId}/staff/${staffId}`);
}
