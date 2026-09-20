import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokenStorage';
import { triggerForceLogout } from './authEvents';

// app.json's expo.extra.apiUrl is the single place this is configured —
// override it per-environment (e.g. a physical device on the same LAN
// needs the machine's LAN IP, not localhost) via EXPO_PUBLIC_API_URL.
const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ||
  'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Bearer-token auth only (no cookies) — see backend authMiddleware.ts. On a
// 401, attempt exactly one refresh using the stored refresh token, retry the
// original request once, or force the user back to login on failure.
let refreshPromise: Promise<string | null> | null = null;

async function performRefresh(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
    if (data?.token && data?.refreshToken) {
      await setTokens(data.token, data.refreshToken);
      return data.token as string;
    }
    return null;
  } catch {
    return null;
  }
}

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableConfig | undefined;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retried && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retried = true;

      // Coalesce concurrent 401s into a single refresh call.
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      const newAccessToken = await refreshPromise;

      if (newAccessToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      }

      // Refresh failed (expired/invalid/reused refresh token) — clear
      // whatever's left and force the user back to the login screen.
      await clearTokens();
      triggerForceLogout();
    }

    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
