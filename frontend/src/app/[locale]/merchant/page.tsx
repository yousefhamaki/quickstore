'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getBillingOverview } from '@/lib/api/billing';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle2, CreditCard, LayoutDashboard, Settings } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

import { useTranslations } from 'next-intl';

import { usePayFromWallet } from '@/lib/hooks/useBilling';
import { useAnalyticsOverview, useRecentOrdersAnalytics } from '@/lib/hooks/useAnalytics';
import { useStores } from '@/lib/hooks/useStores';
import { toast } from 'sonner';
import { Store } from 'lucide-react';

export default function MerchantDashboard() {
    const [store, setStore] = useState<any>(null);
    const [billing, setBilling] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();
    const t = useTranslations('dashboard.home');
    const tCommon = useTranslations('common');
    const tBanner = useTranslations('dashboard.banner');
    const tStats = useTranslations('dashboard.stats');

    const { data: analytics, isLoading: analyticsLoading } = useAnalyticsOverview();
    const { data: allStores, isLoading: storesLoading } = useStores();
    const payFromWallet = usePayFromWallet();

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [storeRes, billingRes] = await Promise.all([
                api.get('/merchants/store'),
                getBillingOverview()
            ]);

            setStore(storeRes.data);
            setBilling(billingRes);
            setError(null);
        } catch (err: any) {
            console.error("Error fetching dashboard data:", err);
            if (err.response?.status === 404) {
                setStore(null);
            } else {
                setError("Failed to load dashboard data. Please refresh.");
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleWalletPayment = async () => {
        try {
            await payFromWallet.mutateAsync();
            fetchData();
        } catch (err) {
            // Error is handled by hook toast
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center text-red-500">
                <p>{error}</p>
                <Button onClick={fetchData} variant="outline" className="mt-4">Retry</Button>
            </div>
        );
    }

    if (!store) return (
        <div className="p-8 text-center">
            <p>Store not found directly via legacy endoint.</p>
            <Link href="/merchant/setup"><Button>Create Store</Button></Link>
        </div>
    );

    const subscription = billing?.subscription;
    const plan = billing?.plan;
    const wallet = billing?.wallet;

    const getStatusBadge = () => {
        if (!subscription) return <Badge variant="secondary">No Active Plan</Badge>;

        switch (subscription.status) {
            case 'active': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
            case 'trialing': return <Badge className="bg-blue-500 hover:bg-blue-600"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
            case 'past_due': return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Past Due</Badge>;
            case 'canceled': return <Badge className="bg-red-500 hover:bg-red-600"><AlertCircle className="w-3 h-3 mr-1" /> Canceled</Badge>;
            case 'inactive': return <Badge variant="secondary" className="bg-gray-400">Pending</Badge>;
            default: return <Badge variant="secondary">{subscription.status}</Badge>;
        }
    };

    const isPlanActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    // If they have a plan name and it's not "No Plan", they have a selected plan
    const hasSelectedPlan = plan && plan.name !== 'No Plan';
    const planPrice = plan?.monthlyPrice || 0;
    const canPayWithWallet = hasSelectedPlan && wallet && wallet.balance >= planPrice && planPrice > 0;

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900">{t('title')}</h1>
                    <p className="text-gray-500 font-medium mt-1">{t('subtitle')}</p>
                </div>
                <div className="flex items-center space-x-4 rtl:space-x-reverse">
                    <div className="text-right rtl:text-left">
                        <p className="text-sm font-bold">{store.name}</p>
                        <p className="text-xs text-gray-400">{store.slug}.quickstore.live</p>
                    </div>
                    <Link href={`https://${store.slug}.quickstore.live`} target="_blank">
                        <Button variant="outline" className="rounded-full">{t('visitStore')}</Button>
                    </Link>
                </div>
            </header>

            {!isPlanActive && (
                <Card className="mb-10 border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative overflow-hidden">
                    <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="z-10">
                            <h2 className="text-2xl font-bold mb-2">
                                {subscription?.status === 'inactive' && hasSelectedPlan ? tBanner('pending') : tBanner('unlock')}
                            </h2>
                            <p className="text-blue-100 max-w-lg">
                                {subscription?.status === 'inactive' && hasSelectedPlan
                                    ? tBanner('pendingSubtitle', { planName: plan.name })
                                    : tBanner('upgradeSubtitle')}
                            </p>
                        </div>
                        <div className="z-10 flex gap-4">
                            {subscription?.status === 'inactive' && canPayWithWallet ? (
                                <Button
                                    onClick={handleWalletPayment}
                                    disabled={payFromWallet.isPending}
                                    className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 h-12 rounded-full border-none shadow-lg"
                                >
                                    {payFromWallet.isPending ? 'Processing...' : 'Pay with Wallet'}
                                </Button>
                            ) : null}
                            <Link href={subscription?.status === 'inactive' ? "/merchant/billing" : "/merchant/subscribe"}>
                                <Button className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 h-12 rounded-full border-none">
                                    {subscription?.status === 'inactive' && hasSelectedPlan ? tBanner('completePayment') : tBanner('choosePlan')}
                                </Button>
                            </Link>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -left-10 -top-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <Card className="shadow-xl border-0 overflow-hidden glass hover:translate-y-[-4px] transition-transform duration-300">
                    <CardContent className="p-6">
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{tStats('totalSales')}</p>
                        <h3 className="text-2xl font-black text-gray-900 mt-2">{analytics?.totalRevenue?.toFixed(2) || '0.00'} EGP</h3>
                        <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100/50">
                            <div className="flex-1">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{tStats('completed')}</p>
                                <p className="text-sm font-black text-green-600">{analytics?.completedRevenue?.toFixed(2) || '0.00'}</p>
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">{tStats('waiting')}</p>
                                <p className="text-sm font-black text-amber-500">{analytics?.pendingRevenue?.toFixed(2) || '0.00'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <StatCard title={tStats('totalOrders')} value={analytics?.totalOrders?.toString() || '0'} trend="+0%" />
                <StatCard title={tStats('visitors')} value={analytics?.totalVisitors?.toString() || '0'} trend="+0%" />
                <StatCard title={tStats('conversion')} value={`${analytics?.conversion?.toFixed(2) || '0.00'}%`} trend="0%" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 shadow-xl border-0 overflow-hidden glass">
                    <CardHeader className="bg-white/50 border-b flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>{t('manageStores')}</CardTitle>
                            <CardDescription>{t('manageStoresSubtitle')}</CardDescription>
                        </div>
                        <Link href="/dashboard">
                            <Button variant="outline" size="sm" className="rounded-full">{t('viewAllStores')}</Button>
                        </Link>
                    </CardHeader>
                    <CardContent className="p-8">
                        <div className="flex flex-col md:flex-row items-center gap-8">
                            <div className="w-full md:w-1/3 flex justify-center">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-3xl bg-blue-600/10 flex items-center justify-center text-blue-600">
                                        <Store size={64} />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-blue-600 border border-blue-50">
                                        <LayoutDashboard size={24} />
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div className="space-y-2">
                                    <h3 className="text-2xl font-black text-gray-900 leading-tight">
                                        Ready to manage your products and orders?
                                    </h3>
                                    <p className="text-gray-500 font-medium italic">
                                        All store-specific management has been moved to the individual store dashboards for a cleaner experience.
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-sm font-bold">{allStores?.length || 0} Total Stores</span>
                                    </div>
                                </div>
                                <Link href="/dashboard" className="block w-full">
                                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                        Go to My Stores
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-0 overflow-hidden glass">
                    <CardHeader className="bg-white/50 border-b">
                        <CardTitle>{t('subscriptionInfo')}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">{t('status')}</span>
                            {getStatusBadge()}
                        </div>
                        {plan && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">{t('plan')}</span>
                                <span className="font-bold text-blue-600">{plan.name}</span>
                            </div>
                        )}
                        {subscription?.expiresAt && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">{t('renews')}</span>
                                <span className="font-bold">{new Date(subscription.expiresAt).toLocaleDateString()}</span>
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-4">{t('quickLinks')}</p>
                            <div className="space-y-3">
                                <Link href="/merchant/billing">
                                    <Button variant="outline" className="w-full justify-start rounded-xl font-medium">
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        {hasSelectedPlan ? t('manageSubscription') : t('upgradePlan')}
                                    </Button>
                                </Link>
                                <Link href="/merchant/settings">
                                    <Button variant="outline" className="w-full justify-start rounded-xl font-medium">
                                        <Settings className="w-4 h-4 mr-2 text-gray-400" />
                                        Merchant Settings
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function StatCard({ title, value, trend }: { title: string, value: string, trend: string }) {
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
}
