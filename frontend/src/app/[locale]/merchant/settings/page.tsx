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
                        customerName: data.profile.customerName,
                        billingEmail: data.profile.billingEmail,
                        taxId: data.profile.taxId || '',
                        address: {
                            line1: data.profile.address.line1,
                            line2: data.profile.address.line2 || '',
                            city: data.profile.address.city,
                            state: data.profile.address.state,
                            postalCode: data.profile.address.postalCode,
                            country: data.profile.address.country || 'Egypt',
                        }
                    });
                }
            } catch (error) {
                toast.error('Failed to load settings');
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [form]);

    const onSubmit = async (values: BillingFormValues) => {
        try {
            await updateBillingProfile(values);
            toast.success('Billing profile updated');
        } catch (error) {
            toast.error('Failed to update profile');
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8">
            <h1 className="text-3xl font-bold mb-8">Account Settings</h1>

            <Tabs defaultValue="billing" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="billing">Billing Info</TabsTrigger>
                    <TabsTrigger value="subscription">Subscription</TabsTrigger>
                    {/* Add General/Profile tabs later */}
                </TabsList>

                <TabsContent value="billing">
                    <Card>
                        <CardHeader>
                            <CardTitle>Billing Information</CardTitle>
                            <CardDescription>Address and Tax ID used for invoices.</CardDescription>
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
                                                    <FormLabel>Full Name / Company Name</FormLabel>
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
                                                    <FormLabel>Billing Email</FormLabel>
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
                                                <FormLabel>Address Line 1</FormLabel>
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
                                                    <FormLabel>City</FormLabel>
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
                                                    <FormLabel>State / Province</FormLabel>
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
                                                    <FormLabel>Postal Code</FormLabel>
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
                                                    <FormLabel>Tax ID (Optional)</FormLabel>
                                                    <FormControl><Input {...field} /></FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="subscription">
                    <Card>
                        <CardHeader>
                            <CardTitle>Current Subscription</CardTitle>
                            <CardDescription>Manage your plan and payment methods.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {overview?.subscription ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                                        <div>
                                            <p className="font-bold text-lg">{overview?.plan?.name}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {overview?.subscription?.status === 'active' ? 'Renews' : 'Expires'} on {overview?.subscription?.expiresAt ? new Date(overview.subscription.expiresAt).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                        <Button asChild variant="outline">
                                            <Link href="/merchant/plans">Manage Plan</Link>
                                        </Button>
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        <p>Status: <span className="uppercase font-bold">{overview.subscription.status}</span></p>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6">
                                    <p className="mb-4">You have no active subscription.</p>
                                    <Button asChild>
                                        <Link href="/merchant/subscribe">Subscribe Now</Link>
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
