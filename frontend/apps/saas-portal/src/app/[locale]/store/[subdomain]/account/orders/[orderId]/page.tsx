'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, Package, Truck, CheckCircle2, Clock, MapPin, ChevronLeft, HandCoins, Paperclip, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { usePublicStore } from "@shared/lib/hooks/usePublicStore";
import { useCustomerAuth } from "@shared/context/CustomerAuthContext";
import {
    getMyOrderById,
    getMyRefundRequests,
    createRefundRequest,
    uploadRefundEvidencePhoto,
    type RefundRequest
} from "@shared/services/customerAuthService";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Badge } from "@shared/components/ui/badge";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { RequireCustomer } from "../../RequireCustomer";
import { imagePreset } from "@shared/lib/cloudinaryImage";

// Reuses the same visual language as the public track-order page (see
// store/[subdomain]/track-order/page.tsx) and its `store.trackOrder`
// translations, since this is the same order-detail shape just fetched via
// the logged-in customer's own /account/:storeId/orders/:orderId endpoint
// instead of the public orderNumber+storeId lookup.
function OrderDetailContent({ storeId, orderId, primaryColor }: { storeId: string; orderId: string; primaryColor: string }) {
    const t = useTranslations('store.trackOrder');
    const tr = useTranslations('store.account.refund');
    const locale = useLocale();
    const { customer } = useCustomerAuth();
    const [order, setOrder] = useState<any>(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
    const [showRefundForm, setShowRefundForm] = useState(false);
    const [refundAmount, setRefundAmount] = useState('');
    const [refundReason, setRefundReason] = useState('');
    const [refundPhoto, setRefundPhoto] = useState<File | null>(null);
    const [submittingRefund, setSubmittingRefund] = useState(false);

    const fetchRefundRequests = () => {
        getMyRefundRequests(storeId, orderId).then(setRefundRequests).catch(() => setRefundRequests([]));
    };

    useEffect(() => {
        if (!customer) return;
        getMyOrderById(storeId, orderId)
            .then(setOrder)
            .catch((err) => setError(err.response?.data?.message || t('error')))
            .finally(() => setIsLoading(false));
        fetchRefundRequests();
    }, [storeId, orderId, customer]);

    const remainingRefundable = order ? (order.total || 0) - (order.refundedAmount || 0) : 0;
    const latestRequest = refundRequests[0];
    const hasPendingRequest = latestRequest?.status === 'pending';
    const isRefundEligible = order && ['paid', 'partially_refunded'].includes(order.paymentStatus) && remainingRefundable > 0;

    const handleSubmitRefundRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(refundAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error(tr('amountLabel'));
            return;
        }
        if (!refundReason.trim()) {
            toast.error(tr('reasonLabel'));
            return;
        }
        try {
            setSubmittingRefund(true);
            let photoUrl: string | undefined;
            let photoPublicId: string | undefined;
            if (refundPhoto) {
                const uploaded = await uploadRefundEvidencePhoto(storeId, refundPhoto);
                photoUrl = uploaded.url;
                photoPublicId = uploaded.publicId;
            }
            await createRefundRequest(storeId, orderId, { amount, reason: refundReason.trim(), photoUrl, photoPublicId });
            toast.success(tr('success'));
            setShowRefundForm(false);
            setRefundAmount('');
            setRefundReason('');
            setRefundPhoto(null);
            fetchRefundRequests();
        } catch (err: any) {
            toast.error(err.response?.data?.message || tr('error'));
        } finally {
            setSubmittingRefund(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'confirmed': return <Package className="w-5 h-5 text-blue-500" />;
            case 'processing': return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
            case 'shipped': return <Truck className="w-5 h-5 text-purple-500" />;
            case 'delivered': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
            default: return <Package className="w-5 h-5 text-gray-500" />;
        }
    };

    if (isLoading) {
        return (
            <div className="py-32 flex justify-center">
                <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="py-20 text-center">
                <p className="text-red-500 font-bold">{error || t('error')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <Link href="/account/orders" className="inline-flex items-center gap-1 text-sm font-bold text-gray-500 hover:text-black transition-colors">
                <ChevronLeft className="w-4 h-4" /> {t('title')}
            </Link>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h2 className="text-2xl font-black flex items-center gap-3">
                        <span>{t('orderTitle', { orderNumber: order.orderNumber })}</span>
                        <Badge className="rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-widest" variant="secondary">
                            {order.status}
                        </Badge>
                    </h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                        {t('placedOn', { date: new Date(order.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { dateStyle: 'long' }) })}
                    </p>
                </div>
                <div className={`${locale === 'ar' ? 'text-left' : 'text-right'}`}>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">{t('totalAmount')}</p>
                    <p className="text-3xl font-black" style={{ color: primaryColor }}>EGP {order.total.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-6">
                    <Card className="rounded-[32px] border-2 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg font-black">{t('progress')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="relative space-y-8">
                                <div className={`absolute ${locale === 'ar' ? 'right-[10px]' : 'left-[10px]'} top-2 bottom-2 w-0.5 bg-gray-100`} />
                                {order.timeline?.map((event: any, idx: number) => (
                                    <div key={idx} className={`relative flex gap-6 ${locale === 'ar' ? 'pr-8' : 'pl-8'}`}>
                                        <div className={`absolute ${locale === 'ar' ? 'right-0' : 'left-0'} top-1.5 w-[22px] h-[22px] rounded-full bg-white border-4 flex items-center justify-center z-10`}
                                            style={{ borderColor: idx === order.timeline.length - 1 ? primaryColor : '#E5E7EB' }}>
                                            {idx === order.timeline.length - 1 && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-sm capitalize">{event.status}</p>
                                            <p className="text-xs text-gray-500">{event.note}</p>
                                            <p className="text-[10px] text-gray-400 font-medium uppercase">{new Date(event.timestamp).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US')}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-[32px] border-2 shadow-sm overflow-hidden">
                        <CardHeader>
                            <CardTitle className="text-lg font-black">{t('contents')}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {order.items.map((item: any, idx: number) => (
                                    <div key={idx} className="p-4 flex gap-4 items-center">
                                        <div className="w-16 h-16 bg-gray-50 rounded-2xl border overflow-hidden flex-shrink-0">
                                            {item.image && <img src={imagePreset.thumbnail(item.image)} alt={item.name} loading="lazy" decoding="async" width={100} height={100} className="w-full h-full object-cover" />}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm">{item.name}</p>
                                            {item.variant && (
                                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">{item.variant}</p>
                                            )}
                                            <p className="text-xs text-gray-500">{item.quantity} x EGP {item.price.toLocaleString()}</p>
                                        </div>
                                        <div className={`${locale === 'ar' ? 'text-left' : 'text-right'}`}>
                                            <p className="font-black text-sm">EGP {(item.price * item.quantity).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-gray-50/50 p-6 space-y-2">
                                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                    <span>{t('subtotal')}</span>
                                    <span>EGP {order.subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                                    <span>{t('shipping')}</span>
                                    <span>EGP {order.shipping.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-lg font-black border-t pt-4">
                                    <span>{t('total')}</span>
                                    <span style={{ color: primaryColor }}>EGP {order.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="rounded-[32px] border-2 shadow-sm h-fit">
                    <CardHeader>
                        <CardTitle className="text-lg font-black">{t('details')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-gray-400">
                                <div className="p-2 border rounded-xl bg-gray-50">
                                    <MapPin className="w-4 h-4" />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest">{t('address')}</p>
                            </div>
                            <div className={`${locale === 'ar' ? 'pr-12' : 'pl-12'} text-sm font-medium space-y-1`}>
                                <p className="font-black">{order.shippingAddress.fullName}</p>
                                <p className="text-gray-600">{order.shippingAddress.address}</p>
                                <p className="text-gray-600">{order.shippingAddress.city}, {order.shippingAddress.state}</p>
                                <p className="text-gray-400">{order.shippingAddress.phone}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 text-gray-400">
                                <div className="p-2 border rounded-xl bg-gray-50">
                                    {getStatusIcon(order.status)}
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest">{t('status')}</p>
                            </div>
                            <div className={`${locale === 'ar' ? 'pr-12' : 'pl-12'}`}>
                                <p className="font-black capitalize">{order.status}</p>
                                <p className="text-xs text-gray-500">
                                    {order.status === 'pending' ? t('statusReviewed') : t('statusMsg', { status: order.status })}
                                </p>
                            </div>
                        </div>

                        {order.trackingNumber && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-gray-400">
                                    <div className="p-2 border rounded-xl bg-gray-50">
                                        <Truck className="w-4 h-4" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest">{t('shipment')}</p>
                                </div>
                                <div className={`${locale === 'ar' ? 'pr-12' : 'pl-12'} text-sm space-y-1`}>
                                    <p className="font-black">{order.shippingProvider}</p>
                                    <p className="text-gray-500 font-mono text-xs">{order.trackingNumber}</p>
                                    {order.trackingUrl && (
                                        <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                                            <Button
                                                size="sm"
                                                className="w-full rounded-xl font-black text-xs uppercase tracking-widest mt-2"
                                                style={{ backgroundColor: primaryColor }}
                                            >
                                                {t('trackPackage')} <ExternalLink className="w-3.5 h-3.5 ml-2 rtl:mr-2 rtl:ml-0" />
                                            </Button>
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {isRefundEligible && (
                    <Card className="rounded-[32px] border-2 shadow-sm h-fit">
                        <CardHeader>
                            <CardTitle className="text-lg font-black flex items-center gap-2">
                                <HandCoins className="w-4 h-4" /> {tr('title')}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Show the latest request's outcome as history whenever one
                                exists — but only PENDING blocks a new submission. An
                                approved (partial) or rejected request still leaves the
                                button available if there's remaining balance, since the
                                customer may reasonably need to ask again. */}
                            {latestRequest && (
                                <div className="space-y-1">
                                    <Badge
                                        className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                                        variant={latestRequest.status === 'approved' ? 'default' : latestRequest.status === 'rejected' ? 'destructive' : 'secondary'}
                                    >
                                        {latestRequest.status === 'approved'
                                            ? tr('approved', { amount: (latestRequest.finalAmount ?? 0).toLocaleString() })
                                            : latestRequest.status === 'rejected'
                                                ? tr('rejected')
                                                : tr('pending')}
                                    </Badge>
                                    {latestRequest.merchantResponseNote && (
                                        <p className="text-xs text-gray-500">
                                            <span className="font-bold">{tr('note')}:</span> {latestRequest.merchantResponseNote}
                                        </p>
                                    )}
                                </div>
                            )}
                            {hasPendingRequest ? null : !showRefundForm ? (
                                <Button
                                    onClick={() => { setRefundAmount(String(remainingRefundable)); setShowRefundForm(true); }}
                                    className="w-full rounded-2xl font-black text-xs uppercase tracking-widest"
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {tr('request')}
                                </Button>
                            ) : (
                                <form onSubmit={handleSubmitRefundRequest} className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{tr('amountLabel')}</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={remainingRefundable}
                                            step="0.01"
                                            value={refundAmount}
                                            onChange={(e) => setRefundAmount(e.target.value)}
                                            className="rounded-xl h-11"
                                        />
                                        <p className="text-[10px] text-gray-400">{tr('maxAmount', { amount: remainingRefundable.toLocaleString() })}</p>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">{tr('reasonLabel')}</label>
                                        <textarea
                                            value={refundReason}
                                            onChange={(e) => setRefundReason(e.target.value)}
                                            placeholder={tr('reasonPlaceholder')}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-xl border bg-white text-sm outline-none focus:border-black resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-1">
                                            <Paperclip className="w-3 h-3" /> {tr('photoLabel')}
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setRefundPhoto(e.target.files?.[0] || null)}
                                            className="w-full text-xs"
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => setShowRefundForm(false)}>
                                            {tr('cancel')}
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={submittingRefund}
                                            className="flex-1 rounded-xl font-black text-xs uppercase tracking-widest"
                                            style={{ backgroundColor: primaryColor }}
                                        >
                                            {submittingRefund ? <Loader2 className="w-4 h-4 animate-spin" /> : tr('submit')}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

export default function AccountOrderDetailPage() {
    const params = useParams();
    const subdomain = params.subdomain as string;
    const orderId = params.orderId as string;
    const { data: storeData } = usePublicStore(subdomain);
    const store = storeData as any;
    const primaryColor = store?.branding?.primaryColor || "#3B82F6";
    const storeId = store?._id || store?.id;

    return (
        <div className="container mx-auto px-4 py-20 max-w-5xl">
            <RequireCustomer primaryColor={primaryColor}>
                {storeId && <OrderDetailContent storeId={storeId} orderId={orderId} primaryColor={primaryColor} />}
            </RequireCustomer>
        </div>
    );
}
