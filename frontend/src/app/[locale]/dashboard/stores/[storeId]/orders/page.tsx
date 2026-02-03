'use client';

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ShoppingCart,
    Search,
    Download,
    Eye,
    Truck,
    Package,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import Link from "next/link";
import { getOrders } from "@/services/orderService";
import { toast } from "sonner";
import { format } from "date-fns";
import { useWallet } from "@/context/WalletContext";
import { BillingGuardModal } from "@/components/merchant/BillingGuardModal";
import { useEffect as useReactEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { ar, enUS } from 'date-fns/locale';

export default function StoreOrdersPage({ params }: { params: Promise<{ storeId: string }> }) {
    const t = useTranslations('merchant.orders');
    const localeString = useLocale();
    const dateLocale = localeString === 'ar' ? ar : enUS;

    const { storeId } = use(params);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const { isBlocked } = useWallet();
    const [showBlockedModal, setShowBlockedModal] = useState(false);

    useReactEffect(() => {
        if (isBlocked) {
            setShowBlockedModal(true);
        }
    }, [isBlocked]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await getOrders({
                storeId,
                pageNumber: page,
                status: statusFilter || undefined,
                search: searchTerm || undefined
            }) as any;
            setOrders(data.orders || []);
            setPages(data.pages || 1);
        } catch (error) {
            console.error("Failed to fetch orders", error);
            toast.error(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, [storeId, page, statusFilter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchOrders();
    };

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        switch (s) {
            case 'pending':
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1 rounded-full"><Clock size={12} /> {t(`status.${s}`)}</Badge>;
            case 'processing':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 rounded-full"><Package size={12} /> {t(`status.${s}`)}</Badge>;
            case 'shipped':
                return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 gap-1 rounded-full"><Truck size={12} /> {t(`status.${s}`)}</Badge>;
            case 'delivered':
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1 rounded-full"><CheckCircle2 size={12} /> {t(`status.${s}`)}</Badge>;
            case 'cancelled':
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1 rounded-full"><XCircle size={12} /> {t(`status.${s}`)}</Badge>;
            default:
                return <Badge variant="outline" className="rounded-full">{status}</Badge>;
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground text-sm">{t('subtitle')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="rounded-xl border-2">
                        <Download className="w-4 h-4 mr-2" /> {t('export')}
                    </Button>
                </div>
            </div>

            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <form onSubmit={handleSearch} className="relative flex-1">
                            <Search className={`absolute ${localeString === 'ar' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4`} />
                            <input
                                type="text"
                                placeholder={t('searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={`w-full ${localeString === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 rounded-xl border-border bg-background focus:ring-2 focus:ring-primary/20 border transition-all text-sm outline-none`}
                            />
                        </form>
                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border-border bg-background border text-sm outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="">{t('allStatuses')}</option>
                                <option value="pending">{t('status.pending')}</option>
                                <option value="processing">{t('status.processing')}</option>
                                <option value="shipped">{t('status.shipped')}</option>
                                <option value="delivered">{t('status.delivered')}</option>
                                <option value="cancelled">{t('status.cancelled')}</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center p-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center space-y-4">
                            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
                                <ShoppingCart className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold">{t('noOrdersFound')}</h3>
                                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                    {t('noOrdersSubtitle')}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className={`w-full text-sm ${localeString === 'ar' ? 'text-right' : 'text-left'}`}>
                                <thead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-muted/20 border-b">
                                    <tr>
                                        <th className="px-6 py-4">{t('table.order')}</th>
                                        <th className="px-6 py-4">{t('table.date')}</th>
                                        <th className="px-6 py-4">{t('table.customer')}</th>
                                        <th className="px-6 py-4">{t('table.total')}</th>
                                        <th className="px-6 py-4">{t('table.status')}</th>
                                        <th className={`px-6 py-4 ${localeString === 'ar' ? 'text-left' : 'text-right'}`}>{t('table.action')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {orders.map((order) => (
                                        <tr key={order._id} className="hover:bg-muted/10 transition-colors group">
                                            <td className="px-6 py-4 font-black">
                                                {order.orderNumber}
                                            </td>
                                            <td className="px-6 py-4 text-muted-foreground">
                                                {format(new Date(order.createdAt), 'MMM dd, yyyy', { locale: dateLocale })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold">
                                                    {order.customerId?.firstName} {order.customerId?.lastName}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {order.customerId?.email}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-black">
                                                EGP {order.total.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className={`px-6 py-4 ${localeString === 'ar' ? 'text-left' : 'text-right'}`}>
                                                <Button variant="ghost" size="sm" asChild className="rounded-lg hover:bg-muted font-bold h-8">
                                                    <Link href={`/dashboard/stores/${storeId}/orders/${order._id}`}>
                                                        <Eye className={`w-4 h-4 ${localeString === 'ar' ? 'ml-2' : 'mr-2'}`} /> {t('table.view')}
                                                    </Link>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
                {pages > 1 && (
                    <div className="px-6 py-4 border-t bg-muted/10 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground font-medium">{t('pagination', { page, pages })}</p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                {localeString === 'ar' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => setPage(p => Math.min(pages, p + 1))}
                                disabled={page === pages}
                            >
                                {localeString === 'ar' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            <BillingGuardModal open={showBlockedModal} onOpenChange={setShowBlockedModal} />
        </div>
    );
}
