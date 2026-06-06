'use client';

import { use } from "react";
import { useStore, useUpdateStore } from "@shared/lib/hooks/useStore";
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
import { Label } from "@shared/components/ui/label";
import {
    CreditCard,
    Info,
    Save,
    Loader2,
    Wallet,
    Building,
    CheckCircle2,
    Smartphone,
    Globe,
    Layers
} from "lucide-react";
import { Switch } from "@shared/components/ui/switch";
import { cn } from "@shared/lib/utils";

export default function PaymentSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm({
        values: store ? {
            payment: {
                provider: store.settings?.payment?.provider || 'manual',
                credentials: {
                    apiKey: store.settings?.payment?.credentials?.apiKey ? '••••••••••••' : '',
                    apiSecret: store.settings?.payment?.credentials?.apiSecret ? '••••••••••••' : '',
                    publicKey: store.settings?.payment?.credentials?.publicKey || '',
                    iframeId: store.settings?.payment?.credentials?.iframeId || '',
                },
                methods: store.settings?.payment?.methods || [],
                instapayNumber: store.settings?.payment?.instapayNumber || "",
                vcashNumber: store.settings?.payment?.vcashNumber || "",
                bankDetails: {
                    bankName: store.settings?.payment?.bankDetails?.bankName || "",
                    accountNumber: store.settings?.payment?.bankDetails?.accountNumber || "",
                    accountName: store.settings?.payment?.bankDetails?.accountName || "",
                }
            }
        } : undefined
    });

    const activeMethods = watch("payment.methods") || [];

    const toggleMethod = (method: string) => {
        const current = [...activeMethods];
        if (current.includes(method)) {
            setValue("payment.methods", current.filter(m => m !== method), { shouldDirty: true });
        } else {
            setValue("payment.methods", [...current, method], { shouldDirty: true });
        }
    };

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync({ settings: { ...store?.settings, payment: data.payment } });
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Payment Methods</h1>
                <p className="text-muted-foreground">Configure how you receive payments from customers.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
                {/* Gateway Provider Selection */}
                <Card className={cn(
                    "border-2 shadow-sm rounded-2xl overflow-hidden transition-all",
                    watch("payment.provider") !== 'manual' ? 'border-primary/20 bg-primary/5' : ''
                )}>
                    <CardHeader className="bg-background/50 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-primary" />
                            Checkout Gateway
                        </CardTitle>
                        <CardDescription>Select the core engine powering automated checkout sessions for your buyers.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { id: 'manual', name: 'Offline Settings', icon: Building, color: 'border-slate-300 bg-slate-50', text: 'text-slate-600' },
                                { id: 'paymob', name: 'Paymob', icon: Layers, color: 'border-blue-400 bg-blue-50/50', text: 'text-blue-500' },
                                { id: 'stripe', name: 'Stripe', icon: Globe, color: 'border-indigo-400 bg-indigo-50/50', text: 'text-indigo-500' },
                                { id: 'paypal', name: 'PayPal', icon: Smartphone, color: 'border-cyan-400 bg-cyan-50/50', text: 'text-cyan-600' },
                                { id: 'fawry', name: 'Fawry', icon: Wallet, color: 'border-yellow-400 bg-yellow-50/50', text: 'text-yellow-600' }
                            ].map((prov) => {
                                const Icon = prov.icon;
                                const isActive = watch("payment.provider") === prov.id;
                                return (
                                    <div
                                        key={prov.id}
                                        onClick={() => setValue("payment.provider", prov.id, { shouldDirty: true })}
                                        className={cn(
                                            "cursor-pointer p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center gap-2",
                                            isActive ? `ring-2 ring-primary/20 shadow-md ${prov.color}` : "border-border hover:border-primary/40 bg-background"
                                        )}
                                    >
                                        <Icon className={cn("w-6 h-6", isActive ? prov.text : "text-muted-foreground")} />
                                        <p className={cn("font-bold text-xs tracking-tight", isActive ? "text-foreground" : "text-muted-foreground")}>{prov.name}</p>
                                    </div>
                                );
                            })}
                        </div>

                        {watch("payment.provider") === 'paymob' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300 pt-6 border-t border-primary/10 mt-6">
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <Input type="password" placeholder={store?.settings?.payment?.credentials?.apiKey ? "••••••••••••" : "Enter API Key"} {...register("payment.credentials.apiKey")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>HMAC Secret</Label>
                                    <Input type="password" placeholder={store?.settings?.payment?.credentials?.apiSecret ? "••••••••••••" : "Enter HMAC Secret"} {...register("payment.credentials.apiSecret")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Integration ID (Card)</Label>
                                    <Input placeholder="e.g. 451239" {...register("payment.credentials.publicKey")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Iframe ID</Label>
                                    <Input placeholder="e.g. 892301" {...register("payment.credentials.iframeId")} />
                                </div>
                                <p className="text-[11px] font-medium text-muted-foreground md:col-span-2">All gateway keys are securely encrypted in our databases using AES-GCM algorithms before saving.</p>
                            </div>
                        )}

                        {watch("payment.provider") === 'stripe' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300 pt-6 border-t border-primary/10 mt-6">
                                <div className="space-y-2">
                                    <Label>Publishable Key</Label>
                                    <Input placeholder={store?.settings?.payment?.credentials?.publicKey ? "pk_live_••••••••" : "pk_live_..."} {...register("payment.credentials.publicKey")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Secret Key</Label>
                                    <Input type="password" placeholder={store?.settings?.payment?.credentials?.apiKey ? "sk_live_••••••••" : "sk_live_..."} {...register("payment.credentials.apiKey")} />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Webhook Signing Secret</Label>
                                    <Input type="password" placeholder={store?.settings?.payment?.credentials?.apiSecret ? "whsec_••••••••••••" : "whsec_..."} {...register("payment.credentials.apiSecret")} />
                                </div>
                                <p className="text-[11px] font-medium text-muted-foreground md:col-span-2">All gateway keys are securely encrypted in our databases using AES-GCM algorithms before saving.</p>
                            </div>
                        )}

                        {watch("payment.provider") === 'paypal' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300 pt-6 border-t border-primary/10 mt-6">
                                <div className="space-y-2">
                                    <Label>Client ID</Label>
                                    <Input placeholder={store?.settings?.payment?.credentials?.apiKey ? "••••••••••••" : "Enter REST App Client ID"} {...register("payment.credentials.apiKey")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Client Secret</Label>
                                    <Input type="password" placeholder={store?.settings?.payment?.credentials?.apiSecret ? "••••••••••••" : "Enter Application Secret"} {...register("payment.credentials.apiSecret")} />
                                </div>
                                <p className="text-[11px] font-medium text-muted-foreground md:col-span-2">All gateway keys are securely encrypted in our databases using AES-GCM algorithms before saving.</p>
                            </div>
                        )}

                        {watch("payment.provider") === 'fawry' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 fade-in duration-300 pt-6 border-t border-primary/10 mt-6">
                                <div className="space-y-2">
                                    <Label>Fawry Merchant Code</Label>
                                    <Input placeholder={store?.settings?.payment?.credentials?.publicKey ? "••••••••••••" : "e.g. 7700000XXXX"} {...register("payment.credentials.publicKey")} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Fawry Secure Key</Label>
                                    <Input type="password" placeholder={store?.settings?.payment?.credentials?.apiSecret ? "••••••••••••" : "Enter Secret Verification Key"} {...register("payment.credentials.apiSecret")} />
                                </div>
                                <p className="text-[11px] font-medium text-muted-foreground md:col-span-2">All gateway keys are securely encrypted in our databases using AES-GCM algorithms before saving.</p>
                            </div>
                        )}

                        {watch("payment.provider") === 'manual' && (
                            <div className="animate-in fade-in pt-4 border-t border-border mt-4">
                                <p className="text-sm font-medium text-muted-foreground">Automated tracking disabled. Payments must be verified manually offline using the Fallback Methods below.</p>
                            </div>
                        )}


                    </CardContent>
                </Card>

                {/* Methods Selection */}
                <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-primary" />
                            Fallback Methods
                        </CardTitle>
                        <CardDescription>Select which offline payment methods are enabled as fallback alternatives.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                                    <CreditCard className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Cash on Delivery</p>
                                    <p className="text-xs text-muted-foreground">Pay when receiving items</p>
                                </div>
                            </div>
                            <Switch
                                checked={activeMethods.includes('cod')}
                                onCheckedChange={() => toggleMethod('cod')}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                                    <Building className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Bank Transfer</p>
                                    <p className="text-xs text-muted-foreground">Wire transfer to bank account</p>
                                </div>
                            </div>
                            <Switch
                                checked={activeMethods.includes('bank_transfer')}
                                onCheckedChange={() => toggleMethod('bank_transfer')}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-pink-100 text-pink-600">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Instapay</p>
                                    <p className="text-xs text-muted-foreground">Direct P2P App Transfer</p>
                                </div>
                            </div>
                            <Switch
                                checked={activeMethods.includes('instapay')}
                                onCheckedChange={() => toggleMethod('instapay')}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border bg-background hover:border-primary/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-red-100 text-red-600">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">Vodafone Cash</p>
                                    <p className="text-xs text-muted-foreground">Mobile wallet transfer</p>
                                </div>
                            </div>
                            <Switch
                                checked={activeMethods.includes('vodafone_cash')}
                                onCheckedChange={() => toggleMethod('vodafone_cash')}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Peer-to-Peer Payments */}
                <Card className={cn(
                    "border-2 shadow-sm rounded-2xl overflow-hidden transition-all",
                    (!activeMethods.includes('instapay') && !activeMethods.includes('vodafone_cash')) && "opacity-50 grayscale pointer-events-none"
                )}>
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            Direct Wallets Info
                        </CardTitle>
                        <CardDescription>Numbers for customers to transfer to.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="instapay">Instapay Link / Address</Label>
                                <Input id="instapay" placeholder="e.g. name@instapay" {...register("payment.instapayNumber")} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="vcash">Vodafone Cash Number</Label>
                                <Input id="vcash" placeholder="e.g. 010XXXXXXXX" {...register("payment.vcashNumber")} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bank Transfer */}
                <Card className={cn(
                    "border-2 shadow-sm rounded-2xl overflow-hidden transition-all",
                    !activeMethods.includes('bank_transfer') && "opacity-50 grayscale pointer-events-none"
                )}>
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary" />
                            Bank Transfer Details
                        </CardTitle>
                        <CardDescription>Provide your bank account for wire transfers.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Bank Name</Label>
                                    <Input {...register("payment.bankDetails.bankName")} placeholder="e.g. CIB, QNB..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Name</Label>
                                    <Input {...register("payment.bankDetails.accountName")} placeholder="The name on the account" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Account Number / IBAN</Label>
                                <Input {...register("payment.bankDetails.accountNumber")} placeholder="Full IBAN or account number" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Info Card */}
                <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                    <Info className="w-5 h-5 text-primary mt-0.5" />
                    <p className="text-sm text-primary/80 leading-relaxed">
                        Currently, Buildora supports offline payment methods where you verify receipts manually.
                        Enable the methods you want to offer, and fill in the details so customers can pay you.
                    </p>
                </div>

                {/* Save Button */}
                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-end">
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                        className="rounded-full px-10 shadow-lg shadow-primary/20"
                    >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Payments</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
