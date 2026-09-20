import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './authContext';
import { getMyStores } from './services/store';
import { Store } from './types';

interface StoreContextValue {
  store: Store | null;
  storeId: string | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  setStore: (store: Store) => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

/**
 * Most product/coupon/store-settings endpoints resolve "the merchant's
 * store" implicitly (see backend authMiddleware.ts's resolveStore — it falls
 * back to the merchant's only store when nothing else identifies one), but a
 * couple of endpoints need the id explicitly: product creation (billing's
 * product-limit check reads req.body.storeId directly) and the coupons list
 * (storeId is a required query param). Rather than every new screen
 * fetching GET /stores itself, this loads it once after login (this app
 * only ever surfaces a merchant's first/only store — consistent with the
 * rest of the app's single-store assumptions, e.g. the Profile tab's
 * `usage.storesUsed` display) and shares it.
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const stores = await getMyStores();
      setStore(stores[0] || null);
    } catch {
      // Leave the last known store on a transient failure.
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else setStore(null);
  }, [isAuthenticated, refresh]);

  const value = useMemo<StoreContextValue>(
    () => ({ store, storeId: store?._id || null, isLoading, refresh, setStore }),
    [store, isLoading, refresh]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
