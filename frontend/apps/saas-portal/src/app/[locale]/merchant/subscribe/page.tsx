'use client';

import React, { useState, useEffect } from 'react';
import { Plan, getSubscriptionPreview } from '@shared/lib/api/billing';
import { usePlans, useSubscribe, useBillingOverview } from '@shared/lib/hooks/useBilling';
import { Button } from '@shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Check, Loader2, PlayCircle, Zap, AlertCircle, ShieldCheck } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';
import { cn } from '@shared/lib/utils';

export default function SubscribePage() {
    const t = useTranslations('merchant.plans');
    const locale = useLocale();
    
    const { data: plans, isLoading: plansLoading } = usePlans();
    const { data: billing, isLoading: billingLoading } = useBillingOverview();
    const subscribeMutation = useSubscribe();

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [pendingCheckoutPlanId, setPendingCheckoutPlanId] = useState<string | null>(null);

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

    if (plansLoading || billingLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const currentPlanName = billing?.plan?.name;
    const currentBillingCycle = billing?.subscription?.billingCycle || 'monthly';
    const currentPlanObj = plans?.find(p => p.name === currentPlanName);
    const localizedCurrentPlanName = billing?.plan
        ? locale === 'ar'
            ? billing.plan.name_ar || billing.plan.name
            : billing.plan.name_en || billing.plan.name
        : '';

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
            <div className="text-center space-y-4">
                <Badge variant="secondary" className="mb-4">{t('badge')}</Badge>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{t('title')}</h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                    {t('subtitle')}
                </p>

                {/* Billing Cycle Toggle */}
                <div className="flex justify-center items-center mt-6">
                    <div className="relative flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200">
                        <button
                            onClick={() => setBillingCycle('monthly')}
                            className={`relative z-10 px-6 py-2.5 text-sm font-black rounded-xl transition duration-300 ${
                                billingCycle === 'monthly'
                                    ? 'bg-white text-gray-900 shadow-md scale-105'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('monthly')}
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-6 py-2.5 text-sm font-black rounded-xl transition duration-300 flex items-center gap-2 ${
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
                {plans?.map((plan) => {
                    const isFree = plan.type === 'free';
                    
                    // Display details
                    const isPopular = plan.name === 'Pro';
                    const localizedName = locale === 'ar' ? (plan as any).name_ar || plan.name : (plan as any).name_en || plan.name;

                    const monthlyPriceCalculated = isFree ? 0 : (billingCycle === 'yearly' ? plan.monthlyPrice * 0.8 : plan.monthlyPrice);
                    const yearlyPriceCalculated = isFree ? 0 : plan.monthlyPrice * 12 * 0.8;
                    const priceLabel = isFree 
                        ? (locale === 'ar' ? 'مجاني' : 'Free')
                        : (billingCycle === 'yearly' ? yearlyPriceCalculated.toFixed(0) : plan.monthlyPrice);
                    const periodLabel = isFree 
                        ? '' 
                        : (billingCycle === 'yearly' ? t('yearlyPeriod') : t('monthlyPeriod'));

                    // Check comparison statuses
                    const isCurrent = plan.name === currentPlanName && (isFree || currentBillingCycle === billingCycle);

                    let actionText = '';
                    if (isCurrent) {
                        actionText = t('currentTier');
                    } else if (isFree) {
                        actionText = t('switchToFree');
                    } else if (!currentPlanObj) {
                        actionText = t('upgradeNow');
                    } else {
                        const currentPrice = currentPlanObj.monthlyPrice * (currentBillingCycle === 'yearly' ? 12 * 0.8 : 1);
                        const targetPrice = plan.monthlyPrice * (billingCycle === 'yearly' ? 12 * 0.8 : 1);
                        if (targetPrice > currentPrice) {
                            actionText = t('upgradeNow');
                        } else {
                            actionText = t('downgradeNow');
                        }
                    }

                    return (
                        <Card key={plan._id} className={`relative flex flex-col border-2 transition duration-300 hover:shadow-xl ${isPopular ? 'border-primary shadow-lg scale-105 z-10' : (isCurrent ? 'border-emerald-500 bg-emerald-500/[0.01]' : 'border-border')}`}>
                            {isPopular && (
                                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                                    <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                        {t('bestValue')}
                                    </span>
                                </div>
                            )}

                            <CardHeader>
                                <CardTitle className="text-2xl font-bold">{localizedName}</CardTitle>
                                <CardDescription className="h-10">{plan.type === 'free' ? (locale === 'ar' ? 'ابدأ بالأساسيات' : 'Get started with the basics') : (locale === 'ar' ? 'افتح المزيد من الميزات لعملك' : 'Unlock more features for your business')}</CardDescription>
                                <div className="mt-4 flex flex-col items-baseline">
                                    <div className="flex items-baseline">
                                        <span className="text-4xl font-extrabold">{priceLabel}</span>
                                        {plan.monthlyPrice > 0 && <span className="ml-1 text-sm text-muted-foreground font-semibold"> {periodLabel}</span>}
                                    </div>
                                    {billingCycle === 'yearly' && !isFree && (
                                        <span className="text-xs text-emerald-600 font-bold mt-1">
                                            {locale === 'ar' 
                                                ? `(أي ما يعادل ${monthlyPriceCalculated.toFixed(0)} ج.م/شهرياً)`
                                                : `(equiv. ${monthlyPriceCalculated.toFixed(0)} EGP/mo)`}
                                        </span>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="flex-grow space-y-6">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Zap className="w-4 h-4 text-amber-500" />
                                        <span>{plan.storeLimit === -1 ? t('unlimitedManagedStores') : t('managedStores', { count: plan.storeLimit })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <PlayCircle className="w-4 h-4 text-blue-500" />
                                        <span>{plan.productLimit === -1 ? t('unlimitedGlobalProducts') : t('globalProducts', { count: plan.productLimit })}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Zap className="w-4 h-4 text-emerald-500" />
                                        <span>{t('orderFee', { amount: plan.orderFee.toFixed(2) })}</span>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <ul className="space-y-2">
                                        {(locale === 'ar' ? plan.features_ar : plan.features_en)?.map((feature, idx) => (
                                            <li key={idx} className="flex items-start">
                                                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                                <span className="text-sm text-gray-600">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </CardContent>

                            <CardFooter>
                                {(() => {
                                    const isMutatingThisPlan = subscribeMutation.isPending && (
                                        typeof subscribeMutation.variables === 'string'
                                            ? subscribeMutation.variables === plan._id
                                            : subscribeMutation.variables?.planId === plan._id
                                    );
                                    return (
                                        <Button
                                            className={`w-full h-12 text-lg font-semibold ${isCurrent ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}`}
                                            variant={isPopular ? 'default' : 'outline'}
                                            onClick={() => !isCurrent && setPendingCheckoutPlanId(plan._id)}
                                            disabled={subscribeMutation.isPending || isCurrent}
                                        >
                                            {isMutatingThisPlan ? (
                                                <Loader2 className="animate-spin" />
                                            ) : (
                                                actionText
                                            )}
                                        </Button>
                                    );
                                })()}
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
                {locale === 'ar'
                    ? 'مؤمن بواسطة Buildora على بنية بيلدورا التحتية. ضمان استرداد الأموال لمدة 30 يوماً.'
                    : 'Secured by Buildora on QuickStore infrastructure. 30-day money-back guarantee.'}
            </p>

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
