import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from './tokenStorage';
import { onForceLogout } from './authEvents';
import { registerForPushNotificationsAsync, unregisterPushToken } from './push';
import * as authService from './services/auth';
import { LoginSuccess } from './types';

interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isVerified: boolean;
  planName?: string;
}

interface AuthContextValue {
  isLoading: boolean; // still checking for a stored session on boot
  isAuthenticated: boolean;
  user: AuthUser | null;
  completeLogin: (payload: LoginSuccess) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    (async () => {
      const [accessToken, refreshToken] = await Promise.all([getAccessToken(), getRefreshToken()]);
      // We don't persist the user's profile fields (only the tokens), so a
      // fresh app launch/reload with a stored session fetches them once
      // here — otherwise a returning merchant would see a blank name/email
      // until their next full login. A truly invalid/expired token pair is
      // still caught by the very first authenticated request's 401 ->
      // refresh -> force-logout flow (lib/api.ts), so this fetch failing
      // isn't fatal on its own either.
      if (accessToken && refreshToken) {
        setUser({ _id: 'unknown', name: '', email: '', role: 'merchant', isVerified: true });
        try {
          const profile = await authService.getProfile();
          setUser({
            _id: profile._id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            isVerified: true,
            planName: profile.subscriptionPlan?.name,
          });
        } catch {
          // Session may genuinely be dead — the 401 interceptor already
          // handles that by clearing tokens and force-logging-out; leave
          // the placeholder user in place otherwise (e.g. transient
          // network error) so the app still opens.
        }
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    onForceLogout(() => {
      setUser(null);
    });
  }, []);

  const completeLogin = async (payload: LoginSuccess) => {
    await setTokens(payload.token, payload.refreshToken);
    setUser({
      _id: payload._id,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      isVerified: payload.isVerified,
      planName: payload.subscriptionPlan?.name,
    });
    // Fire-and-forget — must never block getting the merchant into the app.
    registerForPushNotificationsAsync().catch(() => {});
  };

  const logout = async () => {
    await unregisterPushToken();
    try {
      await authService.logout();
    } catch {
      // Even if the server call fails (network blip, already-expired
      // token), still clear local state so the user isn't stuck.
    }
    await clearTokens();
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({ isLoading, isAuthenticated: !!user, user, completeLogin, logout }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
