'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useBillingOverview } from '@/lib/hooks/useBilling';
import { BillingOverview } from '@/lib/api/billing';

import Cookies from 'js-cookie';
import { usePathname } from 'next/navigation';

interface WalletContextType {
    billing: BillingOverview | undefined;
    isLoading: boolean;
    isBlocked: boolean;
    blockingReason: 'LOW_WALLET' | 'SUBSCRIPTION_EXPIRED' | null;
    refetch: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [shouldCheck, setShouldCheck] = useState(() => {
        // Calculate once on mount instead of on every pathname change
        if (typeof window === 'undefined') return false;

        const token = Cookies.get('token');
        const isStorePath = pathname?.includes('/store/') ||
            (window.location.hostname.split('.').length > 2 &&
                !window.location.hostname.startsWith('www.'));

        return !!token && !isStorePath;
    });

    // 30s polling to keep wallet balance and status synced (only if enabled)
    const { data: billing, isLoading, refetch } = useBillingOverview(shouldCheck);

    // We derive isBlocked from the backend's blockingReason
    const isBlocked = !!billing?.blockingReason;
    const blockingReason = billing?.blockingReason || null;

    return (
        <WalletContext.Provider value={{ billing, isLoading, isBlocked, blockingReason, refetch }}>
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (!context) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
