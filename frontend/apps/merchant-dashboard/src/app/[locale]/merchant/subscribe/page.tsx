'use client';

import React, { useState } from 'react';
import { Plan } from '@shared/lib/api/billing';
import { usePlans, useSubscribe, useBillingOverview } from '@shared/lib/hooks/useBilling';
import { Button } from '@shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@shared/components/ui/card';
import { Badge } from '@shared/components/ui/badge';
import { Check, Loader2, PlayCircle, Zap } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@shared/components/ui/dialog';

export default function SubscribePage() {
    const t = useTranslations('merchant.plans');
    const locale = useLocale();
    
    const { data: plans, isLoading: plansLoading } = usePlans();
    const { data: billing, isLoading: billingLoading } = useBillingOverview();
    const subscribeMutation = useSubscribe();

    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
    const [pendingCheckoutPlanId, setPendingCheckoutPlanId] = useState<string | null>(null);

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
                            className={`relative z-10 px-6 py-2.5 text-sm font-black rounded-xl transition-all duration-300 ${
                                billingCycle === 'monthly'
                                    ? 'bg-white text-gray-900 shadow-md scale-105'
                                    : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            {t('monthly')}
                        </button>
                        <button
                            onClick={() => setBillingCycle('yearly')}
                            className={`relative z-10 px-6 py-2.5 text-sm font-black rounded-xl transition-all duration-300 flex items-center gap-2 ${
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
                        <Card key={plan._id} className={`relative flex flex-col border-2 transition-all duration-300 hover:shadow-xl ${isPopular ? 'border-primary shadow-lg scale-105 z-10' : (isCurrent ? 'border-emerald-500 bg-emerald-500/[0.01]' : 'border-border')}`}>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">
                            {(() => {
                                const targetPlan = plans?.find(p => p._id === pendingCheckoutPlanId);
                                if (!targetPlan || !currentPlanObj) return t('confirmUpgradeTitle');
                                const currentPrice = currentPlanObj.monthlyPrice * (currentBillingCycle === 'yearly' ? 12 * 0.8 : 1);
                                const targetPrice = targetPlan.monthlyPrice * (billingCycle === 'yearly' ? 12 * 0.8 : 1);
                                return targetPrice > currentPrice ? t('confirmUpgradeTitle') : t('confirmDowngradeTitle');
                            })()}
                        </DialogTitle>
                        <DialogDescription className="pt-4 text-base">
                            {(() => {
                                const targetPlan = plans?.find(p => p._id === pendingCheckoutPlanId);
                                if (!targetPlan) return null;
                                const localizedPlanName = locale === 'ar' ? (targetPlan as any).name_ar || targetPlan.name : (targetPlan as any).name_en || targetPlan.name;
                                const targetPrice = billingCycle === 'yearly' ? targetPlan.monthlyPrice * 12 * 0.8 : targetPlan.monthlyPrice;
                                const cycleLabel = billingCycle === 'yearly' ? (locale === 'ar' ? 'السنوية' : 'yearly') : (locale === 'ar' ? 'الشهرية' : 'monthly');
                                return (
                                    <span className="block bg-amber-50 border-2 border-amber-200 text-amber-900 p-6 rounded-2xl font-medium mt-2 leading-relaxed">
                                        {locale === 'ar' ? (
                                            <>
                                                {localizedCurrentPlanName ? (
                                                    <>تحذير: أنت حالياً على الخطة <strong>{localizedCurrentPlanName}</strong>. المتابعة ستستبدل فوراً اشتراكك النشط بالخطة <strong>{localizedPlanName} ({cycleLabel})</strong> وستخصم <strong>{targetPrice.toFixed(0)} {billing?.wallet?.currency || 'ج.م'}</strong> من محفظتك.</>
                                                ) : (
                                                    <>المتابعة ستشترك بالخطة <strong>{localizedPlanName} ({cycleLabel})</strong> وستخصم <strong>{targetPrice.toFixed(0)} {billing?.wallet?.currency || 'ج.م'}</strong> من محفظتك.</>
                                                )} هل تريد المتابعة؟
                                            </>
                                        ) : (
                                            <>
                                                {localizedCurrentPlanName ? (
                                                    <>Warning: You are currently on the <strong>{localizedCurrentPlanName}</strong>. Proceeding will immediately replace your active subscription with the <strong>{localizedPlanName} ({cycleLabel})</strong> and deduct <strong>{targetPrice.toFixed(0)} {billing?.wallet?.currency || 'EGP'}</strong> from your wallet.</>
                                                ) : (
                                                    <>Proceeding will subscribe you to the <strong>{localizedPlanName} ({cycleLabel})</strong> and deduct <strong>{targetPrice.toFixed(0)} {billing?.wallet?.currency || 'EGP'}</strong> from your wallet.</>
                                                )} Do you want to proceed?
                                            </>
                                        )}
                                    </span>
                                );
                            })()}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
                        <Button variant="outline" className="rounded-xl font-bold h-11 px-6 border-2" onClick={() => setPendingCheckoutPlanId(null)}>
                            {t('cancel')}
                        </Button>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-11 px-6 shadow-xl shadow-emerald-500/20"
                            onClick={() => {
                                if (pendingCheckoutPlanId) {
                                    subscribeMutation.mutate({ planId: pendingCheckoutPlanId, billingCycle });
                                    setPendingCheckoutPlanId(null);
                                }
                            }}
                            disabled={subscribeMutation.isPending}
                        >
                            {subscribeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Check className="w-5 h-5 mr-2" />}
                            {t('confirmAndPay')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
