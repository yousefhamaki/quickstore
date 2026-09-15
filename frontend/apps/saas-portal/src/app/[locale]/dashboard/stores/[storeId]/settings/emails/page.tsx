'use client';

import { use, useEffect, useState } from "react";
import { toast } from "sonner";
import { useStore, useUpdateStore } from "@shared/lib/hooks/useStore";
import { getEmailAccountBalance } from "@shared/services/marketingService";
import { testEmailSender } from "@shared/lib/api/stores";
import { useForm, Controller } from "react-hook-form";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { PasswordInput } from "@shared/components/ui/password-input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@shared/components/ui/tabs";
import { EmailBlockEditor } from "@shared/components/merchant/EmailBlockEditor";
import { normalizeEmailTemplate } from "@shared/lib/emailBlockRenderer";
import {
    Mail,
    Save,
    Loader2,
    PackageCheck,
    Truck,
    Megaphone,
    AlertTriangle,
    Ban,
    Send,
    CheckCircle2,
    Cloud
} from "lucide-react";

type TemplateKey = 'orderConfirmation' | 'orderStatusChanged' | 'marketing';

const TEMPLATE_TABS: { key: TemplateKey; label: string; icon: any }[] = [
    { key: 'orderConfirmation', label: 'Order Confirmation', icon: PackageCheck },
    { key: 'orderStatusChanged', label: 'Order Status Update', icon: Truck },
    { key: 'marketing', label: 'Marketing', icon: Megaphone },
];

