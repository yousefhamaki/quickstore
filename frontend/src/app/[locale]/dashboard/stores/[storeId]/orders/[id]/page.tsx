'use client';

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    ChevronLeft,
    ChevronRight,
    Package,
    Clock,
    CheckCircle2,
    XCircle,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    AlertCircle,
    Loader2
} from "lucide-react";
import Link from "next/link";
import { getOrder, updateOrderStatus } from "@/services/orderService";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslations, useLocale } from "next-intl";
import { ar, enUS } from 'date-fns/locale';

export default function OrderDetailsPage({ params }: { params: Promise<{ storeId: string, id: string }> }) {
    const t = useTranslations('merchant.orderDetails');
    const ts = useTranslations('merchant.orders.status');
    const localeString = useLocale();
    const dateLocale = localeString === 'ar' ? ar : enUS;

    const { storeId, id } = use(params);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const data = await getOrder(id);
            setOrder(data);
        } catch (error) {
            console.error("Failed to fetch order", error);
            toast.error(t('loadError'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
    }, [id]);

    const handleStatusUpdate = async (newStatus: string) => {
        try {
            setUpdating(true);
            await updateOrderStatus(id, newStatus);
            toast.success(t('updateSuccess', { status: ts(newStatus) }));
            fetchOrder();
        } catch (error) {
            toast.error(t('updateError'));
        } finally {
            setUpdating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="p-8 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
                <h2 className="text-2xl font-bold">{t('notFound')}</h2>
                <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/dashboard/stores/${storeId}/orders`}>{t('back')}</Link>
                </Button>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        const s = status.toLowerCase();
        switch (s) {
            case 'pending': return <Badge className="bg-yellow-500 rounded-full">{ts(s)}</Badge>;
            case 'processing': return <Badge className="bg-blue-500 rounded-full">{ts(s)}</Badge>;
            case 'shipped': return <Badge className="bg-purple-500 rounded-full">{ts(s)}</Badge>;
            case 'delivered': return <Badge className="bg-green-500 rounded-full">{ts(s)}</Badge>;
            case 'cancelled': return <Badge className="bg-red-500 rounded-full">{ts(s)}</Badge>;
            default: return <Badge className="rounded-full">{status}</Badge>;
        }
    };

    return (
        <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild className="rounded-xl border-2 shrink-0">
                        <Link href={`/dashboard/stores/${storeId}/orders`}>
                            {localeString === 'ar' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        </Link>
                    </Button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-black tracking-tight">{order.orderNumber}</h1>
                            {getStatusBadge(order.status)}
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">
                            {t('placedOn', { date: format(new Date(order.createdAt), 'MMMM dd, yyyy at hh:mm a', { locale: dateLocale }) })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <select
                        className="h-10 px-3 rounded-xl border-2 bg-background font-bold text-sm outline-none"
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(e.target.value)}
                        disabled={updating}
                    >
                        <option value="pending">{ts('pending')}</option>
                        <option value="processing">{ts('processing')}</option>
                        <option value="shipped">{ts('shipped')}</option>
                        <option value="delivered">{ts('delivered')}</option>
                        <option value="cancelled">{ts('cancelled')}</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Order Items */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="rounded-3xl border-2 overflow-hidden shadow-sm">
                        <CardHeader className="bg-muted/30 border-b">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Package className="w-5 h-5" /> {t('orderItems')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {order.items?.map((item: any, idx: number) => (
                                    <div key={idx} className="p-6 flex items-center gap-6">
                                        <div className="w-20 h-20 bg-muted rounded-2xl overflow-hidden shrink-0 border">
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><Package className="text-muted-foreground" /></div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold truncate">{item.name}</h4>
                                            {item.variant && (
                                                <p className="text-xs font-semibold text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-full mt-1">
                                                    {item.variant}
                                                </p>
                                            )}
                                            <p className="text-sm text-muted-foreground mt-1">{t('qty')}: {item.quantity} × EGP {item.price.toLocaleString()}</p>
                                        </div>
                                        <div className={`${localeString === 'ar' ? 'text-left' : 'text-right'}`}>
                                            <p className="font-black">EGP {(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('summary')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('subtotal')}</span>
                                <span className="font-bold">EGP {order.subtotal?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('shipping')}</span>
                                <span className="font-bold">EGP {order.shipping?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('tax')}</span>
                                <span className="font-bold">EGP {order.tax?.toLocaleString()}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-lg font-black tracking-tight">{t('total')}</span>
                                <span className="text-2xl font-black">EGP {order.total?.toLocaleString()}</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Info */}
                <div className="space-y-8">
                    <Card className="rounded-3xl border-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('customerInfo')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User size={18} />
                                </div>
                                <div className={`${localeString === 'ar' ? 'text-right' : 'text-left'}`}>
                                    <p className="font-bold">{order.customerId?.firstName} {order.customerId?.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{t('customerId')}: {order.customerId?._id?.slice(-8)}</p>
                                </div>
                            </div>
                            <Separator />
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail size={14} /> {order.customerId?.email}
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Phone size={14} /> {order.customerId?.phone || order.shippingAddress?.phone}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('shippingAddress')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-start gap-2">
                                <MapPin size={16} className="text-muted-foreground mt-1" />
                                <div>
                                    <p className="font-bold">{order.shippingAddress?.fullName}</p>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {order.shippingAddress?.address}<br />
                                        {order.shippingAddress?.city}, {order.shippingAddress?.postalCode}<br />
                                        {order.shippingAddress?.country}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-3xl border-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">{t('payment')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CreditCard size={16} className="text-muted-foreground" />
                                    <span>{t('paymentMethod')}</span>
                                </div>
                                <span className="font-bold underline decoration-primary decoration-2 underline-offset-4">{order.paymentMethod}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 size={16} className="text-muted-foreground" />
                                    <span>{t('paymentStatus')}</span>
                                </div>
                                <Badge variant="outline" className={cn(
                                    "rounded-full font-bold uppercase",
                                    order.paymentStatus === 'paid' ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"
                                )}>
                                    {order.paymentStatus}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
