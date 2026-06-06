'use client';

import { memo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NavLink } from '@/components/NavLink';
import { Store, LayoutDashboard } from 'lucide-react';
import { useTranslations } from 'next-intl';

const StoreManagementCard = memo(({ storeCount }: { storeCount: number }) => {
    const t = useTranslations('dashboard.home');

    return (
        <Card className="lg:col-span-2 shadow-xl border-0 overflow-hidden glass">
            <CardHeader className="bg-white/50 border-b flex flex-row items-center justify-between">
                <div>
                    <CardTitle>{t('manageStores')}</CardTitle>
                    <CardDescription>{t('manageStoresSubtitle')}</CardDescription>
                </div>
                <NavLink href="/dashboard">
                    <Button variant="outline" size="sm" className="rounded-full">{t('viewAllStores')}</Button>
                </NavLink>
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
                                <span className="text-sm font-bold">{storeCount} Total Stores</span>
                            </div>
                        </div>
                        <NavLink href="/dashboard" className="block w-full">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black h-14 rounded-2xl shadow-xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                Go to My Stores
                            </Button>
                        </NavLink>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

StoreManagementCard.displayName = 'StoreManagementCard';

export default StoreManagementCard;
