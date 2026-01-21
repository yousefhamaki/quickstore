'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useBillingOverview } from '@/lib/hooks/useBilling';
import { BillingOverview } from '@/lib/api/billing';

interface WalletContextType {
    billing: BillingOverview | undefined;
    isLoading: boolean;
    isBlocked: boolean;
    blockingReason: 'LOW_WALLET' | 'SUBSCRIPTION_EXPIRED' | null;
    refetch: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
    // 30s polling to keep wallet balance and status synced
    const { data: billing, isLoading, refetch } = useBillingOverview();

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
