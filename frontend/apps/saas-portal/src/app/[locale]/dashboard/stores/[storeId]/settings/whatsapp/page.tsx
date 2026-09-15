'use client';

import { use, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useStore, useUpdateStore } from '@shared/lib/hooks/useStore';
import {
    connectWhatsApp,
    getWhatsAppStatus,
    disconnectWhatsApp,
    WhatsAppConnectionStatus,
} from '@shared/services/whatsappService';
import { WhatsAppCreditsPanel } from '@shared/components/merchant/WhatsAppCreditsPanel';
import { getDefaultWhatsAppTemplate } from '@shared/lib/whatsappTemplates';
import { useForm, Controller } from 'react-hook-form';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@shared/components/ui/card';
import { Button } from '@shared/components/ui/button';
import { Textarea } from '@shared/components/ui/textarea';
import { Label } from '@shared/components/ui/label';
import { Switch } from '@shared/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@shared/components/ui/tabs';
import {
    MessageCircle,
    Save,
    Loader2,
    PackageCheck,
    Truck,
    Megaphone,
    RotateCcw,
    QrCode,
    CheckCircle2,
    Smartphone,
    Unplug,
} from 'lucide-react';

type TemplateKey = 'orderConfirmation' | 'orderStatusChanged' | 'marketing';

const TEMPLATE_TABS: { key: TemplateKey; label: string; icon: any }[] = [
    { key: 'orderConfirmation', label: 'Order Confirmation', icon: PackageCheck },
    { key: 'orderStatusChanged', label: 'Order Status Update', icon: Truck },
    { key: 'marketing', label: 'Marketing', icon: Megaphone },
];

