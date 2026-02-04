'use client';

import React, { Suspense, memo } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components with proper loading states
const Sidebar = dynamic(() => import('@/components/merchant/Sidebar'), {
    loading: () => <SidebarSkeleton />,
    ssr: false
});

const BillingBanner = dynamic(() => import('@/components/merchant/BillingBanner').then(mod => ({ default: mod.BillingBanner })), {
    loading: () => null,
    ssr: false
});

// Memoized skeleton to prevent re-renders
const SidebarSkeleton = memo(() => (
    <aside className="w-64 bg-white border-r hidden md:flex flex-col h-full sticky top-0">
        <div className="p-6 border-b animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32"></div>
        </div>
        <nav className="flex-grow p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse"></div>
            ))}
        </nav>
    </aside>
));
SidebarSkeleton.displayName = 'SidebarSkeleton';

// Memoized layout content to prevent unnecessary re-renders
const MerchantLayoutContent = memo(({ children, pathname }: { children: React.ReactNode; pathname: string }) => {
    const isSetupPage = pathname === '/merchant/setup';

    if (isSetupPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            <Suspense fallback={<SidebarSkeleton />}>
                <Sidebar />
            </Suspense>
            <main className="flex-grow overflow-y-auto relative">
                <Suspense fallback={null}>
                    <BillingBanner />
                </Suspense>
                {children}
            </main>
        </div>
    );
});
MerchantLayoutContent.displayName = 'MerchantLayoutContent';

export default function MerchantLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return <MerchantLayoutContent pathname={pathname}>{children}</MerchantLayoutContent>;
}
