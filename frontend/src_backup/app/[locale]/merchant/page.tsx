'use client';

import React, { Suspense, memo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useAnalyticsOverview } from '@/lib/hooks/useAnalytics';
import { useStores } from '@/lib/hooks/useStores';
import { Card, CardContent } from '@/components/ui/card';

// Lazy load heavy components
const SubscriptionBanner = dynamic(() => import('@/components/merchant/dashboard/SubscriptionBanner'), {
    loading: () => <BannerSkeleton />,
    ssr: false
});

const StoreManagementCard = dynamic(() => import('@/components/merchant/dashboard/StoreManagementCard'), {
    loading: () => <CardSkeleton />,
    ssr: false
});

const SubscriptionCard = dynamic(() => import('@/components/merchant/dashboard/SubscriptionCard'), {
    loading: () => <CardSkeleton />,
    ssr: false
});

// Memoized skeleton components
const BannerSkeleton = memo(() => (
    <Card className="mb-10 border-0 shadow-xl bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse">
        <CardContent className="p-8">
            <div className="h-24 bg-gray-400/20 rounded"></div>
        </CardContent>
    </Card>
));
BannerSkeleton.displayName = 'BannerSkeleton';

const CardSkeleton = memo(() => (
    <Card className="shadow-xl border-0 animate-pulse">
        <CardContent className="p-8">
            <div className="h-48 bg-gray-200 rounded"></div>
        </CardContent>
    </Card>
));
CardSkeleton.displayName = 'CardSkeleton';

const StatCardSkeleton = memo(() => (
    <Card className="shadow-xl border-0 animate-pulse">
        <CardContent className="p-6">
            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
            <div className="h-8 bg-gray-300 rounded w-32 mt-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20 mt-3"></div>
        </CardContent>
    </Card>
));
StatCardSkeleton.displayName = 'StatCardSkeleton';

// Memoized StatCard
const StatCard = memo(({ title, value, trend }: { title: string, value: string, trend: string }) => {
    return (
        <Card className="shadow-xl border-0 overflow-hidden glass hover:translate-y-[-4px] transition-transform duration-300">
            <CardContent className="p-6">
                <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-black text-gray-900 mt-2">{value}</h3>
                <p className="text-xs font-bold text-green-500 mt-2 flex items-center">
                    {trend} <span className="text-gray-300 font-medium ml-1">vs last month</span>
                </p>
            </CardContent>
        </Card>
    );
});
StatCard.displayName = 'StatCard';

// Main dashboard content with instant rendering
export default function MerchantDashboard() {
    const t = useTranslations('dashboard.home');
    const tStats = useTranslations('dashboard.stats');

    const { data: analytics } = useAnalyticsOverview();
    const { data: allStores } = useStores();

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900">{t('title')}</h1>
                    <p className="text-gray-500 font-medium mt-1">{t('subtitle')}</p>
                </div>
            </header>

            {/* Lazy-loaded subscription banner */}
            <Suspense fallback={<BannerSkeleton />}>
                <SubscriptionBanner />
            </Suspense>

            {/* Stats cards - render immediately with data or show skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                {analytics ? (
                    <>
                        <Card className="shadow-xl border-0 overflow-hidden glass hover:translate-y-[-4px] transition-transform duration-300">
                            <CardContent className="p-6">
                                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{tStats('totalSales')}</p>
                                <h3 className="text-2xl font-black text-gray-900 mt-2">{analytics.totalRevenue?.toFixed(2) || '0.00'} EGP</h3>
                                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100/50">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{tStats('completed')}</p>
                                        <p className="text-sm font-black text-green-600">{analytics.completedRevenue?.toFixed(2) || '0.00'}</p>
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{tStats('waiting')}</p>
                                        <p className="text-sm font-black text-amber-500">{analytics.pendingRevenue?.toFixed(2) || '0.00'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <StatCard title={tStats('totalOrders')} value={analytics.totalOrders?.toString() || '0'} trend="+0%" />
                        <StatCard title={tStats('visitors')} value={analytics.totalVisitors?.toString() || '0'} trend="+0%" />
                        <StatCard title={tStats('conversion')} value={`${analytics.conversion?.toFixed(2) || '0.00'}%`} trend="0%" />
                    </>
                ) : (
                    <>
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                        <StatCardSkeleton />
                    </>
                )}
            </div>

            {/* Lazy-loaded management cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Suspense fallback={<CardSkeleton />}>
                    <StoreManagementCard storeCount={allStores?.length || 0} />
                </Suspense>
                <Suspense fallback={<CardSkeleton />}>
                    <SubscriptionCard />
                </Suspense>
            </div>
        </div>
    );
}
