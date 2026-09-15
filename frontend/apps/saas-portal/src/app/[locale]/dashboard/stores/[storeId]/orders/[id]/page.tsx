'use client';

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Badge } from "@shared/components/ui/badge";
import { Separator } from "@shared/components/ui/separator";
import { Textarea } from "@shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { imagePreset } from "@shared/lib/cloudinaryImage";
import {
    ChevronLeft,
    ChevronRight,
    Package,
    CheckCircle2,
    User,
    Mail,
    Phone,
    MapPin,
    CreditCard,
    AlertCircle,
    Loader2,
    Truck,
    ExternalLink,
    Pencil
} from "lucide-react";
import Link from "next/link";
import { getOrder, updateOrderStatus, issuePartialRefund, setOrderTracking } from "@shared/services/orderService";
import { Label } from "@shared/components/ui/label";
import { Input } from "@shared/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@shared/lib/utils";
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
    const [generatingWaybill, setGeneratingWaybill] = useState(false);
    const [refundDialogOpen, setRefundDialogOpen] = useState(false);
    const [refundReason, setRefundReason] = useState('');
    const [issueRefundDialogOpen, setIssueRefundDialogOpen] = useState(false);
    const [issueRefundAmount, setIssueRefundAmount] = useState('');
    const [issueRefundReason, setIssueRefundReason] = useState('');
    const [issuingRefund, setIssuingRefund] = useState(false);
    const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
    const [carrierNameInput, setCarrierNameInput] = useState('');
    const [trackingNumberInput, setTrackingNumberInput] = useState('');
    const [trackingUrlInput, setTrackingUrlInput] = useState('');
    const [savingTracking, setSavingTracking] = useState(false);

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

    const handleStatusUpdate = async (newStatus: string, reason?: string) => {
        try {
            setUpdating(true);
            await updateOrderStatus(id, newStatus, reason);
            toast.success(t('updateSuccess', { status: ts(newStatus) }));
            fetchOrder();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t('updateError'));
        } finally {
            setUpdating(false);
        }
    };

    const handleStatusSelect = (newStatus: string) => {
        if (newStatus === 'refunded') {
            // Refunding reverses the platform order fee, coupon usage, and
            // store stats server-side — require a reason for the audit
            // trail instead of silently flipping the status.
            setRefundReason('');
            setRefundDialogOpen(true);
            return;
        }
        handleStatusUpdate(newStatus);
    };

    const handleConfirmRefund = async () => {
        if (!refundReason.trim()) {
            toast.error(t('refundReasonRequired'));
            return;
        }
        await handleStatusUpdate('refunded', refundReason.trim());
        setRefundDialogOpen(false);
    };

    const remainingRefundable = order ? (order.total || 0) - (order.refundedAmount || 0) : 0;

    const openIssueRefundDialog = () => {
        setIssueRefundAmount('');
        setIssueRefundReason('');
        setIssueRefundDialogOpen(true);
    };

    const handleConfirmIssueRefund = async () => {
        const amount = Number(issueRefundAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            toast.error(t('refundAmountLabel'));
            return;
        }
        if (!issueRefundReason.trim()) {
            toast.error(t('refundReasonRequired'));
            return;
        }
        try {
            setIssuingRefund(true);
            await issuePartialRefund(id, amount, issueRefundReason.trim());
            toast.success(t('confirmIssueRefund'));
            setIssueRefundDialogOpen(false);
            fetchOrder();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t('updateError'));
        } finally {
            setIssuingRefund(false);
        }
    };

    const handleGenerateWaybill = async () => {
        try {
            setGeneratingWaybill(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/shipping/waybill/${id}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ storeId })
            });

            if (!response.ok) throw new Error('API Rejection');
            toast.success("Waybill generated successfully");
            fetchOrder();
        } catch (error) {
            toast.error("Waybill generation failed. Please verify your provider API keys.");
        } finally {
            setGeneratingWaybill(false);
        }
    };

    const openTrackingDialog = () => {
        setCarrierNameInput(order.shippingProvider && order.shippingProvider !== 'local' ? order.shippingProvider : '');
        setTrackingNumberInput(order.trackingNumber || '');
        setTrackingUrlInput(order.trackingUrl || '');
        setTrackingDialogOpen(true);
    };

    const handleSaveTracking = async () => {
        if (!carrierNameInput.trim() || !trackingNumberInput.trim()) {
            toast.error(t('trackingFieldsRequired'));
            return;
        }
        try {
            setSavingTracking(true);
            await setOrderTracking(id, storeId, {
                carrierName: carrierNameInput.trim(),
                trackingNumber: trackingNumberInput.trim(),
                trackingUrl: trackingUrlInput.trim() || undefined,
            });
            toast.success(t('trackingSaved'));
            setTrackingDialogOpen(false);
            fetchOrder();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t('updateError'));
        } finally {
            setSavingTracking(false);
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
            case 'refunded': return <Badge className="bg-slate-700 rounded-full">{ts(s)}</Badge>;
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
                            {order.shippingStatus && (
                                <Badge variant="outline" className="border-primary text-primary bg-primary/10 rounded-full font-bold uppercase tracking-wide">
                                    {order.shippingStatus.replace(/_/g, ' ')}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground text-sm font-medium">
                            {t('placedOn', { date: format(new Date(order.createdAt), 'MMMM dd, yyyy at hh:mm a', { locale: dateLocale }) })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* waybillUrl only ever gets set by a real courier API (Bosta) —
                        manually-entered tracking (see the Shipment & Tracking card
                        below) has no PDF to download, so this button must check for
                        that specifically rather than just "some tracking exists". */}
                    {order.waybillUrl ? (
                        <Button asChild variant="default" className="rounded-xl shadow-lg">
                            <a href={order.waybillUrl} target="_blank" rel="noreferrer">
                                <Package className="w-4 h-4 mr-2" /> Download Waybill
                            </a>
                        </Button>
                    ) : !order.trackingNumber ? (
                        <Button onClick={handleGenerateWaybill} disabled={generatingWaybill} variant="secondary" className="rounded-xl shadow-sm border-2">
                            {generatingWaybill ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Package className="w-4 h-4 mr-2" />}
                            Generate Waybill
                        </Button>
                    ) : null}
                    {remainingRefundable > 0 && ['paid', 'partially_refunded'].includes(order.paymentStatus) && (
                        <Button onClick={openIssueRefundDialog} variant="secondary" className="rounded-xl shadow-sm border-2">
                            {t('issueRefund')}
                        </Button>
                    )}
                    <select
                        className="h-10 px-3 rounded-xl border-2 bg-background font-bold text-sm outline-none disabled:opacity-50"
                        value={order.status}
                        onChange={(e) => handleStatusSelect(e.target.value)}
                        disabled={updating || order.status === 'refunded'}
                        title={order.status === 'refunded' ? t('refundedTerminal') : undefined}
                    >
                        <option value="pending">{ts('pending')}</option>
                        <option value="processing">{ts('processing')}</option>
                        <option value="shipped">{ts('shipped')}</option>
                        <option value="delivered">{ts('delivered')}</option>
                        <option value="cancelled">{ts('cancelled')}</option>
                        <option value="refunded">{ts('refunded')}</option>
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
                                                <img src={imagePreset.thumbnail(item.image)} alt={item.name} loading="lazy" decoding="async" width={100} height={100} className="w-full h-full object-cover" />
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
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Truck className="w-4 h-4" /> {t('shipment.title')}
                            </CardTitle>
                            {order.trackingNumber && (
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={openTrackingDialog} title={t('shipment.edit')}>
                                    <Pencil className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            {order.trackingNumber ? (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">{t('shipment.carrier')}</span>
                                        <span className="font-bold">{order.shippingProvider}</span>
                                    </div>
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-muted-foreground shrink-0">{t('shipment.trackingNumber')}</span>
                                        <span className="font-bold font-mono text-xs truncate">{order.trackingNumber}</span>
                                    </div>
                                    {order.trackingUrl && (
                                        <Button asChild variant="outline" size="sm" className="w-full rounded-xl mt-2">
                                            <a href={order.trackingUrl} target="_blank" rel="noreferrer">
                                                {t('shipment.trackPackage')} <ExternalLink className="w-3.5 h-3.5 ml-2 rtl:mr-2 rtl:ml-0" />
                                            </a>
                                        </Button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <p className="text-muted-foreground">{t('shipment.noTracking')}</p>
                                    <Button variant="outline" size="sm" className="w-full rounded-xl" onClick={openTrackingDialog}>
                                        {t('shipment.addTracking')}
                                    </Button>
                                </>
                            )}
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
                                    order.paymentStatus === 'paid' ? "bg-green-50 text-green-700" : order.paymentStatus === 'refunded' ? "bg-slate-100 text-slate-700" : "bg-yellow-50 text-yellow-700"
                                )}>
                                    {order.paymentStatus}
                                </Badge>
                            </div>
                        </CardContent>
                    </Card>

                    {order.refunds?.length > 0 && (
                        <Card className="rounded-3xl border-2 border-slate-300 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">{t('refundHistory')}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">{t('refundAmount')}</span>
                                    <span className="font-bold">EGP {order.refundedAmount?.toLocaleString()} / {order.total?.toLocaleString()}</span>
                                </div>
                                <Separator />
                                {order.refunds.map((r: any, idx: number) => (
                                    <div key={idx} className="space-y-1">
                                        <div className="flex justify-between">
                                            <span className="font-bold">EGP {r.amount?.toLocaleString()}</span>
                                            <span className="text-muted-foreground text-xs">{format(new Date(r.refundedAt), 'MMM dd, yyyy', { locale: dateLocale })}</span>
                                        </div>
                                        <p className="text-muted-foreground italic text-xs">"{r.reason}"</p>
                                        {idx < order.refunds.length - 1 && <Separator className="mt-3" />}
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Refund Reason Dialog */}
            <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('refundOrder')}</DialogTitle>
                        <DialogDescription>{t('refundDialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <Textarea
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        placeholder={t('refundReasonPlaceholder')}
                        className="rounded-xl border-2 min-h-[100px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setRefundDialogOpen(false)} disabled={updating}>
                            {t('cancel')}
                        </Button>
                        <Button variant="destructive" className="rounded-xl" onClick={handleConfirmRefund} disabled={updating || !refundReason.trim()}>
                            {updating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {t('confirmRefund')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Issue Partial Refund Dialog */}
            <Dialog open={issueRefundDialogOpen} onOpenChange={setIssueRefundDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('issueRefundDialogTitle')}</DialogTitle>
                        <DialogDescription>{t('issueRefundDialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-xs text-muted-foreground font-medium">
                            {t('remainingRefundable', { amount: remainingRefundable.toLocaleString() })}
                        </p>
                        <Input
                            type="number"
                            min={0}
                            max={remainingRefundable}
                            step="0.01"
                            value={issueRefundAmount}
                            onChange={(e) => setIssueRefundAmount(e.target.value)}
                            placeholder={t('refundAmountLabel')}
                            className="rounded-xl border-2"
                        />
                        <Textarea
                            value={issueRefundReason}
                            onChange={(e) => setIssueRefundReason(e.target.value)}
                            placeholder={t('refundReasonPlaceholder')}
                            className="rounded-xl border-2 min-h-[100px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setIssueRefundDialogOpen(false)} disabled={issuingRefund}>
                            {t('cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            className="rounded-xl"
                            onClick={handleConfirmIssueRefund}
                            disabled={issuingRefund || !issueRefundReason.trim() || !issueRefundAmount || Number(issueRefundAmount) <= 0 || Number(issueRefundAmount) > remainingRefundable}
                        >
                            {issuingRefund ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {t('confirmIssueRefund')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Shipment Tracking Dialog — the only way to record tracking for
                'local'/self-managed shipping, which has no courier API to call.
                Also works as a manual override for API-integrated providers. */}
            <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{order?.trackingNumber ? t('shipment.editTitle') : t('shipment.addTitle')}</DialogTitle>
                        <DialogDescription>{t('shipment.dialogDescription')}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <Label>{t('shipment.carrierLabel')}</Label>
                            <Input
                                value={carrierNameInput}
                                onChange={(e) => setCarrierNameInput(e.target.value)}
                                placeholder={t('shipment.carrierPlaceholder')}
                                className="rounded-xl border-2"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('shipment.trackingNumberLabel')}</Label>
                            <Input
                                value={trackingNumberInput}
                                onChange={(e) => setTrackingNumberInput(e.target.value)}
                                placeholder={t('shipment.trackingNumberPlaceholder')}
                                className="rounded-xl border-2"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>{t('shipment.trackingUrlLabel')}</Label>
                            <Input
                                value={trackingUrlInput}
                                onChange={(e) => setTrackingUrlInput(e.target.value)}
                                placeholder="https://..."
                                className="rounded-xl border-2"
                            />
                            <p className="text-xs text-muted-foreground">{t('shipment.trackingUrlHint')}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="rounded-xl" onClick={() => setTrackingDialogOpen(false)} disabled={savingTracking}>
                            {t('cancel')}
                        </Button>
                        <Button
                            className="rounded-xl"
                            onClick={handleSaveTracking}
                            disabled={savingTracking || !carrierNameInput.trim() || !trackingNumberInput.trim()}
                        >
                            {savingTracking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {t('shipment.save')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