export default function EmailSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const [balance, setBalance] = useState<number | null>(null);
    const [balanceLoading, setBalanceLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TemplateKey>('orderConfirmation');
    const [testing, setTesting] = useState(false);
    const [testedOk, setTestedOk] = useState(false);

    useEffect(() => {
        getEmailAccountBalance(storeId)
            .then((res) => setBalance(res.balance))
            .catch(() => setBalance(null))
            .finally(() => setBalanceLoading(false));
    }, [storeId]);

    const { register, control, handleSubmit, watch, setValue, getValues, formState: { isDirty } } = useForm({
        values: store ? {
            emailNotifications: {
                sendOrderConfirmation: store.settings?.emailNotifications?.sendOrderConfirmation ?? true,
                sendStatusUpdates: store.settings?.emailNotifications?.sendStatusUpdates ?? true,
                templates: {
                    orderConfirmation: {
                        subject: store.settings?.emailNotifications?.templates?.orderConfirmation?.subject || '',
                        blocks: normalizeEmailTemplate(store.settings?.emailNotifications?.templates?.orderConfirmation).blocks,
                    },
                    orderStatusChanged: {
                        subject: store.settings?.emailNotifications?.templates?.orderStatusChanged?.subject || '',
                        blocks: normalizeEmailTemplate(store.settings?.emailNotifications?.templates?.orderStatusChanged).blocks,
                    },
                    marketing: {
                        subject: store.settings?.emailNotifications?.templates?.marketing?.subject || '',
                        blocks: normalizeEmailTemplate(store.settings?.emailNotifications?.templates?.marketing).blocks,
                    },
                }
            },
            emailSender: {
                mode: store.settings?.emailSender?.mode || 'buildora',
                fromName: store.settings?.emailSender?.fromName || '',
                fromEmail: store.settings?.emailSender?.fromEmail || '',
                smtp: {
                    host: store.settings?.emailSender?.smtp?.host || '',
                    port: store.settings?.emailSender?.smtp?.port || 587,
                    secure: store.settings?.emailSender?.smtp?.secure || false,
                    username: store.settings?.emailSender?.smtp?.username || '',
                    password: '', // never pre-filled — see PasswordInput placeholder below
                },
            }
        } : undefined
    });

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync({
            settings: {
                ...store?.settings,
                emailNotifications: data.emailNotifications,
                emailSender: data.emailSender,
            }
        });
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const sendOrderConfirmation = watch("emailNotifications.sendOrderConfirmation");
    const sendStatusUpdates = watch("emailNotifications.sendStatusUpdates");
    const senderMode = watch("emailSender.mode");
    const isZeroBalance = balance !== null && balance <= 0;
    const isLowBalance = balance !== null && balance > 0 && balance < 10;
    const hasSavedPassword = !!store?.settings?.emailSender?.smtp?.hasPassword;
    const isVerified = !!store?.settings?.emailSender?.verified;

    const handleTestConnection = async () => {
        const smtp = getValues('emailSender');
        if (!smtp.smtp.host || !smtp.smtp.port || !smtp.smtp.username || !smtp.smtp.password) {
            toast.error('Fill in host, port, username, and password to test the connection.');
            return;
        }
        setTesting(true);
        setTestedOk(false);
        try {
            const result = await testEmailSender(storeId, {
                host: smtp.smtp.host,
                port: Number(smtp.smtp.port),
                secure: !!smtp.smtp.secure,
                username: smtp.smtp.username,
                password: smtp.smtp.password,
                fromEmail: smtp.fromEmail,
                fromName: smtp.fromName,
                sendTestEmail: true,
            });
            if (result.ok) {
                toast.success('Connection successful — a test email was sent to your account. Remember to Save.');
                setTestedOk(true);
            } else {
                toast.error(result.error || 'Connection failed');
            }
        } finally {
            setTesting(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Emails</h1>
                <p className="text-muted-foreground">Design your emails with no code, choose who they're sent from, and control which ones your customers receive.</p>
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
                {/* Sender */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Send className="w-5 h-5 text-primary" />
                            Sender
                        </CardTitle>
                        <CardDescription>Send your emails from Buildora, or from your own email address (Gmail, Outlook, or any mail provider — no domain setup needed).</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setValue('emailSender.mode', 'buildora', { shouldDirty: true })}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${senderMode === 'buildora' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:bg-muted'}`}
                            >
                                <Cloud className="w-5 h-5" />
                                <span className="text-xs font-bold">Send from Buildora</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setValue('emailSender.mode', 'custom', { shouldDirty: true })}
                                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-colors ${senderMode === 'custom' ? 'border-primary bg-primary/5' : 'border-transparent bg-muted/30 hover:bg-muted'}`}
                            >
                                <Send className="w-5 h-5" />
                                <span className="text-xs font-bold">Send from my own email</span>
                            </button>
                        </div>

                        {senderMode === 'custom' && (
                            <div className="space-y-4 pt-2 border-t">
                                {isVerified && (
                                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                        <CheckCircle2 className="w-4 h-4" /> Connected and verified
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>From name</Label>
                                        <Input {...register('emailSender.fromName')} placeholder="Your Store" className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>From email</Label>
                                        <Input {...register('emailSender.fromEmail')} placeholder="you@yourdomain.com" className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>SMTP host</Label>
                                        <Input {...register('emailSender.smtp.host')} placeholder="smtp.gmail.com" className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>SMTP port</Label>
                                        <Input type="number" {...register('emailSender.smtp.port', { valueAsNumber: true })} placeholder="587" className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Username</Label>
                                        <Input {...register('emailSender.smtp.username')} placeholder="you@yourdomain.com" className="rounded-xl" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Password {hasSavedPassword && <span className="text-xs text-muted-foreground font-normal">(saved — leave blank to keep it)</span>}</Label>
                                        <PasswordInput {...register('emailSender.smtp.password')} placeholder={hasSavedPassword ? '••••••••••••' : 'App password or SMTP password'} className="rounded-xl" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <Controller
                                        control={control}
                                        name="emailSender.smtp.secure"
                                        render={({ field }) => (
                                            <div className="flex items-center gap-3">
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                                <span className="text-sm text-muted-foreground">Use SSL (usually only for port 465)</span>
                                            </div>
                                        )}
                                    />
                                    <Button type="button" variant="outline" className="rounded-xl" disabled={testing} onClick={handleTestConnection}>
                                        {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        {testedOk ? <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-600" /> : null}
                                        Test connection
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Works with Gmail (use an app password, not your normal password), Outlook, Yahoo, or any SMTP provider — not tied to any one service. If a send ever fails, we automatically fall back to Buildora's sender so your customer still gets the email.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>

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
                            Email Design
                        </CardTitle>
                        <CardDescription>Build each email's content with no code — add and arrange blocks, no HTML required.</CardDescription>
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

                            {TEMPLATE_TABS.map(({ key }) => (
                                <TabsContent key={key} value={key} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Subject line</Label>
                                        <Input
                                            {...register(`emailNotifications.templates.${key}.subject` as const)}
                                            placeholder="Leave blank to use the default subject"
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <Controller
                                        control={control}
                                        name={`emailNotifications.templates.${key}.blocks` as const}
                                        render={({ field }) => (
                                            <EmailBlockEditor value={field.value} onChange={field.onChange} storeId={storeId} />
                                        )}
                                    />
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
