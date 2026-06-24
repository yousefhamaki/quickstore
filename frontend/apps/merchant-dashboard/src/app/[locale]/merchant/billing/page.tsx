'use client';

import { useBillingOverview, useRechargeWallet, useTransactions, usePayFromWallet } from "@shared/lib/hooks/useBilling";
import { useStores } from "@shared/lib/hooks/useStores";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import {
    Wallet,
    ArrowUpRight,
    Clock,
    ShieldCheck,
    AlertCircle,
    Download,
    Zap,
    ChevronLeft,
    ChevronRight,
    ArrowDownLeft,
    Mail,
    Plus,
    ShoppingBag,
    Loader2
} from "lucide-react";
import { Progress } from "@shared/components/ui/progress";
import { Badge } from "@shared/components/ui/badge";
import { Skeleton } from "@shared/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Input } from "@shared/components/ui/input";
import { format } from "date-fns";
import Link from "next/link";
import { cn } from "@shared/lib/utils";
import { ReceiptModal } from "@shared/components/merchant/ReceiptModal";
import { RechargeModal } from "@shared/components/merchant/RechargeModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { getEmailAccountBalance, buyEmailAddOn } from "@shared/services/marketingService";
import { toast } from "sonner";
import { useTranslations, useLocale } from "next-intl";

