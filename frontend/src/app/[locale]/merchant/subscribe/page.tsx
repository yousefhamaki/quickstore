'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getPlans, subscribeToPlan, Plan } from '@/lib/api/billing';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, PlayCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';

export default function SubscribePage() {
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
                <Badge variant="secondary" className="mb-4">Billing & Pricing</Badge>
                <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">Choose your growth plan</h1>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                    Start small and scale up. No hidden fees. Cancel anytime.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {plans.map((plan) => (
                    <Card key={plan._id} className={`relative flex flex-col border-2 transition-all duration-300 hover:shadow-xl ${plan.name.includes('Pro') ? 'border-primary shadow-lg scale-105 z-10' : 'border-border'}`}>
                        {plan.name.includes('Pro') && (
                            <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                                <span className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-md">
                                    POPULAR
                                </span>
                            </div>
                        )}

                        <CardHeader>
                            <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                            <CardDescription className="h-10">{plan.type === 'free' ? 'Get started with the basics' : 'Unlock more features for your business'}</CardDescription>
                            <div className="mt-4 flex items-baseline">
                                <span className="text-4xl font-extrabold">{plan.monthlyPrice === 0 ? 'Free' : plan.monthlyPrice}</span>
                                {plan.monthlyPrice > 0 && <span className="ml-1 text-xl text-muted-foreground">EGP / mo</span>}
                            </div>
                        </CardHeader>

                        <CardContent className="flex-grow space-y-6">
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Zap className="w-4 h-4 text-amber-500" />
                                    <span>{plan.storeLimit === -1 ? 'Unlimited' : plan.storeLimit} Store{plan.storeLimit !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <PlayCircle className="w-4 h-4 text-blue-500" />
                                    <span>{plan.productLimit === -1 ? 'Unlimited' : plan.productLimit} Products per store</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <span className="text-muted-foreground">Transaction Fee:</span>
                                    <span>{plan.orderFee} EGP</span>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <ul className="space-y-2">
                                    <li className="flex items-start">
                                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                        <span className="text-sm text-gray-600">Standard Analytics</span>
                                    </li>
                                    <li className="flex items-start">
                                        <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                        <span className="text-sm text-gray-600">Email Support</span>
                                    </li>
                                    {plan.features.customDomain && (
                                        <li className="flex items-start">
                                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                            <span className="text-sm text-gray-600">Custom Domain</span>
                                        </li>
                                    )}
                                    {plan.features.dropshipping && (
                                        <li className="flex items-start">
                                            <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5" />
                                            <span className="text-sm text-gray-600">Dropshipping Support</span>
                                        </li>
                                    )}
                                </ul>
                            </div>
                        </CardContent>

                        <CardFooter>
                            <Button
                                className="w-full h-12 text-lg font-semibold"
                                variant={plan.name.includes('Pro') ? 'default' : 'outline'}
                                onClick={() => handleSubscribe(plan)}
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="animate-spin" /> : (plan.monthlyPrice === 0 ? 'Start Free Trial' : 'Subscribe Now')}
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <p className="text-center text-sm text-muted-foreground mt-8">
                Secured by Buildora on QuickStore infrastructure. 30-day money-back guarantee.
            </p>
        </div>
    );
}
