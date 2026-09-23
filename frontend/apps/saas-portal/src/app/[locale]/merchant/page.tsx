'use client';

import React, { Suspense, memo } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { useAnalyticsOverview, useTopProductsAnalytics } from '@shared/lib/hooks/useAnalytics';
import { useStores } from '@shared/lib/hooks/useStores';
import { Card, CardContent } from '@shared/components/ui/card';
import { Wallet, ShoppingBag, Users, TrendingUp, PiggyBank, Percent } from 'lucide-react';

// Each stat gets its own accent so the grid reads as distinct metrics at a
// glance instead of six identical gray boxes.
const STAT_ACCENTS = {
    blue: { icon: 'text-blue-600', badge: 'bg-blue-50', ring: 'group-hover:shadow-blue-100' },
    violet: { icon: 'text-violet-600', badge: 'bg-violet-50', ring: 'group-hover:shadow-violet-100' },
    amber: { icon: 'text-amber-600', badge: 'bg-amber-50', ring: 'group-hover:shadow-amber-100' },
    teal: { icon: 'text-teal-600', badge: 'bg-teal-50', ring: 'group-hover:shadow-teal-100' },
    green: { icon: 'text-green-600', badge: 'bg-green-50', ring: 'group-hover:shadow-green-100' },
    indigo: { icon: 'text-indigo-600', badge: 'bg-indigo-50', ring: 'group-hover:shadow-indigo-100' },
} as const;
type StatAccent = keyof typeof STAT_ACCENTS;

// Lazy load heavy components
const SubscriptionBanner = dynamic(() => import('@shared/components/merchant/dashboard/SubscriptionBanner'), {
    loading: () => <BannerSkeleton />,
    ssr: false
});

const StoreManagementCard = dynamic(() => import('@shared/components/merchant/dashboard/StoreManagementCard'), {
    loading: () => <CardSkeleton />,
    ssr: false
});

const SubscriptionCard = dynamic(() => import('@shared/components/merchant/dashboard/SubscriptionCard'), {
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
const StatCard = memo(({ title, value, trend, icon: Icon, accent = 'blue' }: { title: string, value: string, trend: string, icon: React.ComponentType<{ size?: number; className?: string }>, accent?: StatAccent }) => {
    const a = STAT_ACCENTS[accent];
    return (
        <Card className={`group shadow-md border-0 rounded-2xl overflow-hidden glass hover:-translate-y-1 hover:shadow-2xl ${a.ring} transition-all duration-300`}>
            <CardContent className="p-6">
                <div className={`w-10 h-10 rounded-xl ${a.badge} ${a.icon} flex items-center justify-center mb-4`}>
                    <Icon size={20} />
                </div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{title}</p>
                <h3 className="text-2xl font-black text-gray-900 mt-1 tabular-nums">{value}</h3>
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
    const { data: topProducts } = useTopProductsAnalytics(5);

    return (
        <div className="p-8 relative">
            {/* Soft ambient glow behind the header — the same "premium SaaS"
                depth cue used on the storefront hero, kept subtle so it never
                competes with the data below. */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

            <header className="flex justify-between items-center mb-10 relative">
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
                        <Card className="group shadow-md border-0 rounded-2xl overflow-hidden glass hover:-translate-y-1 hover:shadow-2xl group-hover:shadow-blue-100 transition-all duration-300">
                            <CardContent className="p-6">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                    <Wallet size={20} />
                                </div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{tStats('totalSales')}</p>
                                <h3 className="text-2xl font-black text-gray-900 mt-1 tabular-nums">{analytics.totalRevenue?.toFixed(2) || '0.00'} EGP</h3>
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
                        <StatCard title={tStats('totalOrders')} value={analytics.totalOrders?.toString() || '0'} trend="+0%" icon={ShoppingBag} accent="violet" />
                        <StatCard title={tStats('visitors')} value={analytics.totalVisitors?.toString() || '0'} trend="+0%" icon={Users} accent="amber" />
                        <StatCard title={tStats('conversion')} value={`${analytics.conversion?.toFixed(2) || '0.00'}%`} trend="0%" icon={TrendingUp} accent="teal" />
                        <StatCard title={tStats('grossProfit')} value={`${analytics.grossProfit?.toFixed(2) ?? '0.00'} EGP`} trend="+0%" icon={PiggyBank} accent="green" />
                        <StatCard title={tStats('margin')} value={`${analytics.marginPercent?.toFixed(2) ?? '0.00'}%`} trend="+0%" icon={Percent} accent="indigo" />
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

            {/* Top Products — revenue + per-product profit, from costAtPurchase snapshots */}
            {topProducts && topProducts.length > 0 && (
                <Card className="shadow-md hover:shadow-2xl border-0 overflow-hidden glass mt-8 transition-shadow duration-300">
                    <CardContent className="p-8">
                        <h2 className="text-xl font-bold mb-6">{tStats('topProducts')}</h2>
                        <div className="space-y-3">
                            {topProducts.map((p, i) => (
                                <div key={p._id} className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-gray-50/50 hover:bg-blue-50/40 transition-colors duration-200">
                                    <span className="hidden sm:flex w-6 h-6 shrink-0 rounded-full bg-white shadow-sm items-center justify-center text-[11px] font-black text-gray-400">
                                        {i + 1}
                                    </span>
                                    <div className="flex items-center gap-3 min-w-0">
                                        {p.productImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={p.productImage} alt={p.productName} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-gray-200 shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-bold truncate">{p.productName}</p>
                                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">{p.totalSold} {tStats('unitsSold')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black">{p.revenue?.toFixed(2)} EGP</p>
                                        <p className="text-xs font-bold text-green-600">{tStats('profit')}: {p.profit?.toFixed(2)} EGP</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
