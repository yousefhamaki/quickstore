'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getBillingOverview, updateBillingProfile } from '@/lib/api/billing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTranslations, useLocale } from 'next-intl';

const billingSchema = z.object({
    customerName: z.string().min(2, 'Name is required'),
    billingEmail: z.string().email('Invalid email address'),
    taxId: z.string(),
    address: z.object({
        line1: z.string().min(5, 'Address is required'),
        line2: z.string(),
        city: z.string().min(2, 'City is required'),
        state: z.string().min(2, 'State is required'),
        postalCode: z.string().min(3, 'Postal Code is required'),
        country: z.string(),
    }),
});

type BillingFormValues = z.infer<typeof billingSchema>;

export default function MerchantSettingsPage() {
    const t = useTranslations('merchant.settings');
    const locale = useLocale();
    const [isLoading, setIsLoading] = useState(true);
    const [overview, setOverview] = useState<any>(null);

    const form = useForm<BillingFormValues>({
        resolver: zodResolver(billingSchema),
        defaultValues: {
            customerName: '',
            billingEmail: '',
            taxId: '',
            address: {
                line1: '',
                line2: '',
                city: '',
                state: '',
                postalCode: '',
                country: 'Egypt'
            }
        }
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await getBillingOverview() as any;
                setOverview(data);
                if (data.profile) {
                    form.reset({
                        customerName: data.profile.customerName || '',
                        billingEmail: data.profile.billingEmail || '',
                        taxId: data.profile.taxId || '',
                        address: {
                            line1: data.profile.address?.line1 || '',
                            line2: data.profile.address?.line2 || '',
                            city: data.profile.address?.city || '',
                            state: data.profile.address?.state || '',
                            postalCode: data.profile.address?.postalCode || '',
                            country: data.profile.address?.country || 'Egypt',
                        }
                    });
                }
            } catch (error) {
                toast.error(t('billing.messages.loadError'));
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [form, t]);

    const onSubmit = async (values: BillingFormValues) => {
        try {
            await updateBillingProfile(values);
            toast.success(t('billing.messages.success'));
        } catch (error) {
            toast.error(t('billing.messages.error'));
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-8">{t('title')}</h1>

            <Tabs defaultValue="billing" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="billing">{t('tabs.billing')}</TabsTrigger>
                    <TabsTrigger value="subscription">{t('tabs.subscription')}</TabsTrigger>
                </TabsList>

                <TabsContent value="billing">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('billing.title')}</CardTitle>
                            <CardDescription>{t('billing.description')}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="customerName"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('billing.form.fullName')}</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="billingEmail"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('billing.form.billingEmail')}</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="address.line1"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{t('billing.form.addressLine1')}</FormLabel>
                                                <FormControl><Input {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="address.city"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('billing.form.city')}</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="address.state"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('billing.form.state')}</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="address.postalCode"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('billing.form.postalCode')}</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="taxId"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>{t('billing.form.taxId')}</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting ? t('billing.form.saving') : t('billing.form.save')}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subscription">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('subscription.title')}</CardTitle>
                            <CardDescription>{t('subscription.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {overview?.subscription ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="font-bold text-lg">
                                                {locale === 'ar' ? (overview.plan as any).name_ar || overview.plan.name : (overview.plan as any).name_en || overview.plan.name}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {overview?.subscription?.status === 'active'
                                                    ? t('subscription.renewsOn', { date: overview?.subscription?.expiresAt ? new Date(overview.subscription.expiresAt).toLocaleDateString(locale) : 'N/A' })
                                                    : t('subscription.expiresOn', { date: overview?.subscription?.expiresAt ? new Date(overview.subscription.expiresAt).toLocaleDateString(locale) : 'N/A' })
                                                }
                                            </p>
                                        </div>
                                        <Button asChild variant="outline">
                                            <Link href="/merchant/plans">{t('subscription.manage')}</Link>
                                        </Button>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        <p>{t('subscription.status')}: <span className="uppercase font-bold">{overview.subscription.status}</span></p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="mb-4">{t('subscription.noActive')}</p>
                                    <Button asChild>
                                        <Link href="/merchant/subscribe">{t('subscription.subscribeNow')}</Link>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
