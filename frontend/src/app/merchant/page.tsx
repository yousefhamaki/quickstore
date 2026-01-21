'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';
import { getBillingOverview } from '@/lib/api/billing';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertCircle, CheckCircle2, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function MerchantDashboard() {
    const [store, setStore] = useState<any>(null);
    const [billing, setBilling] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { user } = useAuth();
    const router = useRouter();

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
            // Don't error out completely if store is missing but billing works, or vice versa if possible
            // But strict error for now strictly if store setup fails check 404
            if (err.response?.status === 404) {
                // Store not found is handled by UI
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
        // Redirect to setup if no store found?
        // For now just show message
        <div className="p-8 text-center">
            <p>Store not found directly via legacy endoint.</p>
            <Link href="/merchant/setup"><Button>Create Store</Button></Link>
        </div>
    );

    const subscription = billing?.subscription;
    const plan = subscription?.planId;

    const getStatusBadge = () => {
        if (!subscription) return <Badge variant="secondary">No Active Plan</Badge>;

        switch (subscription.status) {
            case 'active': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
            case 'trialing': return <Badge className="bg-blue-500 hover:bg-blue-600"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
            case 'past_due': return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Past Due</Badge>;
            case 'canceled': return <Badge className="bg-red-500 hover:bg-red-600"><AlertCircle className="w-3 h-3 mr-1" /> Canceled</Badge>;
            default: return <Badge variant="secondary">{subscription.status}</Badge>;
        }
    };

    const isPlanActive = subscription?.status === 'active' || subscription?.status === 'trialing';

    return (
        <div className="p-8">
            <header className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 font-medium mt-1">Manage and grow your online business</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="text-right">
                        <p className="text-sm font-bold">{store.name}</p>
                        <p className="text-xs text-gray-400">{store.slug}.quickstore.live</p>
                    </div>
                    <Link href={`/${store.slug}`} target="_blank">
                        <Button variant="outline" className="rounded-full">Visit Store</Button>
                    </Link>
                </div>
            </header>

            {!isPlanActive && (
                <Card className="mb-10 border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative overflow-hidden">
                    <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="z-10">
                            <h2 className="text-2xl font-bold mb-2">
                                Unlock Full Potential
                            </h2>
                            <p className="text-blue-100 max-w-lg">
                                Upgrade to a subscription plan to start selling, access analytics, and remove limits.
                            </p>
                        </div>
                        <div className="z-10">
                            <Link href="/merchant/subscribe">
                                <Button className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 h-12 rounded-full border-none">
                                    Choose Plan
                                </Button>
                            </Link>
                        </div>
                        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                        <div className="absolute -left-10 -top-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
                    </CardContent>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard title="Total Sales" value="0.00 EGP" trend="+0%" />
                <StatCard title="Total Orders" value="0" trend="+0%" />
                <StatCard title="Visitors" value="12" trend="+100%" />
                <StatCard title="Conversion" value="0%" trend="0%" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 shadow-xl border-0 overflow-hidden glass">
                    <CardHeader className="bg-white/50 border-b">
                        <CardTitle>Recent Orders</CardTitle>
                        <CardDescription>Latest transactions from your store</CardDescription>
                    </CardHeader>
                    <CardContent className="p-8 text-center text-gray-500 font-medium h-64 flex items-center justify-center">
                        No orders yet. Start sharing your store link to get sales!
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-0 overflow-hidden glass">
                    <CardHeader className="bg-white/50 border-b">
                        <CardTitle>Subscription Info</CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-medium">Status</span>
                            {getStatusBadge()}
                        </div>
                        {plan && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Plan</span>
                                <span className="font-bold text-blue-600">{plan.name}</span>
                            </div>
                        )}
                        {subscription?.currentPeriodEnd && (
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500 font-medium">Renews</span>
                                <span className="font-bold">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            <p className="text-xs text-gray-400 font-bold uppercase mb-4">Quick Links</p>
                            <div className="space-y-3">
                                <Link href="/merchant/products/new">
                                    <Button variant="outline" className="w-full justify-start rounded-xl font-medium">Add Product</Button>
                                </Link>
                                <Link href="/merchant/subscribe">
                                    <Button variant="outline" className="w-full justify-start rounded-xl font-medium">
                                        <CreditCard className="w-4 h-4 mr-2" />
                                        {isPlanActive ? 'Manage Subscription' : 'Upgrade Plan'}
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
