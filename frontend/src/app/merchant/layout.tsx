'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import Sidebar from '@/components/merchant/Sidebar';
import { BillingBanner } from '@/components/merchant/BillingBanner';

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
    const [store, setStore] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const isSetupPage = pathname === '/merchant/setup';
    const isStoreAgnosticPage = isSetupPage || pathname === '/merchant/subscribe' || pathname === '/merchant/settings';

    useEffect(() => {
        const fetchStore = async () => {
            try {
                const response = await api.get('/merchants/store');
                setStore(response.data);
                setError(null);
            } catch (err: any) {
                console.error("Error fetching store:", err.response?.data || err.message);
                if (err.response?.status === 404) {
                    if (!isStoreAgnosticPage) {
                        router.push('/merchant/setup');
                    }
                    setStore(null);
                } else {
                    setError(err.response?.data?.message || "Failed to load store information.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchStore();
    }, [router, pathname, isStoreAgnosticPage]);

    if (loading) return <div className="p-8 text-center text-xl font-medium text-blue-600 animate-pulse">Loading QuickStore...</div>;

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
                <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
                    <div className="text-red-500 mb-4">
                        <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors w-full"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="text-gray-500 hover:text-gray-700 underline text-sm block"
                        >
                            Go Back Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Hide sidebar only for setup page or if explicitly desired
    if (isSetupPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Sidebar />
            <main className="flex-grow overflow-y-auto relative">
                <BillingBanner />
                {children}
            </main>
        </div>
    );
}
