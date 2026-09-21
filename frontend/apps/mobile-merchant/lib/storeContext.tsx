import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './authContext';
import { getMyStores } from './services/store';
import { getSelectedStoreId, setSelectedStoreId, clearSelectedStoreId } from './storeStorage';
import { setActiveStoreId } from './api';
import { Store } from './types';

interface StoreContextValue {
  store: Store | null;
  storeId: string | null;
  stores: Store[];
  isLoading: boolean;
  /** True once the store list has been fetched at least once for the current
   *  authenticated session (whether that fetch succeeded or failed) — use
   *  this (not `isLoading`, which also toggles on later manual refreshes) to
   *  gate a one-time "still figuring out which store(s) this account has"
   *  loading screen without flickering on every subsequent refresh(). */
  initialized: boolean;
  /** True when the merchant owns more than one store and none is currently
   *  active — the app should show the store picker rather than guessing. */
  needsSelection: boolean;
  refresh: () => Promise<void>;
  selectStore: (store: Store) => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

/**
 * Most product/coupon/store-settings endpoints resolve "the merchant's
 * store" implicitly (see backend authMiddleware.ts's resolveStore — it reads
 * an `x-store-id` header/query/body/param first, then falls back to the
 * merchant's only store when nothing identifies one), but a couple of
 * endpoints need the id explicitly: product creation (billing's
 * product-limit check reads req.body.storeId directly) and the coupons list
 * (storeId is a required query param).
 *
 * This loads every store the merchant owns once after login, resolves which
 * one is "active" (the merchant's persisted pick, restored across restarts —
 * see storeStorage.ts — or their only store when they have just one), and
 * shares it. api.ts's axios instance is kept in sync (setActiveStoreId) so
 * the implicit-resolution endpoints above scope to the same store without
 * every call site needing to pass it. A merchant with more than one store
 * and no valid persisted pick gets `needsSelection: true` — the app then
 * routes them to the store picker (app/select-store.tsx) instead of silently
 * guessing which store they meant, which is the bug this replaced (it used
 * to just keep `stores[0]` and never surface that others existed).
 */
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [store, setStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const fetchedStores = await getMyStores();
      setStores(fetchedStores);

      if (fetchedStores.length <= 1) {
        // Single (or zero) store accounts: nothing to choose, so there's no
        // extra step — keep the common case exactly as frictionless as it
        // was before multi-store support existed.
        const only = fetchedStores[0] || null;
        setStore(only);
        if (only) await setSelectedStoreId(only._id);
      } else {
        const persistedId = await getSelectedStoreId();
        const match = persistedId ? fetchedStores.find((s) => s._id === persistedId) : undefined;
        // No match (first login on this device, a stale/deleted store id, or
        // simply never picked yet) leaves `store` null, which is exactly the
        // `needsSelection` signal the picker screen watches for.
        setStore(match || null);
      }
    } catch {
      // Leave the last known store(s) on a transient failure.
    } finally {
      setIsLoading(false);
      setInitialized(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refresh();
    } else if (!authLoading) {
      // Only treat this as a real logout (and wipe the persisted pick) once
      // AuthProvider has actually finished checking for a stored session —
      // `isAuthenticated` starts false on every app boot while that check is
      // in flight, and clearing here on that transient false would erase the
      // merchant's saved store before refresh() ever got a chance to read it
      // back, forcing the picker on every restart even for a real session.
      setStore(null);
      setStores([]);
      setInitialized(false);
      clearSelectedStoreId().catch(() => {});
    }
  }, [isAuthenticated, authLoading, refresh]);

  // Every request api.ts makes picks this up as the `x-store-id` header —
  // this is the one place that needs to know the active store changed.
  useEffect(() => {
    setActiveStoreId(store?._id || null);
  }, [store]);

  const selectStore = useCallback((next: Store) => {
    setStore(next);
    setSelectedStoreId(next._id).catch(() => {});
  }, []);

  const needsSelection = initialized && stores.length > 1 && !store;

  const value = useMemo<StoreContextValue>(
    () => ({ store, storeId: store?._id || null, stores, isLoading, initialized, needsSelection, refresh, selectStore }),
    [store, stores, isLoading, initialized, needsSelection, refresh, selectStore]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