export default function WhatsAppSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);
    const router = useRouter();

    const [balance, setBalance] = useState<number | null>(null);
    const [featureIncluded, setFeatureIncluded] = useState(true); // optimistic default while loading, avoids a locked-state flash
    const [activeTab, setActiveTab] = useState<TemplateKey>('orderConfirmation');
    const [connStatus, setConnStatus] = useState<WhatsAppConnectionStatus>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const refreshStatus = async () => {
        try {
            const res = await getWhatsAppStatus(storeId);
            setConnStatus(res.status);
            setQrCode(res.qrCode);
            setPhoneNumber(res.phoneNumber);
        } catch {
            // transient — next poll will retry
        }
    };

    useEffect(() => {
        refreshStatus();
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [storeId]);

    useEffect(() => {
        if (connStatus === 'connecting') {
            if (!pollRef.current) {
                pollRef.current = setInterval(refreshStatus, 2000);
            }
        } else if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connStatus]);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            await connectWhatsApp(storeId);
            await refreshStatus();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to start connecting');
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect WhatsApp? Order notifications will stop sending until you reconnect.')) return;
        setDisconnecting(true);
        try {
            await disconnectWhatsApp(storeId);
            await refreshStatus();
            toast.success('Disconnected');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to disconnect');
        } finally {
            setDisconnecting(false);
        }
    };

    const templateFormValue = (key: TemplateKey) => {
        const saved = store?.settings?.whatsappNotifications?.templates?.[key]?.body?.trim();
        return { body: saved || getDefaultWhatsAppTemplate(key) };
    };

    const { register, control, handleSubmit, watch, setValue, formState: { isDirty } } = useForm({
        values: store
            ? {
                  whatsappNotifications: {
                      sendOrderConfirmation: store.settings?.whatsappNotifications?.sendOrderConfirmation ?? true,
                      sendStatusUpdates: store.settings?.whatsappNotifications?.sendStatusUpdates ?? true,
                      templates: {
                          orderConfirmation: templateFormValue('orderConfirmation'),
                          orderStatusChanged: templateFormValue('orderStatusChanged'),
                          marketing: templateFormValue('marketing'),
                      },
                  },
              }
            : undefined,
    });

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync({
            settings: { ...store?.settings, whatsappNotifications: data.whatsappNotifications },
        });
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const sendOrderConfirmation = watch('whatsappNotifications.sendOrderConfirmation');
    const sendStatusUpdates = watch('whatsappNotifications.sendStatusUpdates');
    const isZeroBalance = balance !== null && balance <= 0;
    const isConnected = connStatus === 'connected';

    const handleResetTemplate = (key: TemplateKey) => {
        if (!confirm('Reset this message back to the original template? Your changes on this tab will be discarded once you save.')) return;
        setValue(`whatsappNotifications.templates.${key}.body` as const, getDefaultWhatsAppTemplate(key), { shouldDirty: true });
        toast.success('Reset to the original template — click Save to keep it.');
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">WhatsApp</h1>
                <p className="text-muted-foreground">Send order updates to your customers on WhatsApp — connect your number, then customize what gets sent.</p>
            </div>

            <WhatsAppCreditsPanel
                storeId={storeId}
                onBalanceChange={setBalance}
                onFeatureIncludedChange={setFeatureIncluded}
                onUpgradePlan={() => router.push('/merchant/billing')}
            />

            {/* Connection */}
            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-emerald-600" />
                        Connection
                    </CardTitle>
                    <CardDescription>Link your own WhatsApp number — the same way you'd link WhatsApp Web on a computer.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {!featureIncluded && !isConnected ? (
                        <div className="flex flex-col items-center gap-3 py-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                                <QrCode className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                WhatsApp is not included in your current plan — upgrade to connect a number.
                            </p>
                        </div>
                    ) : isConnected ? (
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">Connected</p>
                                    <p className="text-sm text-muted-foreground">+{phoneNumber}</p>
                                </div>
                            </div>
                            <Button type="button" variant="outline" className="rounded-xl gap-2" disabled={disconnecting} onClick={handleDisconnect}>
                                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                                Disconnect
                            </Button>
                        </div>
                    ) : connStatus === 'connecting' ? (
                        <div className="flex flex-col items-center gap-4 py-4 text-center">
                            {qrCode ? (
                                <img src={qrCode} alt="Scan with WhatsApp" className="w-52 h-52 rounded-xl border-2 p-2" />
                            ) : (
                                <div className="w-52 h-52 rounded-xl border-2 border-dashed flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            )}
                            <div className="space-y-1 max-w-sm">
                                <p className="font-semibold flex items-center justify-center gap-1.5"><Smartphone className="w-4 h-4" /> Scan with your phone</p>
                                <p className="text-xs text-muted-foreground">WhatsApp → Settings → Linked Devices → Link a Device</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 py-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                                <QrCode className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                {connStatus === 'logged_out' ? 'Your WhatsApp was unlinked from this store — connect again to resume sending.' : 'Not connected yet — connect your WhatsApp number to start sending order updates.'}
                            </p>
                            <Button type="button" className="rounded-xl gap-2" disabled={connecting} onClick={handleConnect}>
                                {connecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                                Connect WhatsApp
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <form onSubmit={onSubmit} className="space-y-8">
                {/* Toggles */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-emerald-600" />
                            Customer Notifications
                        </CardTitle>
                        <CardDescription>Turn automatic WhatsApp messages on or off. These only send while WhatsApp is connected and you have credits available.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${sendOrderConfirmation ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                    <PackageCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">Order confirmation</p>
                                    <p className="text-sm text-muted-foreground">Message the customer as soon as they place an order.</p>
                                </div>
                            </div>
                            <Switch
                                checked={sendOrderConfirmation}
                                disabled={isZeroBalance}
                                onCheckedChange={(checked) => setValue('whatsappNotifications.sendOrderConfirmation', checked, { shouldDirty: true })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${sendStatusUpdates ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                    <Truck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-semibold">Order status updates</p>
                                    <p className="text-sm text-muted-foreground">Message the customer whenever their order's status changes.</p>
                                </div>
                            </div>
                            <Switch
                                checked={sendStatusUpdates}
                                disabled={isZeroBalance}
                                onCheckedChange={(checked) => setValue('whatsappNotifications.sendStatusUpdates', checked, { shouldDirty: true })}
                            />
                        </div>
                        {isZeroBalance && (
                            <p className="text-xs text-muted-foreground italic">Toggles are disabled while you have 0 WhatsApp credits — nothing can be sent until you top up.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Message templates */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Megaphone className="w-5 h-5 text-emerald-600" />
                            Message Templates
                        </CardTitle>
                        <CardDescription>Plain text — use *asterisks* for bold and _underscores_ for italic, the same way WhatsApp itself formats messages.</CardDescription>
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
                                    <div className="flex items-center justify-between">
                                        <Label>Message</Label>
                                        <Button type="button" variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => handleResetTemplate(key)}>
                                            <RotateCcw className="w-3.5 h-3.5" /> Reset to original
                                        </Button>
                                    </div>
                                    <Controller
                                        control={control}
                                        name={`whatsappNotifications.templates.${key}.body` as const}
                                        render={({ field }) => (
                                            <Textarea {...field} rows={7} className="rounded-xl font-mono text-sm" />
                                        )}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Tokens: {'{{customerName}}'}, {'{{orderNumber}}'}, {'{{total}}'}, {'{{status}}'}, {'{{storeName}}'}
                                    </p>
                                    {/* Live preview styled as a WhatsApp message bubble */}
                                    <div className="rounded-2xl bg-[#e5ddd5] dark:bg-slate-800 p-4">
                                        <div className="max-w-sm ml-auto bg-[#dcf8c6] dark:bg-emerald-900/60 rounded-xl rounded-tr-none p-3 shadow-sm">
                                            <p className="text-sm whitespace-pre-line text-slate-800 dark:text-slate-100">
                                                {watch(`whatsappNotifications.templates.${key}.body`)}
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>
                            ))}
                        </Tabs>
                    </CardContent>
                </Card>

                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-end">
                    <Button type="submit" disabled={!isDirty || updateMutation.isPending} className="rounded-full px-10 shadow-lg shadow-primary/20">
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save WhatsApp Settings</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
