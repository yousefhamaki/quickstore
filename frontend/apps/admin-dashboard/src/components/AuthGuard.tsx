'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@shared/context/AuthContext';
import AdminLayout from './AdminLayout';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and first client hydration, render a stable loading screen to prevent mismatches
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-4">
        <Loader2 className="w-12 h-12 text-cyan-500 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Securing administrative workspace...</p>
      </div>
    );
  }

  // If not logged in, render the login page via AdminLayout and do not mount children (preventing queries)
  if (!user) {
    return <AdminLayout>{null}</AdminLayout>;
  }

  return <>{children}</>;
}

export default AuthGuard;
