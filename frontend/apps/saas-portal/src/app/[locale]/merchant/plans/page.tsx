'use client';

import { usePlans, useSubscribe, useBillingOverview } from "@shared/lib/hooks/useBilling";
import { getSubscriptionPreview } from "@shared/lib/api/billing";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Check, Zap, Rocket, Star, ShieldCheck, Loader2, AlertCircle, X } from "lucide-react";
import { cn } from "@shared/lib/utils";
import { Skeleton } from "@shared/components/ui/skeleton";
import { Badge } from "@shared/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@shared/components/ui/dialog";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PlansPage() {
    const t = useTranslations('merchant.plans');
    const locale = useLocale();
    const { data: plans, isLoading: plansLoading } = usePlans();
    const { data: billing, isLoading: billingLoading } = useBillingOverview();
    const subscribeMutation = useSubscribe();
    const searchParams = useSearchParams();
    const router = useRouter();
    const [pendingCheckoutPlanId, setPendingCheckoutPlanId] = useState<string | null>(null);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const [previewData, setPreviewData] = useState<any>(null);
    const [previewLoading, setPreviewLoading] = useState<boolean>(false);

    useEffect(() => {
        if (pendingCheckoutPlanId) {
            setPreviewLoading(true);
            setPreviewData(null);
            getSubscriptionPreview(pendingCheckoutPlanId, billingCycle)
                .then((data) => {
                    setPreviewData(data);
                })
                .catch((err) => {
                    console.error(err);
                })
                .finally(() => {
                    setPreviewLoading(false);
                });
        } else {
            setPreviewData(null);
        }
    }, [pendingCheckoutPlanId, billingCycle]);

    useEffect(() => {
        const autoSubscribeId = searchParams.get('autoSubscribe');
        if (autoSubscribeId && plans && billing && !subscribeMutation.isPending) {
            const currentPlanName = billing?.plan?.name;
            const targetPlan = plans.find((p) => p._id === autoSubscribeId);
            
            if (targetPlan && currentPlanName !== targetPlan.name) {
                // If it's a paid plan, check balance first to avoid errors
                const targetPrice = billingCycle === 'yearly' ? targetPlan.monthlyPrice * 12 * 0.8 : targetPlan.monthlyPrice;
                const isInsufficient = targetPlan.type === 'paid' && billing.wallet.balance < targetPrice;
                if (!isInsufficient) {
                    setPendingCheckoutPlanId(autoSubscribeId);
                }
            }
            // Clear parameter so it doesn't repeatedly try
            router.replace('/merchant/plans');
        }
    }, [searchParams, plans, billing, subscribeMutation, router, billingCycle]);

    if (plansLoading || billingLoading) return <PlansSkeleton />;

    const currentPlanName = billing?.plan?.name;
    const currentBillingCycle = billing?.subscription?.billingCycle || 'monthly';
    const currentPlanObj = plans?.find(p => p.name === currentPlanName);
    const localizedCurrentPlanName = billing?.plan
        ? locale === 'ar'
            ? billing.plan.name_ar || billing.plan.name
            : billing.plan.name_en || billing.plan.name
        : '';

    // List all plans dynamically to support both upgrade and downgrade actions
    const filteredPlans = plans;

    return (
        <div className="container mx-auto p-6 max-w-7xl space-y-16 pb-20">
            <div className="text-center space-y-6 max-w-3xl mx-auto">
                <Badge variant="outline" className="rounded-full px-6 py-1 font-black uppercase text-[10px] tracking-widest border-2 border-primary/20 text-primary">
                    {t('badge')}
                </Badge>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-tight">
                    {t.rich('title', {
                        br: () => <br />,
                        span: (chunks) => <span className="text-primary italic">{chunks}</span>
                    })}
                </h1>
                <p className="text-xl text-muted-foreground font-medium">
                    {t('subtitle')}
                </p>

                {/* Billing Cycle Toggle */}
                <div className="flex justify-center items-center mt-6">
                    <div className="relative flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200 shadow-inner">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative z-10 px-8 py-3 text-sm font-black rounded-xl transition duration-300 ${
                                billingCycle === 'monthly'
                                    ? 'bg-white text-gray-900 shadow-md scale-105'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('monthly')}
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-8 py-3 text-sm font-black rounded-xl transition duration-300 flex items-center gap-2 ${
                                billingCycle === 'yearly'
                                    ? 'bg-white text-gray-900 shadow-md scale-105'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('yearly')}
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-emerald-500 text-white ${billingCycle === 'yearly' ? 'animate-bounce' : ''}`}>
                                {t('savePercent', { percent: 20 })}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredPlans?.map((plan) => {
                    const isFree = plan.type === 'free';
                    const isPopular = plan.name === 'Pro';

                    const monthlyPriceCalculated = isFree ? 0 : (billingCycle === 'yearly' ? plan.monthlyPrice * 0.8 : plan.monthlyPrice);
                    const yearlyPriceCalculated = isFree ? 0 : plan.monthlyPrice * 12 * 0.8;
                    const priceLabel = isFree 
                        ? '0'
                        : (billingCycle === 'yearly' ? yearlyPriceCalculated.toFixed(0) : plan.monthlyPrice);
                    const periodLabel = isFree 
                        ? '' 
                        : (billingCycle === 'yearly' ? t('yearlyPeriod') : t('monthlyPeriod'));

                    const isCurrent = plan.name === currentPlanName && (isFree || currentBillingCycle === billingCycle);
                    const targetPrice = billingCycle === 'yearly' ? plan.monthlyPrice * 12 * 0.8 : plan.monthlyPrice;
                    const isInsufficient = plan.type === 'paid' && billing && billing.wallet.balance < targetPrice;

                    // Support localized names/descriptions if available in the database
                    const localizedName = locale === 'ar' ? (plan as any).name_ar || plan.name : (plan as any).name_en || plan.name;

                    let actionText = '';
                    if (isCurrent) {
                        actionText = t('currentTier');
                    } else if (isFree) {
                        actionText = t('switchToFree');
                    } else if (!currentPlanObj) {
                        actionText = t('upgradeNow');
                    } else {
                        const currentPrice = currentPlanObj.monthlyPrice * (currentBillingCycle === 'yearly' ? 12 * 0.8 : 1);
                        if (targetPrice > currentPrice) {
                            actionText = t('upgradeNow');
                        } else {
                            actionText = t('downgradeNow');
                        }
                    }

                    return (
                        <Card
                            key={plan._id}
                            className={cn(
                                "rounded-[48px] border-2 shadow-sm flex flex-col relative transition duration-500 hover:shadow-2xl hover:-translate-y-2",
                                isPopular ? "border-primary scale-105 z-10 bg-primary/[0.01]" : "hover:border-primary/20",
                                isCurrent && "border-emerald-500/50 bg-emerald-500/[0.01]"
                            )}
                        >
                            {isPopular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black uppercase tracking-widest px-6 py-1.5 rounded-full shadow-lg">
                                    {t('bestValue')}
                                </div>
                            )}

                            <CardHeader className="p-10 pb-4">
                                <div className="p-4 bg-muted rounded-[24px] w-fit mb-6">
                                    {getPlanIcon(plan.name)}
                                </div>
                                <CardTitle className="text-3xl font-black tracking-tight">{localizedName}</CardTitle>
                                <div className="flex flex-col mt-4">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-5xl font-black">{priceLabel}</span>
                                        {plan.monthlyPrice > 0 && <span className="text-muted-foreground font-bold tracking-tight"> {periodLabel}</span>}
                                    </div>
                                    {billingCycle === 'yearly' && plan.monthlyPrice > 0 && (
                                        <span className="text-xs text-emerald-600 font-bold mt-1">
                                            {locale === 'ar' 
                                                ? `(أي ما يعادل ${monthlyPriceCalculated.toFixed(0)} ج.م/شهرياً)`
                                                : `(equiv. ${monthlyPriceCalculated.toFixed(0)} EGP/mo)`}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-10 pt-4 flex-1 space-y-6">
                                <div className="space-y-4">
                                    <FeatureItem
                                        icon={Check}
                                        label={plan.storeLimit === -1 ? t('unlimitedManagedStores') : t('managedStores', { count: plan.storeLimit })}
                                    />
                                    <FeatureItem
                                        icon={Check}
                                        label={plan.productLimit === -1 ? t('unlimitedGlobalProducts') : t('globalProducts', { count: plan.productLimit })}
                                    />
                                    <FeatureItem icon={Zap} label={t('orderFee', { amount: plan.orderFee.toFixed(2) })} />
                                    <FeatureItem icon={ShieldCheck} label={t('secureWallet')} />
                                    
                                    {/* Dynamic features array from database */}
                                    {(locale === 'ar' ? plan.features_ar : plan.features_en)?.map((feature, idx) => (
                                        <FeatureItem key={idx} icon={Check} label={feature} />
                                    ))}

                                    {/* Email Campaigns Quota */}
                                    <FeatureItem 
                                        icon={(plan.emailLimit || 0) === 0 ? X : Check} 
                                        label={
                                            (plan.emailLimit || 0) === 0 
                                                ? t('emailQuotaFree')
                                                : t('emailQuotaPaid', { count: plan.emailLimit || 0 })
                                        }
                                        enabled={(plan.emailLimit || 0) > 0}
                                    />

                                    {/* Advanced Funnels (Upsell, Cross-sell, Down-sell) Gate */}
                                    <FeatureItem
                                        icon={(plan.features as any)?.allowUCD ? Check : X}
                                        label={(plan.features as any)?.allowUCD
                                            ? "Advanced Funnels (Upsell, Cross-sell, Down-sell)"
                                            : "Advanced Funnels (Upgrade to Unlock)"
                                        }
                                        enabled={(plan.features as any)?.allowUCD}
                                    />

                                    {/* WhatsApp Notifications Quota */}
                                    <FeatureItem
                                        icon={(plan.features as any)?.allowWhatsApp ? Check : X}
                                        label={
                                            (plan.features as any)?.allowWhatsApp
                                                ? t('whatsappQuotaPaid', { count: (plan as any).whatsappLimit || 0 })
                                                : t('whatsappQuotaFree')
                                        }
                                        enabled={!!(plan.features as any)?.allowWhatsApp}
                                    />
                                </div>
                            </CardContent>

                            <CardFooter className="p-10 pt-0">
                                <div className="w-full space-y-3">
                                    {(() => {
                                        const isMutatingThisPlan = subscribeMutation.isPending && (
                                            typeof subscribeMutation.variables === 'string'
                                                ? subscribeMutation.variables === plan._id
                                                : subscribeMutation.variables?.planId === plan._id
                                        );
                                        return (
                                            <Button
                                                className={cn(
                                                    "w-full h-16 rounded-[24px] font-black text-sm uppercase tracking-widest transition shadow-xl",
                                                    isCurrent ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : ""
                                                )}
                                                variant={isCurrent ? "default" : (isPopular ? "default" : "outline")}
                                                onClick={() => !isCurrent && setPendingCheckoutPlanId(plan._id)}
                                                disabled={subscribeMutation.isPending || isCurrent}
                                            >
                                                {isMutatingThisPlan ? (
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    actionText
                                                )}
                                            </Button>
                                        );
                                    })()}
                                    {isInsufficient && !isCurrent && (
                                        <div className="flex items-center gap-2 text-amber-600 font-bold text-[10px] uppercase tracking-widest px-2">
                                            <AlertCircle className="w-3 h-3" />
                                            {t('insufficientBalance')}
                                        </div>
                                    )}
                                </div>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            <div className="bg-primary/5 p-16 rounded-[64px] border-2 border-dashed border-primary/20 flex flex-col md:flex-row items-center justify-between gap-12 max-w-5xl mx-auto shadow-inner">
                <div className="space-y-4 max-w-md">
                    <h3 className="text-3xl font-black tracking-tight">{t('enterpriseTitle')}</h3>
                    <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                        {t('enterpriseSubtitle')}
                    </p>
                </div>
                <Button variant="default" className="h-16 px-12 rounded-[24px] font-black uppercase tracking-widest shadow-2xl transition-transform hover:scale-105">
                    {t('talkToSales')}
                </Button>
            </div>

            {/* Checkout Confirmation Modal */}
            <Dialog open={!!pendingCheckoutPlanId} onOpenChange={(open) => !open && setPendingCheckoutPlanId(null)}>
                <DialogContent className="max-w-lg rounded-[32px] p-8">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight">
                            {previewData?.isUpgrade ? "Confirm Plan Upgrade" : previewData?.isDowngrade ? "Confirm Plan Downgrade" : "Confirm Subscription"}
                        </DialogTitle>
                        <DialogDescription className="pt-4 text-base">
                            {previewLoading && (
                                <div className="py-12 flex flex-col items-center justify-center">
                                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                    <p className="text-center font-bold text-sm text-muted-foreground mt-4">
                                        Calculating proration invoice...
                                    </p>
                                </div>
                            )}

                            {!previewLoading && previewData?.isUpgrade && (
                                <div className="space-y-6">
                                    <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Upgrade Summary</p>
                                        <h4 className="text-xl font-black text-gray-900">
                                            {locale === 'ar' ? "الترقية إلى الخطة الجديدة" : `Upgrade to ${plans?.find(p => p._id === pendingCheckoutPlanId)?.name}`}
                                        </h4>
                                        <p className="text-xs text-muted-foreground font-semibold mt-1">
                                            {previewData.isCycleChange
                                                ? <>Your billing cycle is changing, so your renewal date resets to: <strong className="text-gray-800">{new Date(previewData.proration.currentExpiryDate).toLocaleDateString()}</strong></>
                                                : <>Your renewal date remains unchanged: <strong className="text-gray-800">{new Date(previewData.proration.currentExpiryDate).toLocaleDateString()}</strong></>
                                            }
                                        </p>
                                    </div>
                                    <div className="space-y-3 font-medium text-sm">
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">Original Plan Price</span>
                                            <span className="font-bold text-gray-900">{previewData.proration.currentPlanPrice.toFixed(2)} EGP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">New Plan Price</span>
                                            <span className="font-bold text-gray-900">{previewData.proration.newPlanPrice.toFixed(2)} EGP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">Billing Cycle Allocation</span>
                                            <span className="font-bold text-gray-900">
                                                {previewData.proration.usedDays} days used / {previewData.proration.remainingDays} days remaining
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">Consumed Value</span>
                                            <span className="font-bold text-rose-600">+{previewData.proration.currentPlanUsage.toFixed(2)} EGP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">Unused Credit Applied</span>
                                            <span className="font-bold text-emerald-600">-{previewData.proration.unusedCredit.toFixed(2)} EGP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">Remaining New Plan Cost</span>
                                            <span className="font-bold text-gray-900">+{previewData.proration.remainingNewPlanCost.toFixed(2)} EGP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-4 border-t border-dashed border-gray-200 mt-4">
                                            <span className="text-base font-black text-gray-900">Due Today</span>
                                            <span className="text-2xl font-black text-primary">{previewData.proration.amountToPay.toFixed(2)} EGP</span>
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground font-bold bg-muted p-4 rounded-xl leading-relaxed border">
                                        * You will be billed the full price of <strong className="text-gray-900">{previewData.proration.nextRenewalPrice.toFixed(0)} EGP</strong> on <strong className="text-gray-900">{new Date(previewData.proration.currentExpiryDate).toLocaleDateString()}</strong> upon subscription renewal.
                                    </div>
                                </div>
                            )}

                            {!previewLoading && previewData?.isDowngrade && (
                                <div className="space-y-6">
                                    <div className="bg-rose-50 border border-rose-200 text-rose-900 p-6 rounded-2xl">
                                        <div className="flex gap-3">
                                            <AlertCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                                            <div className="space-y-2">
                                                <p className="font-black text-rose-900 text-base">Irreversible Action Warning</p>
                                                <p className="text-xs text-rose-800 font-bold leading-relaxed">
                                                    You are about to downgrade your subscription.
                                                    Your current subscription benefits will be removed immediately.
                                                    Any unused value remaining in your current subscription will be forfeited.
                                                    {previewData.isCycleChange
                                                        ? " Since you're also changing your billing cycle, your renewal date will be reset to a new cycle starting today."
                                                        : " Your subscription renewal date will remain unchanged."}
                                                    This action cannot be undone.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3 font-medium text-sm">
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">Cost Due Today</span>
                                            <span className="font-black text-emerald-600">0.00 EGP</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">Renewal Date</span>
                                            <span className="font-bold text-gray-900">{new Date(previewData.currentExpiryDate).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center py-1.5 border-b border-gray-100">
                                            <span className="text-muted-foreground">Future Renewal Price</span>
                                            <span className="font-bold text-gray-900">{previewData.nextRenewalPrice.toFixed(0)} EGP</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {!previewLoading && !previewData && !pendingCheckoutPlanId && (
                                <div className="py-6 text-center text-sm font-semibold text-muted-foreground">
                                    No details available.
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-8 flex gap-3 sm:justify-end">
                        <Button variant="outline" className="rounded-xl font-bold h-11 px-6 border-2" onClick={() => setPendingCheckoutPlanId(null)}>
                            {t('cancel')}
                        </Button>
                        <Button 
                            className={cn(
                                "text-white rounded-xl font-black h-11 px-6 shadow-xl",
                                previewData?.isDowngrade ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
                            )}
                            onClick={() => {
                                if (pendingCheckoutPlanId) {
                                    subscribeMutation.mutate({ 
                                        planId: pendingCheckoutPlanId, 
                                        billingCycle,
                                        confirmDowngrade: previewData?.isDowngrade ? true : undefined
                                    });
                                    setPendingCheckoutPlanId(null);
                                }
                             }}
                             disabled={subscribeMutation.isPending || previewLoading}
                        >
                            {subscribeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                            {previewData?.isDowngrade ? "Confirm Downgrade" : t('confirmAndPay')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function FeatureItem({ icon: Icon, label, enabled = true }: { icon: any, label: string, enabled?: boolean }) {
    return (
        <div className={cn("flex items-center gap-4", !enabled && "opacity-20")}>
            <div className={cn("p-1.5 rounded-xl", enabled ? "text-primary bg-primary/5" : "text-muted-foreground bg-muted")}>
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight">{label}</span>
        </div>
    );
}

function getPlanIcon(name: string) {
    switch (name) {
        case 'Free': return <Zap className="w-7 h-7 text-amber-500 fill-amber-500" />;
        case 'Basic': return <Star className="w-7 h-7 text-blue-500 fill-blue-500" />;
        case 'Pro': return <Rocket className="w-7 h-7 text-primary fill-primary" />;
        case 'Enterprise': return <ShieldCheck className="w-7 h-7 text-emerald-500 fill-emerald-500" />;
        default: return <Zap className="w-7 h-7" />;
    }
}

function PlansSkeleton() {
    return (
        <div className="container mx-auto p-6 space-y-16">
            <div className="space-y-4 text-center">
                <Skeleton className="h-4 w-32 mx-auto" /><Skeleton className="h-16 w-3/4 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[600px] rounded-[48px]" />)}
            </div>
        </div>
    );
}
