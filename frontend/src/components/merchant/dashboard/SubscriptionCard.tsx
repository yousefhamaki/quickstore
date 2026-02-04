'use client';

import { memo } from 'react';
import { useBillingOverview } from '@/lib/hooks/useBilling';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NavLink } from '@/components/NavLink';
import { CreditCard, Settings, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

const SubscriptionCard = memo(() => {
    const { data: billing } = useBillingOverview();
    const t = useTranslations('dashboard.home');

    const subscription = billing?.subscription;
    const plan = billing?.plan;
    const hasSelectedPlan = plan && plan.name !== 'No Plan';

    const getStatusBadge = () => {
        if (!subscription) return <Badge variant="secondary">No Active Plan</Badge>;

        switch (subscription.status) {
            case 'active': return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Active</Badge>;
            case 'trialing': return <Badge className="bg-blue-500 hover:bg-blue-600"><Clock className="w-3 h-3 mr-1" /> Trial</Badge>;
            case 'past_due': return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> Past Due</Badge>;
            case 'canceled': return <Badge className="bg-red-500 hover:bg-red-600"><AlertCircle className="w-3 h-3 mr-1" /> Canceled</Badge>;
            case 'inactive': return <Badge variant="secondary" className="bg-gray-400">Pending</Badge>;
            default: return <Badge variant="secondary">{subscription.status}</Badge>;
        }
    };

    return (
        <Card className="shadow-xl border-0 overflow-hidden glass">
            <CardHeader className="bg-white/50 border-b">
                <CardTitle>{t('subscriptionInfo')}</CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <span className="text-gray-500 font-medium">{t('status')}</span>
                    {getStatusBadge()}
                </div>
                {plan && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">{t('plan')}</span>
                        <span className="font-bold text-blue-600">{plan.name}</span>
                    </div>
                )}
                {subscription?.expiresAt && (
                    <div className="flex justify-between items-center">
                        <span className="text-gray-500 font-medium">{t('renews')}</span>
                        <span className="font-bold">{new Date(subscription.expiresAt).toLocaleDateString()}</span>
                    </div>
                )}

                <div className="pt-4 border-t">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-4">{t('quickLinks')}</p>
                    <div className="space-y-3">
                        <NavLink href="/merchant/billing">
                            <Button variant="outline" className="w-full justify-start rounded-xl font-medium">
                                <CreditCard className="w-4 h-4 mr-2" />
                                {hasSelectedPlan ? t('manageSubscription') : t('upgradePlan')}
                            </Button>
                        </NavLink>
                        <NavLink href="/merchant/settings">
                            <Button variant="outline" className="w-full justify-start rounded-xl font-medium">
                                <Settings className="w-4 h-4 mr-2 text-gray-400" />
                                Merchant Settings
                            </Button>
                        </NavLink>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
});

SubscriptionCard.displayName = 'SubscriptionCard';

export default SubscriptionCard;
