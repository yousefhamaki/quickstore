'use client';

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, useUpdateStore } from "@shared/lib/hooks/useStore";
import { getCategories, Category } from "@shared/services/categoryService";
import {
    Card,
    CardContent
} from "@shared/components/ui/card";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { Switch } from "@shared/components/ui/switch";
import {
    Tag,
    Gift,
    Save,
    Loader2,
    ArrowLeft
} from "lucide-react";

/**
 * Storewide sale + post-purchase voucher settings — both ride the plain
 * `PUT /api/stores/:id` store-settings update (same convention as
 * shipping/tax/etc, see settings/shipping/page.tsx), so there's no
 * dedicated backend route: the whole `settings` object is always sent back
 * with just these two keys overridden, exactly like every other settings
 * page here.
 */
export default function StoreSaleSettingsPage({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const router = useRouter();
    const { data: store, isLoading } = useStore(storeId);
    const updateMutation = useUpdateStore(storeId);

    const [categories, setCategories] = useState<Category[]>([]);

    const [sale, setSale] = useState({
        enabled: false,
        type: 'percentage' as 'percentage' | 'fixed',
        value: 0,
        startAt: '',
        endAt: '',
        excludedCategoryIds: [] as string[],
    });

    const [voucher, setVoucher] = useState({
        enabled: false,
        type: 'percentage' as 'percentage' | 'fixed',
        value: 0,
        minOrderAmountToTrigger: 0,
        expiresInDays: 30,
    });

    useEffect(() => {
        getCategories(storeId).then(setCategories).catch(() => setCategories([]));
    }, [storeId]);

    useEffect(() => {
        if (!store) return;
        const s = store.settings?.storeSale;
        setSale({
            enabled: s?.enabled || false,
            type: s?.type || 'percentage',
            value: s?.value || 0,
            startAt: s?.startAt ? new Date(s.startAt).toISOString().split('T')[0] : '',
            endAt: s?.endAt ? new Date(s.endAt).toISOString().split('T')[0] : '',
            excludedCategoryIds: s?.excludedCategoryIds || [],
        });
        const v = store.settings?.postPurchaseVoucher;
        setVoucher({
            enabled: v?.enabled || false,
            type: v?.type || 'percentage',
            value: v?.value || 0,
            minOrderAmountToTrigger: v?.minOrderAmountToTrigger || 0,
            expiresInDays: v?.expiresInDays || 30,
        });
    }, [store]);

    const toggleExcludedCategory = (categoryId: string) => {
        setSale(prev => ({
            ...prev,
            excludedCategoryIds: prev.excludedCategoryIds.includes(categoryId)
                ? prev.excludedCategoryIds.filter(id => id !== categoryId)
                : [...prev.excludedCategoryIds, categoryId]
        }));
    };

    const handleSave = async () => {
        await updateMutation.mutateAsync({
            settings: {
                ...store?.settings,
                storeSale: {
                    enabled: sale.enabled,
                    type: sale.type,
                    value: sale.value,
                    startAt: sale.startAt || undefined,
                    endAt: sale.endAt || undefined,
                    excludedCategoryIds: sale.excludedCategoryIds,
                },
                postPurchaseVoucher: {
                    enabled: voucher.enabled,
                    type: voucher.type,
                    value: voucher.value,
                    minOrderAmountToTrigger: voucher.minOrderAmountToTrigger,
                    expiresInDays: voucher.expiresInDays,
                }
            }
        });
    };

    if (isLoading) return <div className="p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 pb-24 relative">
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-100/30 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

            <div className="flex items-center gap-4 relative">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight">Storewide Sale &amp; Thank-You Voucher</h1>
                    <p className="text-muted-foreground">Run a site-wide discount and automatically reward customers after delivery.</p>
                </div>
            </div>

            {/* Storewide Sale */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Tag className="w-5 h-5 text-red-600" />
                    Storewide Sale
                </h2>
                <Card className={`border shadow-md hover:shadow-lg rounded-2xl overflow-hidden transition-shadow duration-300 ${sale.enabled ? 'border-red-200 bg-red-50/50' : ''}`}>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">Enable storewide sale</h3>
                                <p className="text-sm text-muted-foreground">Discounts every product's price (base or a selected variant's own price), except any excluded categories below.</p>
                            </div>
                            <Switch
                                checked={sale.enabled}
                                onCheckedChange={(checked) => setSale({ ...sale, enabled: checked })}
                            />
                        </div>

                        {sale.enabled && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Discount Type</Label>
                                        <select
                                            className="w-full h-10 px-3 rounded-xl border-2 bg-background font-medium text-sm outline-none"
                                            value={sale.type}
                                            onChange={e => setSale({ ...sale, type: e.target.value as any })}
                                        >
                                            <option value="percentage">Percentage off</option>
                                            <option value="fixed">Fixed amount off (EGP)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{sale.type === 'percentage' ? 'Percentage (%)' : 'Amount (EGP)'}</Label>
                                        <Input
                                            type="number"
                                            value={sale.value}
                                            onChange={e => setSale({ ...sale, value: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Start date (optional)</Label>
                                        <Input
                                            type="date"
                                            value={sale.startAt}
                                            onChange={e => setSale({ ...sale, startAt: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>End date (optional)</Label>
                                        <Input
                                            type="date"
                                            value={sale.endAt}
                                            onChange={e => setSale({ ...sale, endAt: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-muted-foreground">Leave dates blank to keep the sale purely on/off via the toggle above.</p>

                                <div className="space-y-2">
                                    <Label>Excluded categories</Label>
                                    <p className="text-xs text-muted-foreground">Products in a checked category are never discounted by this sale.</p>
                                    {categories.length === 0 ? (
                                        <p className="text-sm text-muted-foreground p-4 border-2 border-dashed rounded-xl">No categories yet.</p>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(cat => {
                                                const isExcluded = sale.excludedCategoryIds.includes(cat._id);
                                                return (
                                                    <button
                                                        key={cat._id}
                                                        type="button"
                                                        onClick={() => toggleExcludedCategory(cat._id)}
                                                        className={`px-4 py-2 rounded-xl border-2 text-xs font-bold transition ${isExcluded ? 'bg-red-50 border-red-300 text-red-600' : 'bg-background border-border text-muted-foreground hover:border-red-300'}`}
                                                    >
                                                        {isExcluded ? 'Excluded: ' : ''}{cat.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Post-Purchase Voucher */}
            <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Gift className="w-5 h-5 text-purple-600" />
                    Post-Delivery Thank-You Voucher
                </h2>
                <Card className={`border shadow-md hover:shadow-lg rounded-2xl overflow-hidden transition-shadow duration-300 ${voucher.enabled ? 'border-purple-200 bg-purple-50/50' : ''}`}>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold">Enable automatic voucher</h3>
                                <p className="text-sm text-muted-foreground">The moment an order is marked Delivered, we automatically email that customer a one-time personal discount code for their next order.</p>
                            </div>
                            <Switch
                                checked={voucher.enabled}
                                onCheckedChange={(checked) => setVoucher({ ...voucher, enabled: checked })}
                            />
                        </div>

                        {voucher.enabled && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Voucher Type</Label>
                                        <select
                                            className="w-full h-10 px-3 rounded-xl border-2 bg-background font-medium text-sm outline-none"
                                            value={voucher.type}
                                            onChange={e => setVoucher({ ...voucher, type: e.target.value as any })}
                                        >
                                            <option value="percentage">Percentage off</option>
                                            <option value="fixed">Fixed amount off (EGP)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{voucher.type === 'percentage' ? 'Percentage (%)' : 'Amount (EGP)'}</Label>
                                        <Input
                                            type="number"
                                            value={voucher.value}
                                            onChange={e => setVoucher({ ...voucher, value: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Minimum delivered order (EGP, 0 = always issue)</Label>
                                        <Input
                                            type="number"
                                            value={voucher.minOrderAmountToTrigger}
                                            onChange={e => setVoucher({ ...voucher, minOrderAmountToTrigger: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Voucher expires after (days)</Label>
                                        <Input
                                            type="number"
                                            value={voucher.expiresInDays}
                                            onChange={e => setVoucher({ ...voucher, expiresInDays: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t p-4 z-50 flex items-center justify-end">
                <Button
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="rounded-full px-10 shadow-lg shadow-red-500/20 bg-red-600 hover:bg-red-700"
                >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
                </Button>
            </div>
        </div>
    );
}
