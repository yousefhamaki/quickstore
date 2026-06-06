'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { WalletProvider } from '@/context/WalletContext';
import { NavigationProvider } from '@/providers/NavigationProvider';
import { GlobalRouteLoader } from '@/components/GlobalRouteLoader';
import { Suspense } from 'react';

// Create QueryClient outside component to prevent re-initialization
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes - reduce unnecessary refetches
            gcTime: 10 * 60 * 1000, // 10 minutes cache time
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Prevent refetch on component mount if data is fresh
            refetchOnReconnect: false,
        },
    },
});

export function Providers({ children }: { children: React.ReactNode }) {

    return (
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'PLACEHOLDER_CLIENT_ID'}>
            <QueryClientProvider client={queryClient}>
                <Suspense fallback={null}>
                    <NavigationProvider>
                        <WalletProvider>
                            <GlobalRouteLoader />
                            {children}
                        </WalletProvider>
                    </NavigationProvider>
                </Suspense>
                <Toaster
                    position="top-right"
                    richColors
                    closeButton
                    expand={true}
                />
                <ReactQueryDevtools initialIsOpen={false} />
            </QueryClientProvider>
        </GoogleOAuthProvider>
    );
}
