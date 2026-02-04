'use client';

import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    BarChart2,
    Calendar,
    Download,
    TrendingUp,
    TrendingDown,
    ArrowRight
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useStore } from "@/lib/hooks/useStore";

export default function StoreAnalyticsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const t = (key: string) => key; // Simplified for analytics

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                    <p className="text-muted-foreground text-sm">Deep dive into your store performance.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="rounded-xl">
                        <Calendar className="w-4 h-4 mr-2" /> Last 30 Days
                    </Button>
                    <Button variant="outline" className="rounded-xl">
                        <Download className="w-4 h-4 mr-2" /> Export
                    </Button>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Revenue"
                    value={store ? `${store.stats.totalRevenue.toLocaleString()} EGP` : '0 EGP'}
                    icon={TrendingUp}
                    trend={{ value: 12, isUp: true }}
                    isLoading={isLoading}
                />
                <StatsCard
                    title="Total Orders"
                    value={store ? store.stats.totalOrders : 0}
                    icon={BarChart2}
                    trend={{ value: 8, isUp: true }}
                    isLoading={isLoading}
                />
                <StatsCard
                    title="Conversion Rate"
                    value="3.2%"
                    icon={TrendingUp}
                    trend={{ value: 24, isUp: true }}
                    isLoading={isLoading}
                />
                <StatsCard
                    title="Store Visitors"
                    value="1,284"
                    icon={BarChart2}
                    trend={{ value: 3, isUp: false }}
                    isLoading={isLoading}
                />
            </div>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle>Revenue Over Time</CardTitle>
                    <CardDescription>Visual representation of your daily sales.</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px] flex items-center justify-center text-muted-foreground italic">
                    [ Sales Chart Placeholder ]
                </CardContent>
            </Card>
        </div>
    );
}
