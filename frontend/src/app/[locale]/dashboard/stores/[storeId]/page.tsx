'use client';

import { use } from "react";
import { useStore, usePublishStore } from "@/lib/hooks/useStore";
import { useStoreChecklist } from "@/lib/hooks/useStoreChecklist";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { PublishModal } from "@/components/dashboard/PublishModal";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import {
    Package,
    ShoppingCart,
    Users,
    DollarSign,
    Rocket,
    ExternalLink,
    Settings,
    AlertTriangle,
    Loader2,
    ChevronRight,
    ShieldCheck
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function StoreDashboard({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const { data: checklist } = useStoreChecklist(storeId);
    const publishMutation = usePublishStore(storeId);
    const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] gap-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <p className="text-muted-foreground font-medium animate-pulse">Loading amazing tools for {storeId}...</p>
            </div>
        );
    }

    if (!store) return <div className="p-8 text-center">Store not found.</div>;

    const isDraft = store.status === 'draft';
    const liveUrl = `https://${store.domain.subdomain}.quickstore.live`;

    const missingSteps = checklist
        ? Object.entries(checklist.checklist)
            .filter(([_, value]) => !value.completed)
            .map(([_, value]) => value.label)
        : [];

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold tracking-tight">{store.name}</h1>
                        <StatusBadge status={store.status} />
                    </div>
                    <p className="text-muted-foreground font-mono text-sm">{store.domain.subdomain}.quickstore.live</p>
                </div>

                <div className="flex items-center gap-2">
                    {isDraft ? (
                        <Button
                            onClick={() => setIsPublishModalOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                        >
                            <Rocket className="w-4 h-4 mr-2" />
                            Launch Store
                        </Button>
                    ) : (
                        <Button asChild variant="outline">
                            <a href={liveUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-4 h-4 mr-2" />
                                View Live
                            </a>
                        </Button>
                    )}
                    <Button asChild variant="secondary">
                        <Link href={`/dashboard/stores/${storeId}/settings/general`}>
                            <Settings className="w-4 h-4 mr-2" />
                            Settings
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Warning/Info Banners */}
            {isDraft && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-4">
                    <div className="bg-amber-100 p-2 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="space-y-1">
                        <h4 className="font-bold text-amber-900">Your store is currently in draft mode</h4>
                        <p className="text-sm text-amber-800 leading-relaxed">
                            Complete the setup checklist below to reveal your store to the world.
                            Once published, your customers can browse products and checkout.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatsCard
                    title="Total Revenue"
                    value={`${store.stats.totalRevenue.toLocaleString()} EGP`}
                    icon={DollarSign}
                    trend={{ value: 12, isUp: true }}
                />
                <StatsCard
                    title="Total Orders"
                    value={store.stats.totalOrders}
                    icon={ShoppingCart}
                    trend={{ value: 8, isUp: true }}
                />
                <StatsCard
                    title="Active Products"
                    value={store.stats.totalProducts}
                    icon={Package}
                />
                <StatsCard
                    title="Customers"
                    value={store.stats.totalCustomers}
                    icon={Users}
                    trend={{ value: 24, isUp: true }}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Checklist & Analytics Preview */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Onboarding Checklist for Draft Stores */}
                    {isDraft && checklist && (
                        <OnboardingChecklist checklist={checklist} storeId={storeId} />
                    )}

                    {/* Quick Actions / Recent Activity Placeholder */}
                    <div className="bg-background border rounded-2xl overflow-hidden">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h3 className="font-bold text-lg">Quick Actions</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Link
                                href={`/dashboard/stores/${storeId}/products/new`}
                                className="p-4 rounded-xl border-2 border-dashed hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Package className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold">Add Products</p>
                                        <p className="text-xs text-muted-foreground">List items for sale</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href={`/dashboard/stores/${storeId}/marketing`}
                                className="p-4 rounded-xl border-2 border-dashed hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                        <Rocket className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold">Create Coupon</p>
                                        <p className="text-xs text-muted-foreground">Run a sales promotion</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>

                            <Link
                                href={`/dashboard/stores/${storeId}/settings/policies`}
                                className="p-4 rounded-xl border-2 border-dashed hover:border-primary/50 hover:bg-muted/30 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold">Legal Policies</p>
                                        <p className="text-xs text-muted-foreground">Terms, Privacy & Refunds</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Right Column: Recent Orders snippet / Store Info */}
                <div className="space-y-6">
                    <div className="bg-background border rounded-2xl p-6 space-y-4">
                        <h3 className="font-bold">Store Details</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Plan</span>
                                <span className="font-bold">Pro Trial</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Currency</span>
                                <span className="font-bold">EGP</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Subdomain</span>
                                <span className="font-bold font-mono">{store.domain.subdomain}</span>
                            </div>
                        </div>
                        <Button asChild variant="outline" className="w-full h-11 rounded-xl">
                            <Link href={`/dashboard/stores/${storeId}/settings/general`}>
                                Edit Store Settings
                            </Link>
                        </Button>
                    </div>

                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center space-y-3">
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto">
                            <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <h4 className="font-bold text-primary">Need Help?</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Check out our tutorial on how to grow your sales or contact our support team.
                        </p>
                        <Button size="sm" variant="link" className="font-bold text-primary">
                            View Guide →
                        </Button>
                    </div>
                </div>
            </div>

            <PublishModal
                isOpen={isPublishModalOpen}
                onClose={() => setIsPublishModalOpen(false)}
                storeName={store.name}
                storeUrl={liveUrl}
                isReady={checklist?.progress.percentage === 100}
                missingSteps={missingSteps}
                onConfirm={async () => {
                    await publishMutation.mutateAsync();
                    setIsPublishModalOpen(false);
                }}
            />
        </div>
    );
}

function Sparkles(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            <path d="M5 3v4" />
            <path d="M19 17v4" />
            <path d="M3 5h4" />
            <path d="M17 19h4" />
        </svg>
    );
}
