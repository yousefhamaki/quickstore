'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

const ReactQueryDevtools = dynamic(
  () => import('@tanstack/react-query-devtools').then((d) => d.ReactQueryDevtools),
  { ssr: false }
);
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { WalletProvider } from '@shared/context/WalletContext';
import { NavigationProvider } from '@shared/providers/NavigationProvider';
import { GlobalRouteLoader } from '@shared/components/GlobalRouteLoader';
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
                {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
            </QueryClientProvider>
        </GoogleOAuthProvider>
    );
}
