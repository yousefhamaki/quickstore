import api from '../api';
import { LoginResponse } from '../types';

export async function login(email: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
  return data;
}

export async function verifyTwoFactorLogin(
  challengeToken: string,
  codeOrBackup: { code?: string; backupCode?: string }
): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/security/2fa/verify-login', {
    challengeToken,
    ...codeOrBackup,
  });
  return data;
}

// Used internally by lib/api.ts's response interceptor — exposed here too
// since callers may want to pre-emptively refresh.
export async function refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
  const { data } = await api.post('/auth/refresh', { refreshToken });
  return data;
}

export async function logout(): Promise<void> {
  await api.post('/security/logout');
}

export interface Profile {
  _id: string;
  name: string;
  email: string;
  role: string;
  subscriptionPlan?: { name: string };
}

export async function getProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>('/auth/profile');
  return data;
}
