'use client';

import React, { Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@shared/context/AuthContext';
import { AuthGuard } from '../components/AuthGuard';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
                    <AuthGuard>
                        {children}
                    </AuthGuard>
                </Suspense>
                <Toaster position="top-right" richColors theme="dark" closeButton />
            </AuthProvider>
        </QueryClientProvider>
    );
}
