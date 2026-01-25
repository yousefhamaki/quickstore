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
    const { data: store } = useStore(storeId);

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
                <Card className="border-2 shadow-sm rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">+12%</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <h3 className="text-2xl font-bold mt-1">{store?.stats.totalRevenue.toLocaleString() || '0'} EGP</h3>
                </Card>

                <Card className="border-2 shadow-sm rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">+8%</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <h3 className="text-2xl font-bold mt-1">{store?.stats.totalOrders || '0'}</h3>
                </Card>

                <Card className="border-2 shadow-sm rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">+24%</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Converstation Rate</p>
                    <h3 className="text-2xl font-bold mt-1">3.2%</h3>
                </Card>

                <Card className="border-2 shadow-sm rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <BarChart2 className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-1 rounded-full">-3%</span>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">Store Visitors</p>
                    <h3 className="text-2xl font-bold mt-1">1,284</h3>
                </Card>
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
