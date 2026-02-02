'use client';

import { useAuth } from "@/context/AuthContext";
import { useStores } from "@/lib/hooks/useStores";
import { StoreGrid } from "@/components/dashboard/StoreGrid";
import { Button } from "@/components/ui/button";
import { Plus, Store, LayoutDashboard, Search, LogOut, CreditCard } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function MerchantDashboard() {
    const t = useTranslations('merchant.dashboard');
    const { user, logout } = useAuth();
    const { data: stores, isLoading } = useStores();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredStores = stores?.filter(store =>
        store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        store.domain.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-muted/20 pb-12">
            {/* Hero / Header Section */}
            <div className="bg-background border-b pt-12 pb-8 px-4 md:px-8">
                <div className="max-w-7xl mx-auto space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <h1 className="text-3xl font-bold tracking-tight">
                                {t('welcome', { name: user?.name?.split(' ')[0] || '' })}
                            </h1>
                            <p className="text-muted-foreground">{t('subtitle')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="lg" className="rounded-full">
                                <Link href="/merchant/subscribe">
                                    <CreditCard className="w-5 h-5 mr-2" />
                                    {t('billingAndPlans')}
                                </Link>
                            </Button>
                            <Button asChild size="lg" className="rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                                <Link href="/dashboard/stores/new">
                                    <Plus className="w-5 h-5 mr-2" />
                                    {t('createNewStore')}
                                </Link>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                    if (confirm(t('logoutConfirm'))) {
                                        logout();
                                    }
                                }}
                                title={t('logout')}
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                        <div className="bg-muted/50 p-4 rounded-2xl border flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-xl">
                                <Store className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{t('activeStores')}</p>
                                <p className="text-2xl font-bold">{stores?.length || 0}</p>
                            </div>
                        </div>
                        {/* Add more metric snapshots here if needed */}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 mt-10 space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="bg-primary w-2 h-8 rounded-full" />
                        <h2 className="text-2xl font-bold">{t('myStores')}</h2>
                    </div>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder={t('searchPlaceholder')}
                            className="pl-10 rounded-full bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <StoreGrid stores={filteredStores} isLoading={isLoading} />
            </div>
        </div>
    );
}
