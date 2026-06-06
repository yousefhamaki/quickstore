'use client';

import { usePlans, useSubscribe, useBillingOverview } from "@shared/lib/hooks/useBilling";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Check, Zap, Rocket, Star, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
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

    useEffect(() => {
        const autoSubscribeId = searchParams.get('autoSubscribe');
        if (autoSubscribeId && plans && billing && !subscribeMutation.isPending) {
            const currentPlanName = billing?.plan?.name;
            const targetPlan = plans.find((p) => p._id === autoSubscribeId);
            
            if (targetPlan && currentPlanName !== targetPlan.name) {
                // If it's a paid plan, check balance first to avoid errors
                const isInsufficient = targetPlan.type === 'paid' && billing.wallet.balance < targetPlan.monthlyPrice;
                if (!isInsufficient) {
                    setPendingCheckoutPlanId(autoSubscribeId);
                }
            }
            // Clear parameter so it doesn't repeatedly try
            router.replace('/merchant/plans');
        }
    }, [searchParams, plans, billing, subscribeMutation, router]);

    if (plansLoading || billingLoading) return <PlansSkeleton />;

    const currentPlanName = billing?.plan?.name;
    const currentPlanObj = plans?.find(p => p.name === currentPlanName);

    // Smart Filtering: Display only the current plan OR plans with a strictly higher monthlyPrice
    const filteredPlans = plans?.filter(plan => {
        if (plan.name === currentPlanName) return true;
        if (!currentPlanObj) return true; // Safety fallback
        return plan.monthlyPrice > currentPlanObj.monthlyPrice;
    });

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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredPlans?.map((plan) => {
                    const isCurrent = currentPlanName === plan.name;
                    const isPopular = plan.name === 'Pro';
                    const isInsufficient = plan.type === 'paid' && billing && billing.wallet.balance < plan.monthlyPrice;

                    // Support localized names/descriptions if available in the database
                    const localizedName = locale === 'ar' ? (plan as any).name_ar || plan.name : (plan as any).name_en || plan.name;

                    return (
                        <Card
                            key={plan._id}
                            className={cn(
                                "rounded-[48px] border-2 shadow-sm flex flex-col relative transition-all duration-500 hover:shadow-2xl hover:-translate-y-2",
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
                                <div className="flex items-baseline gap-1 mt-4">
                                    <span className="text-5xl font-black">{plan.monthlyPrice}</span>
                                    <span className="text-muted-foreground font-bold tracking-tight">{t('currency')}</span>
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
                                    <FeatureItem icon={plan.features.customDomain ? Check : Star} label={t('customDomain')} enabled={plan.features.customDomain} />
                                    <FeatureItem icon={plan.features.dropshipping ? Check : Rocket} label={t('dropshipping')} enabled={plan.features.dropshipping} />
                                </div>
                            </CardContent>

                            <CardFooter className="p-10 pt-0">
                                <div className="w-full space-y-3">
                                    <Button
                                        className={cn(
                                            "w-full h-16 rounded-[24px] font-black text-sm uppercase tracking-widest transition-all shadow-xl",
                                            isCurrent ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20" : ""
                                        )}
                                        variant={isCurrent ? "default" : (isPopular ? "default" : "outline")}
                                        onClick={() => !isCurrent && setPendingCheckoutPlanId(plan._id)}
                                        disabled={subscribeMutation.isPending || isCurrent}
                                    >
                                        {subscribeMutation.isPending && subscribeMutation.variables === plan._id ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            isCurrent ? t('currentTier') : (plan.type === 'free' ? t('switchToFree') : t('upgradeNow'))
                                        )}
                                    </Button>
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black">{t('confirmUpgradeTitle', { fallback: 'Confirm Subscription Upgrade' })}</DialogTitle>
                        <DialogDescription className="pt-4 text-base">
                            {(() => {
                                const targetPlan = plans?.find(p => p._id === pendingCheckoutPlanId);
                                if (!targetPlan) return null;
                                const localizedPlanName = locale === 'ar' ? (targetPlan as any).name_ar || targetPlan.name : (targetPlan as any).name_en || targetPlan.name;
                                return (
                                    <span className="block bg-amber-50 border-2 border-amber-200 text-amber-900 p-6 rounded-2xl font-medium mt-2 leading-relaxed">
                                        {t.rich('confirmUpgradeWarning', {
                                            current: currentPlanName || '',
                                            new: localizedPlanName,
                                            price: targetPlan.monthlyPrice,
                                            currency: billing?.wallet?.currency || 'EGP',
                                            highlight: (chunks) => <strong className="font-black text-amber-950 px-1">{chunks}</strong>
                                        })}
                                    </span>
                                );
                            })()}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6 flex gap-3 sm:justify-end">
                        <Button variant="outline" className="rounded-xl font-bold h-11 px-6 border-2" onClick={() => setPendingCheckoutPlanId(null)}>
                            {t('cancel', { fallback: 'Cancel' })}
                        </Button>
                        <Button 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black h-11 px-6 shadow-xl shadow-emerald-500/20"
                            onClick={() => {
                                if (pendingCheckoutPlanId) {
                                    subscribeMutation.mutate(pendingCheckoutPlanId);
                                    setPendingCheckoutPlanId(null);
                                }
                            }}
                            disabled={subscribeMutation.isPending}
                        >
                            {subscribeMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                            {t('confirmAndPay', { fallback: 'Confirm & Pay' })}
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
