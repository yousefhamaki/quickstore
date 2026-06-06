'use client';

import { usePlans, useSubscribe, useBillingOverview } from "@/lib/hooks/useBilling";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap, Rocket, Star, ShieldCheck, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTranslations, useLocale } from "next-intl";

export default function PlansPage() {
    const t = useTranslations('merchant.plans');
    const locale = useLocale();
    const { data: plans, isLoading: plansLoading } = usePlans();
    const { data: billing, isLoading: billingLoading } = useBillingOverview();
    const subscribeMutation = useSubscribe();

    if (plansLoading || billingLoading) return <PlansSkeleton />;

    const currentPlanName = billing?.plan?.name;

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
                {plans?.map((plan) => {
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
                                        onClick={() => !isCurrent && subscribeMutation.mutate(plan._id)}
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