export default function MerchantBillingPage() {
    const t = useTranslations('merchant.billing');
    const tp = useTranslations('merchant.plans');
    const locale = useLocale();
    const [page, setPage] = useState(1);
    const { data: billing, isLoading: overviewLoading } = useBillingOverview();
    const { data: transactionData, isLoading: transLoading } = useTransactions(page, 5);
    const { data: stores } = useStores();

    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [emailBalance, setEmailBalance] = useState<any>(null);
    const [loadingEmail, setLoadingEmail] = useState(false);
    const [buyEmailOpen, setBuyEmailOpen] = useState(false);
    const [buyingEmail, setBuyingEmail] = useState(false);

    useEffect(() => {
        if (stores && stores.length > 0 && !selectedStoreId) {
            setSelectedStoreId(stores[0]._id);
        }
    }, [stores]);

    useEffect(() => {
        if (selectedStoreId) {
            fetchEmailBalance();
        }
    }, [selectedStoreId]);

    const fetchEmailBalance = async () => {
        try {
            setLoadingEmail(true);
            const balanceData = await getEmailAccountBalance(selectedStoreId);
            setEmailBalance(balanceData);
        } catch (error) {
            console.error("Failed to load email balance:", error);
        } finally {
            setLoadingEmail(false);
        }
    };

    const handleBuyCredits = async (emailCount: number) => {
        try {
            setBuyingEmail(true);
            const res = await buyEmailAddOn(selectedStoreId, emailCount);
            toast.success(res.message || `Successfully purchased ${emailCount} emails!`);
            setBuyEmailOpen(false);
            fetchEmailBalance();
            // Trigger quick refresh to update wallet balance on dashboard
            window.location.reload();
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || "Purchase failed");
        } finally {
            setBuyingEmail(false);
        }
    };

    const [isRechargeModalOpen, setRechargeModalOpen] = useState(false);
    const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
    const payFromWallet = usePayFromWallet();

    if (overviewLoading) return <BillingSkeleton />;

    if (!billing) return <div>Failed to load billing data</div>;

    const isBlocking = !!billing.blockingReason;

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground font-medium">{t('subtitle')}</p>
                </div>
                <div className="flex gap-3">
                    <Button asChild variant="outline" className="rounded-xl font-bold border-2 h-11">
                        <Link href="/merchant/plans">
                            <Zap className="w-4 h-4 mr-2 text-amber-500 fill-amber-500" />
                            {t('upgradePlan')}
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Critical Alerts from backend blocking reason */}
            {isBlocking && (
                <div className={cn(
                    "p-4 rounded-2xl border-2 flex items-center gap-4 animate-in fade-in slide-in-from-top-2",
                    billing.blockingReason === 'SUBSCRIPTION_EXPIRED' ? "bg-red-50 border-red-100 text-red-900" : "bg-amber-50 border-amber-100 text-amber-900"
                )}>
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="font-black text-sm uppercase tracking-widest">
                            {billing.blockingReason === 'SUBSCRIPTION_EXPIRED' ? t('blocking.expiredTitle') : t('blocking.lowBalanceTitle')}
                        </p>
                        <p className="text-sm font-medium opacity-80">
                            {billing.blockingReason === 'SUBSCRIPTION_EXPIRED'
                                ? t('blocking.expiredSubtitle')
                                : t('blocking.lowBalanceSubtitle')}
                        </p>
                    </div>
                    <Button size="sm" className={billing.blockingReason === 'SUBSCRIPTION_EXPIRED' ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"} asChild>
                        <Link href={billing.blockingReason === 'SUBSCRIPTION_EXPIRED' ? "/merchant/plans" : "#recharge"}>{t('resolveNow')}</Link>
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                {/* Wallet Card */}
                <Card id="recharge" className="rounded-[32px] border-2 shadow-xl bg-primary text-primary-foreground overflow-hidden relative group">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-black uppercase tracking-widest opacity-70">{t('availableBalance')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-baseline gap-2">
                            <span className="text-5xl font-black">{billing.wallet.balance.toLocaleString()}</span>
                            <span className="text-xl font-bold opacity-70">{billing.wallet.currency}</span>
                        </div>

                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <Button
                                onClick={() => setRechargeModalOpen(true)}
                                className="bg-white text-primary hover:bg-white/90 rounded-xl font-black h-11 px-6 transition-all shadow-lg w-full"
                            >
                                <ArrowUpRight className="w-4 h-4 mr-2" /> {t('recharge')}
                            </Button>
                            <p className="text-[10px] items-center font-bold uppercase tracking-tighter opacity-50">{t('rechargeNote') || 'Secure recharge via localized methods'}</p>
                        </div>
                    </CardContent>
                    <Wallet className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
                </Card>

                {/* Plan Card */}
                <Card className="rounded-[32px] border-2 shadow-md flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">
                                    {t('planTitle', { name: locale === 'ar' ? (billing.plan as any).name_ar || billing.plan.name : (billing.plan as any).name_en || billing.plan.name })}
                                </CardTitle>
                                <CardDescription className="font-medium">{t('activeStatus')}</CardDescription>
                            </div>
                            <Badge className={cn(
                                "rounded-lg px-3 py-1 font-black uppercase text-[10px] tracking-widest italic border-none",
                                billing.subscription.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                            )}>
                                {billing.subscription.status}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6 mt-auto">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <span>{t('storesCapacity')}</span>
                                    <span>{billing.usage.storesUsed} / {billing.usage.storeLimit === -1 ? '∞' : billing.usage.storeLimit}</span>
                                </div>
                                <Progress value={billing.usage.storeLimit === -1 ? 100 : (billing.usage.storesUsed / billing.usage.storeLimit) * 100} className="h-2" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                    <span>{t('productsActive')}</span>
                                    <span>{billing.usage.productsUsed} / {billing.usage.productLimit === -1 ? '∞' : billing.usage.productLimit}</span>
                                </div>
                                <Progress value={billing.usage.productLimit === -1 ? 100 : (billing.usage.productsUsed / billing.usage.productLimit) * 100} className="h-2" />
                            </div>
                        </div>

                        {billing.subscription.status === 'inactive' && billing.plan.type === 'paid' && (() => {
                            const isYearly = billing.subscription.billingCycle === 'yearly';
                            const basePrice = billing.plan.monthlyPrice || 0;
                            const planPrice = isYearly ? basePrice * 12 * 0.8 : basePrice;
                            return (
                                <div className="pt-4 border-t border-dashed space-y-3">
                                    <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        <span>{locale === 'ar' ? 'تكلفة الاشتراك' : 'Subscription Cost'}</span>
                                        <span>{planPrice.toFixed(0)} {billing.wallet.currency}</span>
                                    </div>
                                    <Button
                                        onClick={async () => {
                                            try {
                                                await payFromWallet.mutateAsync();
                                            } catch (e) {}
                                        }}
                                        disabled={payFromWallet.isPending || billing.wallet.balance < planPrice}
                                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-11"
                                    >
                                        {payFromWallet.isPending 
                                            ? (locale === 'ar' ? 'جاري الدفع...' : 'Processing...') 
                                            : billing.wallet.balance < planPrice 
                                                ? (locale === 'ar' ? 'رصيد غير كافٍ' : 'Insufficient Balance')
                                                : (locale === 'ar' ? 'تفعيل الاشتراك الآن' : 'Pay & Activate Now')}
                                    </Button>
                                </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* Email Credits Card */}
                <Card className="rounded-[32px] border-2 shadow-md flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tight">{t('emailCredits')}</CardTitle>
                                <CardDescription className="font-medium">{t('emailCreditsSubtitle')}</CardDescription>
                            </div>
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                                <Mail className="w-5 h-5" />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4 flex-1 flex flex-col justify-between">
                        {stores && stores.length > 0 && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t('selectStore')}</label>
                                <select 
                                    value={selectedStoreId} 
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    className="w-full bg-background border-2 rounded-xl px-3 py-2 text-xs font-black focus:outline-none focus:border-primary"
                                >
                                    {stores.map((store: any) => (
                                        <option key={store._id} value={store._id}>
                                            {store.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {loadingEmail ? (
                            <div className="flex items-center justify-center py-6 flex-1">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            </div>
                        ) : emailBalance ? (
                            <div className="space-y-4 flex-1 flex flex-col justify-end">
                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>{t('planAllowance')}</span>
                                        <span className="font-black text-slate-800">{emailBalance.planBalance}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>{t('addOnBalance')}</span>
                                        <span className="font-black text-indigo-600">{emailBalance.purchasedBalance}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                        <span>{t('heldReserved')}</span>
                                        <span className="font-black text-amber-600">{emailBalance.reserved}</span>
                                    </div>
                                </div>
                                <div className="pt-3 border-t border-dashed flex justify-between items-baseline">
                                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('totalCredits')}</span>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-black text-slate-900">{emailBalance.balance}</span>
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase">Emails</span>
                                    </div>
                                </div>
                                <Button 
                                    onClick={() => setBuyEmailOpen(true)}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black h-11"
                                >
                                    <Plus className="w-4 h-4 mr-2" /> {t('buyEmailCredits')}
                                </Button>
                            </div>
                        ) : (
                            <div className="text-xs text-muted-foreground italic text-center py-6 flex-1 flex items-center justify-center">{t('noEmailBalance')}</div>
                        )}
                    </CardContent>
                </Card>

                {/* Renewal Info */}
                <Card className="rounded-[32px] border-2 shadow-md">
                    <CardHeader>
                        <CardTitle className="text-xl font-black tracking-tight">{t('timeline')}</CardTitle>
                        <CardDescription className="font-medium">{t('milestones')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4 p-3 bg-muted/40 rounded-2xl">
                            <div className="p-2 bg-white rounded-xl shadow-sm"><Clock className="w-4 h-4 text-primary" /></div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('nextRenewal')}</p>
                                <p className="font-bold">{format(new Date(billing.subscription.expiresAt), 'MMMM dd, yyyy')}</p>
                            </div>
                        </div>
                        <div className="space-y-3 pt-2">
                            <FeatureCheck label={t('features.dashboard')} enabled={true} />
                            <FeatureCheck label={tp('dropshipping')} enabled={billing.plan.features.dropshipping} />
                            <FeatureCheck label={tp('customDomain')} enabled={billing.plan.features.customDomain} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transaction Ledger */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-2xl font-black tracking-tight">{t('transactionHistory')}</h2>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-lg"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || transLoading}
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs font-black px-2">{page} / {transactionData?.pagination?.pages || 1}</span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 rounded-lg"
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= (transactionData?.pagination?.pages || 1) || transLoading}
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                <Card className="rounded-[40px] border-2 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/50 border-b">
                                    <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">{t('ledger.date')}</th>
                                    <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">{t('ledger.type')}</th>
                                    <th className="px-6 py-4 text-left font-black uppercase tracking-widest text-[10px] text-muted-foreground">{t('ledger.reason')}</th>
                                    <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">{t('ledger.amount')}</th>
                                    <th className="px-6 py-4 text-right font-black uppercase tracking-widest text-[10px] text-muted-foreground">{t('ledger.receipt')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {transLoading ? (
                                    [...Array(3)].map((_, i) => (
                                        <tr key={i}><td colSpan={5} className="p-8"><Skeleton className="h-8 w-full" /></td></tr>
                                    ))
                                ) : (
                                    transactionData?.transactions?.map((tx) => (
                                        <tr key={tx._id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-6 py-5 font-medium opacity-70">
                                                {format(new Date(tx.createdAt), 'MMM dd, HH:mm')}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    {tx.type === 'credit' ? (
                                                        <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg"><ArrowDownLeft className="w-4 h-4" /></div>
                                                    ) : (
                                                        <div className="p-1.5 bg-red-100 text-red-600 rounded-lg"><ArrowUpRight className="w-4 h-4" /></div>
                                                    )}
                                                    <span className="font-black uppercase text-[10px] tracking-widest">{t(`ledger.${tx.type}`)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <Badge variant="outline" className="rounded-lg font-bold border-2 px-3">
                                                    {t.has(`reasons.${tx.reason}`) ? t(`reasons.${tx.reason}`) : tx.reason.replace('_', ' ')}
                                                </Badge>
                                            </td>
                                            <td className={cn(
                                                "px-6 py-5 text-right font-black text-base",
                                                tx.type === 'credit' ? "text-emerald-600" : "text-foreground"
                                            )}>
                                                {tx.type === 'credit' ? '+' : '-'}{tx.amount.toFixed(2)} {billing.wallet.currency}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-xl hover:bg-primary hover:text-white transition-all shadow-sm"
                                                    onClick={() => setSelectedReceipt({
                                                        _id: tx.referenceId || tx._id,
                                                        amount: tx.amount,
                                                        currency: billing.wallet.currency,
                                                        type: tx.reason === 'recharge' ? 'wallet_recharge' : 'order',
                                                        issuedAt: tx.createdAt
                                                    })}
                                                >
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                                {transactionData?.transactions?.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-20 text-center text-muted-foreground italic font-medium">
                                            {t('ledger.noActivity')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {selectedReceipt && (
                <ReceiptModal
                    receipt={selectedReceipt}
                    open={!!selectedReceipt}
                    onOpenChange={(open) => !open && setSelectedReceipt(null)}
                />
            )}

            {/* Buy Email Credits Dialog */}
            <Dialog open={buyEmailOpen} onOpenChange={setBuyEmailOpen}>
                <DialogContent className="rounded-3xl max-w-lg border-2">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                            <ShoppingBag className="w-5.5 h-5.5 text-indigo-600" /> {t('buyEmailCredits')}
                        </DialogTitle>
                        <DialogDescription className="font-medium text-xs">
                            {locale === 'ar' 
                                ? "اشترِ باقات رصيد بريد إلكتروني إضافية. الرصيد الإضافي صالح لمدة عام واحد ويتم استخدامه بعد نفاد مخصص الخطة الشهري."
                                : "Purchase extra email credit bundles. Add-on credits are valid for 1 year and used after monthly allowances exhaust."}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Pricing packages cards */}
                    <div className="grid grid-cols-2 gap-4 my-6">
                        {[
                            { count: 50, price: 70, tag: locale === 'ar' ? "باقة المبتدئين" : "Starter Pack" },
                            { count: 100, price: 120, tag: locale === 'ar' ? "باقة أساسية" : "Standard Pack" },
                            { count: 250, price: 250, tag: locale === 'ar' ? "أفضل قيمة" : "Best Value" },
                            { count: 500, price: 400, tag: locale === 'ar' ? "باقة ضخمة" : "Bulk Pack" }
                        ].map((pkg) => (
                            <Card key={pkg.count} className="border-2 rounded-2xl p-4 hover:border-primary transition-all duration-300 flex flex-col justify-between items-stretch bg-muted/10 relative overflow-hidden group">
                                {pkg.count === 250 && (
                                    <span className="absolute top-0 right-0 bg-indigo-600 text-white font-black text-[7px] uppercase tracking-widest py-0.5 px-3 rounded-bl-lg">
                                        Popular
                                    </span>
                                )}
                                <div className="space-y-1 mb-4">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block">
                                        {pkg.tag}
                                    </span>
                                    <span className="text-2xl font-black tracking-tighter text-slate-800 block">
                                        {pkg.count} <span className="text-[10px] font-semibold text-muted-foreground tracking-normal uppercase">{locale === 'ar' ? "إيميل" : "Emails"}</span>
                                    </span>
                                    <span className="text-xs font-black text-indigo-600">
                                        {pkg.price} {locale === 'ar' ? "ج.م" : "EGP"}
                                    </span>
                                </div>
                                <Button 
                                    size="sm" 
                                    className="rounded-xl font-bold uppercase tracking-wider text-[8px] h-9 w-full bg-indigo-600 hover:bg-indigo-700"
                                    onClick={() => handleBuyCredits(pkg.count)}
                                    disabled={buyingEmail}
                                >
                                    {buyingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (locale === 'ar' ? "شراء" : "Purchase")}
                                </Button>
                            </Card>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => setBuyEmailOpen(false)} className="rounded-xl font-bold uppercase tracking-wider text-[9px] h-10 w-full md:w-auto">
                            {locale === 'ar' ? "إلغاء" : "Cancel"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RechargeModal 
                open={isRechargeModalOpen} 
                onOpenChange={setRechargeModalOpen} 
            />
        </div>
    );
}

function FeatureCheck({ label, enabled }: { label: string; enabled: boolean }) {
    return (
        <div className={cn("flex items-center gap-2", !enabled && "opacity-30")}>
            <ShieldCheck className={cn("w-4 h-4", enabled ? "text-emerald-500" : "text-gray-400")} />
            <span className="text-xs font-bold">{label}</span>
        </div>
    );
}

function BillingSkeleton() {
    return (
        <div className="container mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-4"><Skeleton className="h-10 w-64" /><Skeleton className="h-4 w-96" /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Skeleton className="h-64 rounded-[32px]" /><Skeleton className="h-64 rounded-[32px]" /><Skeleton className="h-64 rounded-[32px]" />
            </div>
            <Skeleton className="h-[400px] rounded-[40px]" />
        </div>
    );
}
