import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// expo-secure-store keys must match /^[A-Za-z0-9._-]+$/ — plain constants are fine.
const ACCESS_TOKEN_KEY = 'buildora_access_token';
const REFRESH_TOKEN_KEY = 'buildora_refresh_token';

// expo-secure-store's native module isn't available on the web target (only
// used here for the `expo start --web` verification path — a real device
// always takes the SecureStore branch below), so fall back to localStorage
// there. Native iOS/Android always goes through SecureStore, which is the
// one that matters for the real app.
const isWeb = Platform.OS === 'web';

// Exported so other small pieces of per-device state (e.g. storeStorage.ts's
// "last selected store" id) can follow the exact same SecureStore-with-a-web-
// fallback convention instead of re-implementing the isWeb branching.
export async function getItem(key: string): Promise<string | null> {
  if (isWeb) return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([setItem(ACCESS_TOKEN_KEY, accessToken), setItem(REFRESH_TOKEN_KEY, refreshToken)]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([deleteItem(ACCESS_TOKEN_KEY), deleteItem(REFRESH_TOKEN_KEY)]);
}
