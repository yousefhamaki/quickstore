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
    Trash2,
    Save,
    Loader2,
    MapPin,
    Settings,
    CheckCircle2,
    Banknote
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { EGYPTIAN_GOVERNORATES } from "@shared/constants/egyptianGovernorates";

// The exact mask placeholder the backend recognizes as "leave this secret
// untouched" (see backend/src/utils/applyEncryptedCredentials.ts). Every
// masked field on this page defaults to this string when a value is already
// saved, and submitting it unchanged tells the backend to keep the existing
// ciphertext rather than clobbering it.
const MASKED_VALUE = '••••••••••••';

type ShippingProviderId = 'local' | 'bosta' | 'aramex' | 'mylerz' | 'jt_express';

const SHIPPING_PROVIDER_IDS: ShippingProviderId[] = ['local', 'bosta', 'aramex', 'mylerz', 'jt_express'];

// One entry per provider the grid renders. `accent` is that courier's real
// brand color, used only as a tile accent/wordmark color (no logo artwork).
// Display name/tagline come from translations (merchant.shippingSettings.provider) —
// see PROVIDER_META below for the static (non-translated) bits.
const PROVIDER_META: Record<ShippingProviderId, { accent: string; hasCredentials: boolean }> = {
    local: { accent: '#64748B', hasCredentials: false },
    bosta: { accent: '#E4312B', hasCredentials: true },
    aramex: { accent: '#C8102E', hasCredentials: true },
    mylerz: { accent: '#F4511E', hasCredentials: true },
    jt_express: { accent: '#E30613', hasCredentials: true },
};

