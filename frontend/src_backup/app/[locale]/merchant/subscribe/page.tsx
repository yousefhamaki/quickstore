'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlans, subscribeToPlan, Plan } from '@/lib/api/billing';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, PlayCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslations, useLocale } from 'next-intl';

export default function SubscribePage() {
    const t = useTranslations('merchant.plans');
    const locale = useLocale();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const data = await getPlans();
                setPlans(data);
            } catch (err) {
                console.error('Failed to fetch plans', err);
                toast.error('Failed to load subscription plans');
            } finally {
                setFetching(false);
            }
        };
        fetchPlans();
    }, []);

    const handleSubscribe = async (plan: Plan) => {
        setLoading(true);
        try {
            await subscribeToPlan(plan._id);
            toast.success(`Successfully subscribed to ${plan.name}!`);
            router.push('/merchant'); // Go to dashboard
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Subscription failed');
        } finally {
            setLoading(false);
        }
    };

    if (fetching) return (
        <div className="flex justify-center items-center min-h-screen">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
            <div className="text-center space-y-4">
                <Badge variant="secondary" className="mb-4">{t('badge')}</Badge>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">{t('title')}</h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                    {t('subtitle')}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {plans.map((plan) => {
                    const isPopular = plan.name === 'Pro';
                    const localizedName = locale === 'ar' ? (plan as any).name_ar || plan.name : (plan as any).name_en || plan.name;

                    return (
                        <Card key={plan._id} className={`relative flex flex-col border-2 transition-all duration-300 hover:shadow-xl ${isPopular ? 'border-primary shadow-lg scale-105 z-10' : 'border-border'}`}>
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
                                <div className="mt-4 flex items-baseline">
                                    <span className="text-4xl font-extrabold">{plan.monthlyPrice === 0 ? (locale === 'ar' ? 'مجاني' : 'Free') : plan.monthlyPrice}</span>
                                    {plan.monthlyPrice > 0 && <span className="ml-1 text-xl text-muted-foreground">{t('currency')}</span>}
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
                                        <li className="flex items-start">
                                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                            <span className="text-sm text-gray-600">{locale === 'ar' ? 'تحليلات قياسية' : 'Standard Analytics'}</span>
                                        </li>
                                        <li className="flex items-start">
                                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                            <span className="text-sm text-gray-600">{locale === 'ar' ? 'دعم البريد الإلكتروني' : 'Email Support'}</span>
                                        </li>
                                        {plan.features.customDomain && (
                                            <li className="flex items-start">
                                                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                                <span className="text-sm text-gray-600">{t('customDomain')}</span>
                                            </li>
                                        )}
                                        {plan.features.dropshipping && (
                                            <li className="flex items-start">
                                                <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                                <span className="text-sm text-gray-600">{t('dropshipping')}</span>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    className="w-full h-12 text-lg font-semibold"
                                    variant={isPopular ? 'default' : 'outline'}
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : (plan.monthlyPrice === 0 ? t('switchToFree') : t('upgradeNow'))}
                                </Button>
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
        </div>
    );
}
