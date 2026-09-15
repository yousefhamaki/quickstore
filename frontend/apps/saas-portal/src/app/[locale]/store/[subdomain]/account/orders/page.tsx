'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Package, ShoppingCart, Loader2, ChevronRight } from "lucide-react";
import { usePublicStore } from "@shared/lib/hooks/usePublicStore";
import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import { getMyOrders } from "@shared/services/customerAuthService";
import { Card, CardContent } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { AccountNav } from "../AccountNav";
import { RequireCustomer } from "../RequireCustomer";

function OrdersContent({ storeId, primaryColor }: { storeId: string; primaryColor: string }) {
    const t = useTranslations('store.account.orders');
    const locale = useLocale();
    const { customer } = useCustomerAuth();
    const [orders, setOrders] = useState<any[] | null>(null);

    useEffect(() => {
        if (!customer) return;
        getMyOrders(storeId).then(setOrders).catch(() => setOrders([]));
    }, [storeId, customer]);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1">
                <AccountNav primaryColor={primaryColor} />
            </div>
            <div className="lg:col-span-3 space-y-8">
                <h1 className="text-3xl font-black tracking-tighter">{t('title')}</h1>

                {orders === null ? (
                    <div className="py-20 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="py-20 text-center space-y-6">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                            <ShoppingCart size={24} />
                        </div>
                        <p className="text-gray-500 font-bold">{t('empty')}</p>
                        <Button asChild className="rounded-2xl h-12 px-8 font-black text-sm uppercase tracking-widest" style={{ backgroundColor: primaryColor }}>
                            <Link href="/">{t('startShopping')}</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <Link key={order._id} href={`/account/orders/${order._id}`}>
                                <Card className="rounded-[32px] border-2 shadow-sm hover:shadow-xl transition">
                                    <CardContent className="p-6 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0">
                                            <Package className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-sm truncate">{order.orderNumber}</p>
                                            <p className="text-xs text-gray-400 font-medium">
                                                {t('placedOn', { date: new Date(order.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'medium' }) })}
                                            </p>
                                        </div>
                                        <Badge className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest shrink-0" variant="secondary">
                                            {order.status}
                                        </Badge>
                                        <p className="font-black text-sm shrink-0" style={{ color: primaryColor }}>EGP {order.total?.toLocaleString()}</p>
                                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function AccountOrdersPage() {
    const params = useParams();
    const subdomain = params.subdomain as string;
    const { data: storeData } = usePublicStore(subdomain);
    const store = storeData as any;
    const primaryColor = store?.branding?.primaryColor || "#3B82F6";
    const storeId = store?._id || store?.id;

    return (
        <div className="container mx-auto px-4 py-20 max-w-6xl">
            <RequireCustomer primaryColor={primaryColor}>
                {storeId && <OrdersContent storeId={storeId} primaryColor={primaryColor} />}
            </RequireCustomer>
        </div>
    );
}