export default function ShippingSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);
    const credentialsPanelRef = useRef<HTMLDivElement>(null);
    const t = useTranslations('merchant.shippingSettings');
    const locale = useLocale();

    const { register, control, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm({
        values: store ? {
            shipping: {
                enabled: store.settings?.shipping?.enabled || false,
                provider: store.settings?.shipping?.provider || 'local',
                standardRate: store.settings?.shipping?.standardRate ?? 50,
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
    const selectedProviderMeta = PROVIDER_META[selectedProvider];

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
    const standardRate = watch("shipping.standardRate");
    const currentZones = (watch("shipping.zones") || []) as any[];

    // Governorate-based zones (the "Add Governorate" flow) vs. legacy
    // free-form zones a merchant already created by hand (matched only by
    // `cities`, no `governorate` set) — kept working as-is, see Task 5.
    const governorateZoneIndexes = fields
        .map((field, index) => ({ field, index }))
        .filter(({ field }) => !!(field as any).governorate);
    const customZoneIndexes = fields
        .map((field, index) => ({ field, index }))
        .filter(({ field }) => !(field as any).governorate);

    const usedGovernorateKeys = new Set(
        currentZones.filter((z) => z?.governorate).map((z) => z.governorate)
    );
    const availableGovernorates = EGYPTIAN_GOVERNORATES.filter(g => !usedGovernorateKeys.has(g.key));

    const govName = (key: string) => {
        const gov = EGYPTIAN_GOVERNORATES.find(g => g.key === key);
        if (!gov) return key;
        return locale === 'ar' ? gov.nameAr : gov.nameEn;
    };

    const addGovernorateZone = (key: string) => {
        if (!key) return;
        const gov = EGYPTIAN_GOVERNORATES.find(g => g.key === key);
        if (!gov) return;
        append({
            governorate: key,
            name: gov.nameEn,
            cities: [],
            // Defaults to the current Standard Fee — merchant can then edit
            // this zone's own rate up or down.
            rate: Number(standardRate) || 0,
            freeShippingThreshold: 0
        });
    };

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-20 relative">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-cyan-100/30 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

            <div className="space-y-1 relative">
                <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
                {/* Master Toggle */}
                <Card className={`border shadow-md hover:shadow-lg rounded-2xl overflow-hidden transition-shadow duration-300 ${isEnabled ? 'border-cyan-200 bg-cyan-50' : 'border-dashed'}`}>
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-colors ${isEnabled ? 'bg-cyan-600 text-white' : 'bg-muted text-muted-foreground'}`}>
                                <Truck className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold">{t('enableCard.title')}</h3>
                                <p className="text-sm text-muted-foreground">{t('enableCard.subtitle')}</p>
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
                        {/* Standard Shipping Fee */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Banknote className="w-5 h-5 text-cyan-600" />
                                {t('standardRate.heading')}
                            </h2>
                            <Card className="border shadow-md hover:shadow-lg rounded-2xl overflow-hidden transition-shadow duration-300">
                                <CardContent className="p-6">
                                    <div className="space-y-2 max-w-xs">
                                        <Label>{t('standardRate.label')}</Label>
                                        <Input
                                            type="number"
                                            {...register("shipping.standardRate", { valueAsNumber: true })}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">{t('standardRate.hint')}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Provider Settings */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Truck className="w-5 h-5 text-cyan-600" />
                                {t('provider.heading')}
                            </h2>
                            <Card className="border shadow-md hover:shadow-lg rounded-2xl overflow-hidden transition-shadow duration-300">
                                <CardContent className="p-6">
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                        {SHIPPING_PROVIDER_IDS.map((id) => {
                                            const meta = PROVIDER_META[id];
                                            const isActive = selectedProvider === id;
                                            return (
                                                <div
                                                    key={id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => selectProvider(id)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectProvider(id); } }}
                                                    className={cn(
                                                        "relative cursor-pointer rounded-xl border-2 p-4 min-h-[104px] flex flex-col items-center justify-center gap-1.5 text-center transition",
                                                        isActive ? "shadow-md" : "border-border bg-background hover:border-primary/30 hover:shadow-sm"
                                                    )}
                                                    style={isActive ? { borderColor: meta.accent, backgroundColor: `${meta.accent}12` } : undefined}
                                                >
                                                    {isActive && (
                                                        <CheckCircle2
                                                            className="absolute top-2 left-2 w-4 h-4"
                                                            style={{ color: meta.accent }}
                                                        />
                                                    )}
                                                    {meta.hasCredentials && (
                                                        <Settings
                                                            className="absolute top-2 right-2 w-3.5 h-3.5 text-muted-foreground/60"
                                                            aria-hidden
                                                        />
                                                    )}
                                                    {id === 'local' ? (
                                                        <Truck className="w-6 h-6" style={{ color: isActive ? meta.accent : undefined }} />
                                                    ) : (
                                                        <span
                                                            className="font-black italic text-base tracking-tight leading-tight"
                                                            style={{ color: meta.accent }}
                                                        >
                                                            {t(`provider.names.${id}`)}
                                                        </span>
                                                    )}
                                                    <p className="text-[10px] font-semibold text-muted-foreground leading-tight px-1">{t(`provider.taglines.${id}`)}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {selectedProviderMeta?.hasCredentials && (
                                        <div ref={credentialsPanelRef} className="pt-6 mt-6 border-t animate-in slide-in-from-top-4 fade-in duration-300 space-y-4">
                                            <h3 className="font-bold text-sm">{t('provider.settingsHeading', { name: t(`provider.names.${selectedProvider}`) })}</h3>

                                            {selectedProvider === 'bosta' && (
                                                <div className="space-y-2 max-w-sm">
                                                    <Label>{t('provider.bosta.apiKeyLabel')}</Label>
                                                    <PasswordInput
                                                        {...register("shipping.credentials.apiKey")}
                                                        placeholder={store?.settings?.shipping?.credentials?.apiKey ? MASKED_VALUE : t('provider.bosta.apiKeyPlaceholder')}
                                                    />
                                                    <p className="text-xs text-muted-foreground mt-1">{t('provider.bosta.apiKeyHint')}</p>
                                                </div>
                                            )}

                                            {selectedProvider === 'aramex' && (
                                                <div className="space-y-6">
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('provider.aramex.description')}
                                                    </p>
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('provider.aramex.accountSection')}</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="space-y-2">
                                                                <Label>{t('provider.aramex.accountNumberLabel')}</Label>
                                                                <Input {...register("shipping.credentials.accountNumber")} placeholder={t('provider.aramex.accountNumberPlaceholder')} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{t('provider.aramex.accountEntityLabel')}</Label>
                                                                <Input {...register("shipping.credentials.accountEntity")} placeholder={t('provider.aramex.accountEntityPlaceholder')} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{t('provider.aramex.accountCountryCodeLabel')}</Label>
                                                                <Input {...register("shipping.credentials.accountCountryCode")} placeholder={t('provider.aramex.accountCountryCodePlaceholder')} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{t('provider.aramex.loginSection')}</p>
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                            <div className="space-y-2">
                                                                <Label>{t('provider.aramex.usernameLabel')}</Label>
                                                                <PasswordInput
                                                                    {...register("shipping.credentials.username")}
                                                                    placeholder={store?.settings?.shipping?.credentials?.username ? MASKED_VALUE : t('provider.aramex.usernamePlaceholder')}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{t('provider.aramex.passwordLabel')}</Label>
                                                                <PasswordInput
                                                                    {...register("shipping.credentials.password")}
                                                                    placeholder={store?.settings?.shipping?.credentials?.password ? MASKED_VALUE : t('provider.aramex.passwordPlaceholder')}
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>{t('provider.aramex.accountPinLabel')}</Label>
                                                                <PasswordInput
                                                                    {...register("shipping.credentials.accountPin")}
                                                                    placeholder={store?.settings?.shipping?.credentials?.accountPin ? MASKED_VALUE : t('provider.aramex.accountPinPlaceholder')}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedProvider === 'mylerz' && (
                                                <div className="space-y-4">
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('provider.mylerz.description')}
                                                    </p>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
                                                        <div className="space-y-2">
                                                            <Label>{t('provider.mylerz.usernameLabel')}</Label>
                                                            <PasswordInput
                                                                {...register("shipping.credentials.username")}
                                                                placeholder={store?.settings?.shipping?.credentials?.username ? MASKED_VALUE : t('provider.mylerz.usernamePlaceholder')}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>{t('provider.mylerz.passwordLabel')}</Label>
                                                            <PasswordInput
                                                                {...register("shipping.credentials.password")}
                                                                placeholder={store?.settings?.shipping?.credentials?.password ? MASKED_VALUE : t('provider.mylerz.passwordPlaceholder')}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {selectedProvider === 'jt_express' && (
                                                <div className="space-y-4">
                                                    <p className="text-xs text-muted-foreground">
                                                        {t('provider.jtExpress.description')}
                                                    </p>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                        <div className="space-y-2">
                                                            <Label>{t('provider.jtExpress.apiAccountLabel')}</Label>
                                                            <Input {...register("shipping.credentials.apiAccount")} placeholder={t('provider.jtExpress.apiAccountPlaceholder')} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>{t('provider.jtExpress.customerCodeLabel')}</Label>
                                                            <Input {...register("shipping.credentials.customerCode")} placeholder={t('provider.jtExpress.customerCodePlaceholder')} />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>{t('provider.jtExpress.privateKeyLabel')}</Label>
                                                            <PasswordInput
                                                                {...register("shipping.credentials.privateKey")}
                                                                placeholder={store?.settings?.shipping?.credentials?.privateKey ? MASKED_VALUE : t('provider.jtExpress.privateKeyPlaceholder')}
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

                        {/* Governorate Rates */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-cyan-600" />
                                    {t('zones.heading')}
                                </h2>
                                {availableGovernorates.length > 0 ? (
                                    <select
                                        value=""
                                        onChange={(e) => addGovernorateZone(e.target.value)}
                                        className="h-10 px-3 rounded-xl border-2 bg-background font-medium text-sm outline-none max-w-[240px]"
                                    >
                                        <option value="" disabled>{t('zones.addGovernoratePlaceholder')}</option>
                                        {availableGovernorates.map((g) => (
                                            <option key={g.key} value={g.key}>
                                                {locale === 'ar' ? g.nameAr : g.nameEn}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <span className="text-xs text-muted-foreground font-medium">{t('zones.allAdded')}</span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {governorateZoneIndexes.length === 0 ? (
                                    <div className="p-12 border-2 border-dashed rounded-2xl text-center space-y-2">
                                        <p className="text-muted-foreground font-medium">{t('zones.empty')}</p>
                                        <p className="text-xs text-muted-foreground">{t('zones.emptyHint')}</p>
                                    </div>
                                ) : (
                                    governorateZoneIndexes.map(({ field, index }) => (
                                        <Card key={field.id} className="border shadow-md hover:shadow-lg rounded-2xl overflow-hidden transition-shadow duration-300">
                                            <CardContent className="p-4 md:p-5 flex items-center gap-4">
                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                    <MapPin className="w-4 h-4 text-cyan-600 shrink-0" />
                                                    <span className="font-bold truncate">{govName((field as any).governorate)}</span>
                                                </div>
                                                <div className="w-32 space-y-1">
                                                    <Label className="text-xs">{t('zones.rateLabel')}</Label>
                                                    <Input type="number" {...register(`shipping.zones.${index}.rate` as const, { valueAsNumber: true })} />
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-red-500 hover:bg-red-50 rounded-xl shrink-0"
                                                    onClick={() => remove(index)}
                                                    aria-label={t('zones.remove')}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Custom (legacy, city-matched) zones */}
                        {customZoneIndexes.length > 0 && (
                            <div className="space-y-4">
                                <div>
                                    <h2 className="text-xl font-bold flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-muted-foreground" />
                                        {t('zones.customZonesHeading')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-1">{t('zones.customZonesHint')}</p>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    {customZoneIndexes.map(({ field, index }) => (
                                        <Card key={field.id} className="border shadow-md hover:shadow-lg rounded-2xl overflow-hidden transition-shadow duration-300">
                                            <CardContent className="p-6 space-y-6">
                                                <div className="flex flex-col md:flex-row gap-6">
                                                    <div className="flex-1 space-y-2">
                                                        <Label>{t('zones.zoneNameLabel')}</Label>
                                                        <Input {...register(`shipping.zones.${index}.name` as const)} placeholder={t('zones.zoneNamePlaceholder')} />
                                                    </div>
                                                    <div className="w-full md:w-32 space-y-2">
                                                        <Label>{t('zones.rateLabel')}</Label>
                                                        <Input type="number" {...register(`shipping.zones.${index}.rate` as const, { valueAsNumber: true })} />
                                                    </div>
                                                    <div className="w-full md:w-48 space-y-2">
                                                        <Label>{t('zones.freeOverLabel')}</Label>
                                                        <Input type="number" {...register(`shipping.zones.${index}.freeShippingThreshold` as const, { valueAsNumber: true })} />
                                                    </div>
                                                    <div className="flex items-end pb-1">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:bg-red-50 rounded-xl"
                                                            onClick={() => remove(index)}
                                                            aria-label={t('zones.remove')}
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Save Button */}
                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-end">
                    <Button
                        type="submit"
                        disabled={!isDirty || updateMutation.isPending}
                        className="rounded-full px-10 shadow-lg shadow-cyan-500/20 bg-cyan-600 hover:bg-cyan-700"
                    >
                        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> {t('save')}</>}
                    </Button>
                </div>
            </form>
        </div>
    );
}
