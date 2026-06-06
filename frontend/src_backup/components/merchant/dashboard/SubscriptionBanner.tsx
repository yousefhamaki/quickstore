'use client';

import { memo } from 'react';
import { useBillingOverview, usePayFromWallet } from '@/lib/hooks/useBilling';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

const SubscriptionBanner = memo(() => {
    const { data: billing } = useBillingOverview();
    const payFromWallet = usePayFromWallet();
    const tBanner = useTranslations('dashboard.banner');

    const subscription = billing?.subscription;
    const plan = billing?.plan;
    const wallet = billing?.wallet;

    const isPlanActive = subscription?.status === 'active' || subscription?.status === 'trialing';
    const hasSelectedPlan = plan && plan.name !== 'No Plan';
    const planPrice = plan?.monthlyPrice || 0;
    const canPayWithWallet = hasSelectedPlan && wallet && wallet.balance >= planPrice && planPrice > 0;

    const handleWalletPayment = async () => {
        try {
            await payFromWallet.mutateAsync();
        } catch (err) {
            // Error handled by hook
        }
    };

    if (isPlanActive) return null;

    return (
        <Card className="mb-10 border-0 shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white relative overflow-hidden">
            <CardContent className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="z-10">
                    <h2 className="text-2xl font-bold mb-2">
                        {subscription?.status === 'inactive' && hasSelectedPlan ? tBanner('pending') : tBanner('unlock')}
                    </h2>
                    <p className="text-blue-100 max-w-lg">
                        {subscription?.status === 'inactive' && hasSelectedPlan
                            ? tBanner('pendingSubtitle', { planName: plan.name })
                            : tBanner('upgradeSubtitle')}
                    </p>
                </div>
                <div className="z-10 flex gap-4">
                    {subscription?.status === 'inactive' && canPayWithWallet ? (
                        <Button
                            onClick={handleWalletPayment}
                            disabled={payFromWallet.isPending}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 h-12 rounded-full border-none shadow-lg"
                        >
                            {payFromWallet.isPending ? 'Processing...' : 'Pay with Wallet'}
                        </Button>
                    ) : null}
                    <Link href={subscription?.status === 'inactive' ? "/merchant/billing" : "/merchant/subscribe"}>
                        <Button className="bg-white text-blue-600 hover:bg-blue-50 font-bold px-8 h-12 rounded-full border-none">
                            {subscription?.status === 'inactive' && hasSelectedPlan ? tBanner('completePayment') : tBanner('choosePlan')}
                        </Button>
                    </Link>
                </div>
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute -left-10 -top-10 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
            </CardContent>
        </Card>
    );
});

SubscriptionBanner.displayName = 'SubscriptionBanner';

export default SubscriptionBanner;
