'use client';

import { use, useRef } from "react";
import { useStore, useUpdateStore } from "@shared/lib/hooks/useStore";
import { useForm, useFieldArray } from "react-hook-form";
import {
    Card,
    CardContent
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { PasswordInput } from "@shared/components/ui/password-input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import { cn } from "@shared/lib/utils";
import {
    Truck,
    Plus,
    Trash2,
    Save,
    Loader2,
    MapPin,
    Settings,
    CheckCircle2
} from "lucide-react";

// The exact mask placeholder the backend recognizes as "leave this secret
// untouched" (see backend/src/utils/applyEncryptedCredentials.ts). Every
// masked field on this page defaults to this string when a value is already
// saved, and submitting it unchanged tells the backend to keep the existing
// ciphertext rather than clobbering it.
const MASKED_VALUE = '••••••••••••';

type ShippingProviderId = 'local' | 'bosta' | 'aramex' | 'mylerz' | 'jt_express';

// One entry per provider the grid renders. `accent` is that courier's real
// brand color, used only as a tile accent/wordmark color (no logo artwork).
const SHIPPING_PROVIDERS: {
    id: ShippingProviderId;
    name: string;
    tagline: string;
    accent: string;
    hasCredentials: boolean;
}[] = [
    { id: 'local', name: 'Local Delivery', tagline: 'Your own fleet', accent: '#64748B', hasCredentials: false },
    { id: 'bosta', name: 'Bosta', tagline: 'Waybills & live tracking', accent: '#E4312B', hasCredentials: true },
    { id: 'aramex', name: 'Aramex', tagline: 'Global courier network', accent: '#C8102E', hasCredentials: true },
    { id: 'mylerz', name: 'Mylerz', tagline: 'Last-mile delivery', accent: '#F4511E', hasCredentials: true },
    { id: 'jt_express', name: 'J&T Express', tagline: 'Regional express courier', accent: '#E30613', hasCredentials: true },
];

export default function ShippingSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);
    const credentialsPanelRef = useRef<HTMLDivElement>(null);

    const { register, control, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm({
        values: store ? {
            shipping: {
                enabled: store.settings?.shipping?.enabled || false,
                provider: store.settings?.shipping?.provider || 'local',
                credentials: {
                    apiKey: store.settings?.shipping?.credentials?.apiKey ? MASKED_VALUE : '',
                    accountNumber: store.settings?.shipping?.credentials?.accountNumber || '',
                    accountEntity: store.settings?.shipping?.credentials?.accountEntity || '',
                    accountCountryCode: store.settings?.shipping?.credentials?.accountCountryCode || '',
                    username: store.settings?.shipping?.credentials?.username ? MASKED_VALUE : '',
                    password: store.settings?.shipping?.credentials?.password ? MASKED_VALUE : '',
                    accountPin: store.settings?.shipping?.credentials?.accountPin ? MASKED_VALUE : '',
                    apiAccount: store.settings?.shipping?.credentials?.apiAccount || '',
                    customerCode: store.settings?.shipping?.credentials?.customerCode || '',
                    privateKey: store.settings?.shipping?.credentials?.privateKey ? MASKED_VALUE : '',
                },
                zones: store.settings?.shipping?.zones || []
            }
        } : undefined
    });

    const selectedProvider = (watch("shipping.provider") || 'local') as ShippingProviderId;
    const selectedProviderMeta = SHIPPING_PROVIDERS.find(p => p.id === selectedProvider);

    const selectProvider = (id: ShippingProviderId) => {
        setValue("shipping.provider", id, { shouldDirty: true });
        // The grid selects AND opens that provider's form below it — scroll
        // it into view so switching providers is never a silent no-op.
        setTimeout(() => credentialsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    };

    const { fields, append, remove } = useFieldArray({
        control,
        name: "shipping.zones"
    });

    const onSubmit = handleSubmit(async (data) => {
        await updateMutation.mutateAsync({ settings: { ...store?.settings, shipping: data.shipping } });
    });

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    const isEnabled = watch("shipping.enabled");

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20">
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Shipping Settings</h1>
                <p className="text-muted-foreground">Manage delivery zones, rates and free shipping thresholds.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
                {/* Master Toggle */}
                <Card className={`border-2 shadow-sm rounded-2xl overflow-hidden transition ${isEnabled ? 'border-primary/20 bg-primary/5' : 'border-dashed'}`}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${isEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                                <Truck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold">Enable Store Shipping</h3>
                                <p className="text-sm text-muted-foreground">Turn on shipping calculations at checkout.</p>
                            </div>
                        </div>
                        <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => setValue("shipping.enabled", checked, { shouldDirty: true })}
                        />
                    </CardContent>
                </Card>

                {isEnabled && (
                    <>
                        {/* Provider Settings */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Truck className="w-5 h-5 text-primary" />
                                Shipping Provider
                            </h2>
                            <Card className="border-2 shadow-sm rounded-2xl overflow-hidden">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {SHIPPING_PROVIDERS.map((p) => {
                                            const isActive = selectedProvider === p.id;
                                            return (
                                                <div
                                                    key={p.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => selectProvider(p.id)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectProvider(p.id); } }}
                                                    className={cn(
                                                        "relative cursor-pointer rounded-xl border-2 p-4 min-h-[104px] flex flex-col items-center justify-center gap-1.5 text-center transition",
                                                        isActive ? "shadow-md" : "border-border bg-background hover:border-primary/30 hover:shadow-sm"
                                                    )}
                                                    style={isActive ? { borderColor: p.accent, backgroundColor: `${p.accent}12` } : undefined}
                                                >
                                                    {isActive && (
                                                        <CheckCircle2
                                                            className="absolute top-2 left-2 w-4 h-4"
                                                            style={{ color: p.accent }}
                                                        />
                                                    )}
                                                    {p.hasCredentials && (
                                                        <Settings
                                                            className="absolute top-2 right-2 w-3.5 h-3.5 text-muted-foreground/60"
                                                            aria-hidden
                                                        />
                                                    )}
                                                    {p.id === 'local' ? (
                                                        <Truck className="w-6 h-6" style={{ color: isActive ? p.accent : undefined }} />
                                                    ) : (
                                                        <span
                                                            className="font-black italic text-base tracking-tight leading-tight"
                                                            style={{ color: p.accent }}
                                                        >
                                                            {p.name}
                                                        </span>
                                                    )}
                                                    <p className="text-[10px] font-semibold text-muted-foreground leading-tight px-1">{p.tagline}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedProviderMeta?.hasCredentials && (
                                        <div ref={credentialsPanelRef} className="pt-6 mt-6 border-t animate-in slide-in-from-top-4 fade-in duration-300 space-y-4">
                                            <h3 className="font-bold text-sm">{selectedProviderMeta.name} settings</h3>

                                            {selectedProvider === 'bosta' && (
                                                <div className="space-y-2 max-w-sm">
                                                    <Label>Bosta API Key</Label>
                                                    <PasswordInput
                                                        {...register("shipping.credentials.apiKey")}
                                                        placeholder={store?.settings?.shipping?.credentials?.apiKey ? MASKED_VALUE : "Enter API Key"}
                                                    />
                                                    <p className="text-xs text-muted-foreground mt-1">Your key is AES-encrypted before saving. We never transmit it back to the browser in plaintext.</p>
                                                </div>
                                            )}

                                            {selectedProvider === 'aramex' && (
                                                <div className="space-y-6">
                                                    <p className="text-xs text-muted-foreground">
                                                        Connect your own existing Aramex account — get these details from your Aramex merchant dashboard.
                                                        Your credentials are AES-encrypted before saving; we never transmit them back to the browser in plaintext.
                                                    </p>
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Account</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="space-y-2">
                                                                <Label>Account Number</Label>
                                                                <Input {...register("shipping.credentials.accountNumber")} placeholder="e.g. 123456" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Account Entity</Label>
                                                                <Input {...register("shipping.credentials.accountEntity")} placeholder="e.g. CAI" />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Account Country Code</Label>
                                                                <Input {...register("shipping.credentials.accountCountryCode")} placeholder="e.g. EG" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Login</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="space-y-2">
                                                                <Label>Username</Label>
                                                                <PasswordInput
                                                                    {...register("shipping.credentials.username")}
                                                                    placeholder={store?.settings?.shipping?.credentials?.username ? MASKED_VALUE : "Aramex account email/username"}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Password</Label>
                                                                <PasswordInput
                                                                    {...register("shipping.credentials.password")}
                                                                    placeholder={store?.settings?.shipping?.credentials?.password ? MASKED_VALUE : "Enter password"}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Account PIN</Label>
                                                                <PasswordInput
                                                                    {...register("shipping.credentials.accountPin")}
                                                                    placeholder={store?.settings?.shipping?.credentials?.accountPin ? MASKED_VALUE : "Enter PIN"}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedProvider === 'mylerz' && (
                                                <div className="space-y-4">
                                                    <p className="text-xs text-muted-foreground">
                                                        Connect your own existing Mylerz account — get these details from your Mylerz merchant dashboard.
                                                        Your credentials are AES-encrypted before saving; we never transmit them back to the browser in plaintext.
                                                    </p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                                                        <div className="space-y-2">
                                                            <Label>Username</Label>
                                                            <PasswordInput
                                                                {...register("shipping.credentials.username")}
                                                                placeholder={store?.settings?.shipping?.credentials?.username ? MASKED_VALUE : "Mylerz account email/username"}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Password</Label>
                                                            <PasswordInput
                                                                {...register("shipping.credentials.password")}
                                                                placeholder={store?.settings?.shipping?.credentials?.password ? MASKED_VALUE : "Enter password"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedProvider === 'jt_express' && (
                                                <div className="space-y-4">
                                                    <p className="text-xs text-muted-foreground">
                                                        Connect your own existing J&amp;T Express account — get these details from your J&amp;T Express merchant dashboard.
                                                        Your credentials are AES-encrypted before saving; we never transmit them back to the browser in plaintext.
                                                    </p>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div className="space-y-2">
                                                            <Label>API Account</Label>
                                                            <Input {...register("shipping.credentials.apiAccount")} placeholder="e.g. 640xxxxxxxxxxxx" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Customer Code</Label>
                                                            <Input {...register("shipping.credentials.customerCode")} placeholder="e.g. EGXXXXXXXX" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Private Key</Label>
                                                            <PasswordInput
                                                                {...register("shipping.credentials.privateKey")}
                                                                placeholder={store?.settings?.shipping?.credentials?.privateKey ? MASKED_VALUE : "Enter private key"}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Shipping Zones */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    Shipping Zones
                                </h2>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="rounded-xl"
                                    onClick={() => append({ name: "", cities: [], rate: 0, freeShippingThreshold: 0 })}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Zone
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {fields.length === 0 ? (
                                    <div className="p-12 border-2 border-dashed rounded-2xl text-center space-y-2">
                                        <p className="text-muted-foreground font-medium">No shipping zones defined.</p>
                                        <p className="text-xs text-muted-foreground">Add zones to specify where you deliver and at what cost.</p>
                                    </div>
                                ) : (
                                    fields.map((field, index) => (
                                        <Card key={field.id} className="border-2 shadow-sm rounded-2xl overflow-hidden">
                                            <CardContent className="p-6 space-y-6">
                                                <div className="flex flex-col md:flex-row gap-6">
                                                    <div className="flex-1 space-y-2">
                                                        <Label>Zone Name</Label>
                                                        <Input {...register(`shipping.zones.${index}.name` as const)} placeholder="e.g. Cairo & Giza" />
                                                    </div>
                                                    <div className="w-full md:w-32 space-y-2">
                                                        <Label>Rate (EGP)</Label>
                                                        <Input type="number" {...register(`shipping.zones.${index}.rate` as const, { valueAsNumber: true })} />
                                                    </div>
                                                    <div className="w-full md:w-48 space-y-2">
                                                        <Label>Free Over (EGP)</Label>
                                                        <Input type="number" {...register(`shipping.zones.${index}.freeShippingThreshold` as const, { valueAsNumber: true })} />
                                                    </div>
                                                    <div className="flex items-end pb-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:bg-red-50 rounded-xl"
                                                            onClick={() => remove(index)}
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}

                {/* Save Button */}
                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-end">
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                        className="rounded-full px-10 shadow-lg shadow-primary/20"
                    >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Shipping</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
