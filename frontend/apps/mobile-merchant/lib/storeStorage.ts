import { getItem, setItem, deleteItem } from './tokenStorage';

// Same SecureStore-with-web-fallback mechanism as tokenStorage.ts (this key
// just isn't a credential) — persists the merchant's last-picked store
// across app restarts, the same way the access/refresh tokens survive them.
const SELECTED_STORE_KEY = 'buildora_selected_store_id';

export async function getSelectedStoreId(): Promise<string | null> {
  return getItem(SELECTED_STORE_KEY);
}

export async function setSelectedStoreId(storeId: string): Promise<void> {
  await setItem(SELECTED_STORE_KEY, storeId);
}

export async function clearSelectedStoreId(): Promise<void> {
  await deleteItem(SELECTED_STORE_KEY);
}
