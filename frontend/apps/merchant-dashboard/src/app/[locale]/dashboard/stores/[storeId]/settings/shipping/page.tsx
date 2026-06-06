'use client';

import { use } from "react";
import { useStore, useUpdateStore } from "@shared/lib/hooks/useStore";
import { useForm, useFieldArray } from "react-hook-form";
import {
    Card,
    CardContent
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import {
    Truck,
    Plus,
    Trash2,
    Save,
    Loader2,
    MapPin
} from "lucide-react";

export default function ShippingSettings({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const { register, control, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm({
        values: store ? {
            shipping: {
                enabled: store.settings?.shipping?.enabled || false,
                provider: store.settings?.shipping?.provider || 'local',
                credentials: {
                    apiKey: store.settings?.shipping?.credentials?.apiKey ? '••••••••••••' : ''
                },
                zones: store.settings?.shipping?.zones || []
            }
        } : undefined
    });

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
                <Card className={`border-2 shadow-sm rounded-2xl overflow-hidden transition-all ${isEnabled ? 'border-primary/20 bg-primary/5' : 'border-dashed'}`}>
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Provider</Label>
                                            <select
                                                {...register("shipping.provider")}
                                                className="w-full h-10 px-3 rounded-xl border-2 bg-background font-medium text-sm outline-none"
                                            >
                                                <option value="local">Local Delivery / Own Fleet</option>
                                                <option value="bosta">Bosta</option>
                                                <option value="aramex">Aramex</option>
                                            </select>
                                        </div>
                                        
                                        {watch("shipping.provider") === 'bosta' && (
                                            <div className="space-y-2">
                                                <Label>Bosta API Key</Label>
                                                <Input 
                                                    type="password"
                                                    {...register("shipping.credentials.apiKey")} 
                                                    placeholder={store?.settings?.shipping?.credentials?.apiKey ? "••••••••••••" : "Enter API Key"}
                                                />
                                                <p className="text-xs text-muted-foreground mt-1">Your key is AES-encrypted before saving. We never transmit it back to the browser in plaintext.</p>
                                            </div>
                                        )}
                                    </div>
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
