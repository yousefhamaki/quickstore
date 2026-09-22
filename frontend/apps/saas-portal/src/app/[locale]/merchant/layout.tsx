'use client';

import React, { Suspense, memo } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { routing } from '@/i18n/routing';

// Lazy load heavy components with proper loading states
const Sidebar = dynamic(() => import('@shared/components/merchant/Sidebar'), {
    loading: () => <SidebarSkeleton />,
    ssr: false
});

const BillingBanner = dynamic(() => import('@shared/components/merchant/BillingBanner').then(mod => ({ default: mod.BillingBanner })), {
    loading: () => null,
    ssr: false
});

const WelcomeGiftModal = dynamic(() => import('@shared/components/merchant/WelcomeGiftModal').then(mod => ({ default: mod.WelcomeGiftModal })), {
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
    // usePathname() (from 'next/navigation') returns the RAW path including
    // the [locale] segment (e.g. "/en/merchant/staff/accept"), not "/en"-
    // stripped — unlike proxy.ts's own pathAfterLocale, which already
    // accounts for this. Without stripping it here too, both checks below
    // were silently always false for every real (locale-prefixed) URL, so
    // this exemption never actually took effect outside of a bare
    // "/merchant/..." path with no locale segment at all.
    const segments = pathname.split('/');
    const isLocaleInPath = (routing.locales as readonly string[]).includes(segments[1]);
    const pathAfterLocale = isLocaleInPath ? '/' + segments.slice(2).join('/') : pathname;

    const isSetupPage = pathAfterLocale === '/merchant/setup';
    // The staff accept-invite page must render for a visitor who has no
    // account/token yet (see proxy.ts's isStaffAcceptPath — the middleware
    // already lets them through). Wrapping it in the authenticated
    // dashboard chrome anyway made Sidebar/BillingBanner/WelcomeGiftModal
    // fire their normal authenticated API calls, which 401'd and tripped
    // api.ts's global interceptor into a hard redirect to /auth/login
    // before the invitee ever saw the accept form.
    const isStaffAcceptPage = pathAfterLocale.startsWith('/merchant/staff/accept');

    if (isSetupPage || isStaffAcceptPage) {
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
                <Suspense fallback={null}>
                    <WelcomeGiftModal />
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
