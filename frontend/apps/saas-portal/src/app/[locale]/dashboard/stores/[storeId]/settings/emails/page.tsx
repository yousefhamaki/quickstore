'use client';

import { use, useEffect, useState } from "react";
import { useStore, useUpdateStore } from "@shared/lib/hooks/useStore";
import { getEmailAccountBalance } from "@shared/services/marketingService";
import { useForm } from "react-hook-form";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Textarea } from "@shared/components/ui/textarea";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import {
    Mail,
    Save,
    Loader2,
    PackageCheck,
    Truck,
    Megaphone,
    AlertTriangle,
    Ban
} from "lucide-react";

type TemplateKey = 'orderConfirmation' | 'orderStatusChanged' | 'marketing';

const TEMPLATE_TABS: { key: TemplateKey; label: string; icon: any; tokens: string[] }[] = [
    { key: 'orderConfirmation', label: 'Order Confirmation', icon: PackageCheck, tokens: ['{{customerName}}', '{{orderNumber}}', '{{total}}', '{{storeName}}'] },
    { key: 'orderStatusChanged', label: 'Order Status Update', icon: Truck, tokens: ['{{customerName}}', '{{orderNumber}}', '{{status}}', '{{storeName}}'] },
    { key: 'marketing', label: 'Marketing', icon: Megaphone, tokens: ['{{customerName}}', '{{storeName}}'] },
];

export default function EmailSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const [balance, setBalance] = useState<number | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TemplateKey>('orderConfirmation');

    useEffect(() => {
        getEmailAccountBalance(storeId)
            .then((res) => setBalance(res.balance))
            .catch(() => setBalance(null))
            .finally(() => setBalanceLoading(false));
    }, [storeId]);

    const { register, handleSubmit, watch, setValue, formState: { isDirty } } = useForm({
        values: store ? {
            emailNotifications: {
                sendOrderConfirmation: store.settings?.emailNotifications?.sendOrderConfirmation ?? true,
                sendStatusUpdates: store.settings?.emailNotifications?.sendStatusUpdates ?? true,
                templates: {
                    orderConfirmation: {
                        subject: store.settings?.emailNotifications?.templates?.orderConfirmation?.subject || '',
                        heading: store.settings?.emailNotifications?.templates?.orderConfirmation?.heading || '',
                        body: store.settings?.emailNotifications?.templates?.orderConfirmation?.body || '',
                    },
                    orderStatusChanged: {
                        subject: store.settings?.emailNotifications?.templates?.orderStatusChanged?.subject || '',
                        heading: store.settings?.emailNotifications?.templates?.orderStatusChanged?.heading || '',
                        body: store.settings?.emailNotifications?.templates?.orderStatusChanged?.body || '',
                    },
                    marketing: {
                        subject: store.settings?.emailNotifications?.templates?.marketing?.subject || '',
                        heading: store.settings?.emailNotifications?.templates?.marketing?.heading || '',
                        body: store.settings?.emailNotifications?.templates?.marketing?.body || '',
                    },
                }
            }
        } : undefined
    });

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync({ settings: { ...store?.settings, emailNotifications: data.emailNotifications } });
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const sendOrderConfirmation = watch("emailNotifications.sendOrderConfirmation");
    const sendStatusUpdates = watch("emailNotifications.sendStatusUpdates");
    const isZeroBalance = balance !== null && balance <= 0;
    const isLowBalance = balance !== null && balance > 0 && balance < 10;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
                <p className="text-muted-foreground">Control which automatic emails your customers receive, and customize what they say.</p>
            </div>

            {/* Balance banner */}
            {!balanceLoading && isZeroBalance && (
                <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
                    <Ban className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-destructive">No email credits remaining</p>
                        <p className="text-sm text-muted-foreground">
                            Your store has 0 email credits, so order confirmation and status update emails will NOT be sent to customers right now —
                            we'll email you instead so you know when a customer email is skipped. Top up or upgrade your plan to resume sending.
                        </p>
                    </div>
                </div>
            )}
            {!balanceLoading && isLowBalance && (
                <div className="rounded-2xl border-2 border-amber-400/40 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                    <div>
                        <p className="font-semibold text-amber-700 dark:text-amber-400">Only {balance} email credit{balance === 1 ? '' : 's'} left</p>
                        <p className="text-sm text-muted-foreground">Top up soon so your customers keep getting order emails without interruption.</p>
                    </div>
                </div>
            )}

            <form onSubmit={onSubmit} className="space-y-8">
                {/* Toggles */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" />
                            Customer Email Notifications
                        </CardTitle>
                        <CardDescription>Turn automatic customer emails on or off. These only send while your store has email credits available.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${sendOrderConfirmation ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                    <PackageCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">Order confirmation</p>
                                    <p className="text-sm text-muted-foreground">Email the customer as soon as they place an order.</p>
                                </div>
                            </div>
                            <Switch
                                checked={sendOrderConfirmation}
                                disabled={isZeroBalance}
                                onCheckedChange={(checked) => setValue("emailNotifications.sendOrderConfirmation", checked, { shouldDirty: true })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${sendStatusUpdates ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">Order status updates</p>
                                    <p className="text-sm text-muted-foreground">Email the customer whenever their order's status changes (shipped, delivered, etc.).</p>
                                </div>
                            </div>
                            <Switch
                                checked={sendStatusUpdates}
                                disabled={isZeroBalance}
                                onCheckedChange={(checked) => setValue("emailNotifications.sendStatusUpdates", checked, { shouldDirty: true })}
                            />
                        </div>
                        {isZeroBalance && (
                            <p className="text-xs text-muted-foreground italic">Toggles are disabled while you have 0 email credits — nothing can be sent until you top up.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Template editors */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-primary" />
                            Email Templates
                        </CardTitle>
                        <CardDescription>Customize the subject, heading, and message body of each email. Leave a field blank to use our default wording.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TemplateKey)}>
                            <TabsList className="mb-6 flex-wrap h-auto">
                                {TEMPLATE_TABS.map(({ key, label, icon: Icon }) => (
                                    <TabsTrigger key={key} value={key} className="gap-2">
                                        <Icon className="w-4 h-4" /> {label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            {TEMPLATE_TABS.map(({ key, tokens }) => (
                                <TabsContent key={key} value={key} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Subject line</Label>
                                        <Input
                                            {...register(`emailNotifications.templates.${key}.subject` as const)}
                                            placeholder="Leave blank to use the default subject"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Heading</Label>
                                        <Input
                                            {...register(`emailNotifications.templates.${key}.heading` as const)}
                                            placeholder="Leave blank to use the default heading"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Message body</Label>
                                        <Textarea
                                            {...register(`emailNotifications.templates.${key}.body` as const)}
                                            rows={6}
                                            placeholder="Leave blank to use the default message"
                                            className="rounded-xl border-gray-200"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Available tokens — these are replaced automatically when the email is sent: {tokens.join(', ')}
                                    </p>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>

                {/* Save Button */}
                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-end">
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                        className="rounded-full px-10 shadow-lg shadow-primary/20"
                    >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Emails Settings</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
