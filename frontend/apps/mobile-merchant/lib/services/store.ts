import api from '../api';
import { Store } from '../types';

// GET /api/stores returns a raw array (merchant's own stores), not wrapped.
export async function getMyStores(): Promise<Store[]> {
  const { data } = await api.get<Store[]>('/stores');
  return data;
}

export async function getStore(id: string): Promise<Store> {
  const { data } = await api.get<Store>(`/stores/${id}`);
  return data;
}

// PUT /api/stores/:id is the ONE generic update endpoint for every section
// (name/description/category/logo/branding/contact/settings/theme/seo) — the
// backend whitelists top-level keys and applies whichever are present, so
// callers only need to send the section(s) they changed.
export async function updateStore(id: string, payload: Partial<Store>): Promise<Store> {
  const { data } = await api.put<Store>(`/stores/${id}`, payload);
  return data;
}

export interface LogoUploadResponse {
  message: string;
  logo: { url: string; publicId: string };
  favicon: { url: string; publicId: string };
}

// POST /api/stores/:id/upload-logo — multipart, field name "logo" (single file).
export async function uploadStoreLogo(id: string, fileUri: string, fileName: string, mimeType: string): Promise<LogoUploadResponse> {
  const form = new FormData();
  form.append('logo', { uri: fileUri, name: fileName, type: mimeType } as any);
  const { data } = await api.post<LogoUploadResponse>(`/stores/${id}/upload-logo`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}
