'use client';

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart2,
    Calendar,
    Download,
    TrendingUp,
    TrendingDown,
    Eye,
    ShoppingCart,
    CreditCard,
    Users,
    Target,
    ExternalLink
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useStore } from "@/lib/hooks/useStore";
import { Badge } from "@/components/ui/badge";

export default function StoreAnalyticsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);

    // Calculate conversion funnel
    const visitors = store?.stats?.totalVisitors || 0;
    const orders = store?.stats?.totalOrders || 0;
    const revenue = store?.stats?.totalRevenue || 0;

    const conversionRate = visitors > 0 ? ((orders / visitors) * 100).toFixed(2) : '0.00';
    const avgOrderValue = orders > 0 ? (revenue / orders).toFixed(2) : '0.00';

    // Check if pixels are configured
    const hasPixels = store?.settings?.marketing && (
        store.settings.marketing.facebookPixelId ||
        store.settings.marketing.googleAnalyticsId ||
        store.settings.marketing.tiktokPixelId ||
        store.settings.marketing.snapchatPixelId
    );

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black uppercase tracking-tight italic">Analytics</h1>
                    <p className="text-muted-foreground font-medium">Deep dive into your store performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="rounded-2xl font-bold uppercase text-[10px] tracking-widest">
                        <Calendar className="w-4 h-4 mr-2" /> Last 30 Days
                    </Button>
                    <Button variant="outline" className="rounded-2xl font-bold uppercase text-[10px] tracking-widest">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            {/* Pixel Status Alert */}
            {!hasPixels && (
                <Card className="border-2 border-orange-200 bg-orange-50/50 rounded-3xl">
                    <CardContent className="p-6 flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                            <Target className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black uppercase text-sm mb-1">Tracking Pixels Not Configured</h3>
                            <p className="text-xs text-muted-foreground mb-3 font-medium">
                                Connect Facebook, Google, TikTok, or Snapchat pixels to track ad performance and get deeper insights.
                            </p>
                            <Button
                                size="sm"
                                className="rounded-xl font-bold uppercase text-[10px] tracking-widest"
                                onClick={() => window.location.href = `/dashboard/stores/${storeId}/marketing/pixels`}
                            >
                                Configure Pixels
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Revenue"
                    value={`${revenue.toLocaleString()} EGP`}
                    icon={TrendingUp}
                    trend={{ value: 12, isUp: true }}
                    isLoading={isLoading}
                />
                <StatsCard
                    title="Total Orders"
                    value={orders.toString()}
                    icon={BarChart2}
                    trend={{ value: 8, isUp: true }}
                    isLoading={isLoading}
                />
                <StatsCard
                    title="Conversion Rate"
                    value={`${conversionRate}%`}
                    icon={TrendingUp}
                    trend={{ value: 24, isUp: true }}
                    isLoading={isLoading}
                />
                <StatsCard
                    title="Store Visitors"
                    value={visitors.toLocaleString()}
                    icon={Users}
                    trend={{ value: 3, isUp: false }}
                    isLoading={isLoading}
                />
            </div>

            {/* Conversion Funnel */}
            <Card className="border-2 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-6">
                    <CardTitle className="text-xl font-black uppercase italic tracking-tight">Conversion Funnel</CardTitle>
                    <CardDescription className="font-medium">Track how visitors move through your store</CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-4">
                        {/* Visitors */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Eye className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-black uppercase text-sm tracking-tight">Visitors</span>
                                    <span className="font-black text-lg">{visitors.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Add to Cart (Placeholder - needs implementation) */}
                        <div className="flex items-center gap-4 opacity-50">
                            <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-black uppercase text-sm tracking-tight">Add to Cart</span>
                                    <span className="font-black text-lg">-</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: '0%' }}></div>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase">
                                    Enable pixel tracking to see this data
                                </p>
                            </div>
                        </div>

                        {/* Orders */}
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-600 flex items-center justify-center">
                                <CreditCard className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-black uppercase text-sm tracking-tight">Completed Orders</span>
                                    <span className="font-black text-lg">{orders.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full"
                                        style={{ width: `${visitors > 0 ? (orders / visitors) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Conversion Metrics */}
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                        <div className="p-4 rounded-2xl bg-muted/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Conversion Rate</p>
                            <p className="text-2xl font-black">{conversionRate}%</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-muted/50">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Avg Order Value</p>
                            <p className="text-2xl font-black">{avgOrderValue} EGP</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* External Analytics Links */}
            {hasPixels && (
                <Card className="border-2 shadow-sm rounded-3xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b p-6">
                        <CardTitle className="text-xl font-black uppercase italic tracking-tight">Advanced Analytics</CardTitle>
                        <CardDescription className="font-medium">View detailed insights in your ad platforms</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {store?.settings?.marketing?.facebookPixelId && (
                                <a
                                    href="https://business.facebook.com/events_manager2"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 rounded-2xl border-2 hover:border-blue-500 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                                            <span className="font-black text-lg">f</span>
                                        </div>
                                        <div>
                                            <p className="font-black uppercase text-sm">Facebook Pixel</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">Events Manager</p>
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-blue-500" />
                                </a>
                            )}

                            {store?.settings?.marketing?.googleAnalyticsId && (
                                <a
                                    href="https://analytics.google.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 rounded-2xl border-2 hover:border-orange-500 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center">
                                            <span className="font-black text-lg">G</span>
                                        </div>
                                        <div>
                                            <p className="font-black uppercase text-sm">Google Analytics</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">GA4 Dashboard</p>
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-orange-500" />
                                </a>
                            )}

                            {store?.settings?.marketing?.tiktokPixelId && (
                                <a
                                    href="https://ads.tiktok.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 rounded-2xl border-2 hover:border-black transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center">
                                            <span className="font-black text-lg">T</span>
                                        </div>
                                        <div>
                                            <p className="font-black uppercase text-sm">TikTok Pixel</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">Ads Manager</p>
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-black" />
                                </a>
                            )}

                            {store?.settings?.marketing?.snapchatPixelId && (
                                <a
                                    href="https://ads.snapchat.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 rounded-2xl border-2 hover:border-yellow-400 transition-all flex items-center justify-between group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-yellow-400 text-black flex items-center justify-center">
                                            <span className="font-black text-lg">S</span>
                                        </div>
                                        <div>
                                            <p className="font-black uppercase text-sm">Snapchat Pixel</p>
                                            <p className="text-[10px] text-muted-foreground font-bold">Ads Manager</p>
                                        </div>
                                    </div>
                                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-yellow-600" />
                                </a>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Revenue Chart Placeholder */}
            <Card className="border-2 shadow-sm rounded-3xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-6">
                    <CardTitle className="text-xl font-black uppercase italic tracking-tight">Revenue Over Time</CardTitle>
                    <CardDescription className="font-medium">Visual representation of your daily sales</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground italic">
                    <div className="text-center space-y-2">
                        <BarChart2 className="w-16 h-16 mx-auto opacity-20" />
                        <p className="font-bold uppercase text-[10px] tracking-widest">Chart Coming Soon</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
