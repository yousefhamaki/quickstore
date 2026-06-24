'use client';

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateCampaign, getPublicCampaign } from "@shared/lib/api/offers";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, LayoutTemplate, Settings2, PackagePlus, Search, X, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { getProducts, getProductById } from "@shared/services/productService";

function ProductSelector({ 
    storeId, 
    selectedProduct, 
    onSelect, 
    onRemove, 
    placeholder = "Search product by name..." 
}: { 
    storeId: string; 
    selectedProduct: any; 
    onSelect: (prod: any) => void; 
    onRemove: () => void; 
    placeholder?: string; 
}) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [searching, setSearching] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!query.trim()) return;
        const delay = setTimeout(async () => {
            setSearching(true);
            try {
                const res = (await getProducts({
                    search: query,
                    storeId,
                    limit: 5,
                    status: 'active'
                })) as any;
                setResults(res.products || []);
            } catch (err) {
                console.error(err);
            } finally {
                setSearching(false);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [query, storeId]);

    const handleFocus = async () => {
        setOpen(true);
        if (!query && results.length === 0) {
            setSearching(true);
            try {
                const res = (await getProducts({
                    storeId,
                    limit: 5,
                    status: 'active'
                })) as any;
                setResults(res.products || []);
            } catch (err) {
                console.error(err);
            } finally {
                setSearching(false);
            }
        }
    };

    return (
        <div className="relative">
            {selectedProduct ? (
                <div className="flex items-center justify-between p-4 bg-muted/30 border border-border rounded-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden border flex-shrink-0">
                            {selectedProduct.images?.[0]?.url ? (
                                <img src={selectedProduct.images[0].url} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 bg-muted">
                                    <Package className="w-6 h-6" />
                                </div>
                            )}
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground text-sm">{selectedProduct.name}</h4>
                            <p className="text-xs text-muted-foreground">{selectedProduct.price?.toLocaleString()} EGP</p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onRemove}
                        className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-bold uppercase text-xs"
                    >
                        Remove
                    </Button>
                </div>
            ) : (
                <div className="relative">
                    <div className="relative z-10">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input 
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={handleFocus}
                            placeholder={placeholder} 
                            className="pl-10 h-12 pr-10"
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
                        )}
                    </div>
                    {open && (
                        <>
                            <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
                            <div className="absolute z-20 w-full mt-2 bg-background border rounded-xl shadow-lg max-h-48 overflow-y-auto p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                {results.length === 0 && !searching ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        No products found
                                    </div>
                                ) : (
                                    results.map((product) => (
                                        <button
                                            key={product._id}
                                            type="button"
                                            onClick={() => {
                                                onSelect(product);
                                                setQuery('');
                                                setResults([]);
                                                setOpen(false);
                                            }}
                                            className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted text-left transition-colors"
                                        >
                                            <div className="w-8 h-8 rounded overflow-hidden border flex-shrink-0 bg-muted">
                                                {product.images?.[0]?.url ? (
                                                    <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                                                        <Package className="w-4 h-4" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-xs truncate text-foreground">{product.name}</p>
                                                <p className="text-[10px] text-muted-foreground">{product.price?.toLocaleString()} EGP</p>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function EditCampaignWizard({ params }: { params: Promise<{ storeId: string; campaignId: string }> }) {
    const { storeId, campaignId } = use(params);
    const router = useRouter();
    
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        type: 'upsell',
        triggerEvent: 'product_page',
        priority: 100,
        placement: 'product_page',
        priorityGroup: 'normal',
        allowStacking: true,
        exclusiveCampaign: false,
        offerProductId: '',
        discountType: 'percentage',
        discountValue: 10,
        displayTitle: 'Upgrade Your Order',
        displaySubtitle: 'Special one-time offer',
        callToActionText: 'Yes, add to my order',
        declineText: 'No thanks'
    });

    const [pricingTiers, setPricingTiers] = useState<{ quantity: number; totalPrice: number }[]>([
        { quantity: 1, totalPrice: 0 },
        { quantity: 2, totalPrice: 200 },
        { quantity: 3, totalPrice: 280 }
    ]);
    const [shippingFeeInput, setShippingFeeInput] = useState<string>('');

    const [bogoConfig, setBogoConfig] = useState({
        triggerProductId: '',
        triggerQuantity: 1,
        rewardProductId: '',
        rewardQuantity: 1,
        discountType: 'percentage',
        discountValue: 100
    });

    const [volumeTiers, setVolumeTiers] = useState<{ quantity: number; discountType: string; discountValue: number }[]>([
        { quantity: 2, discountType: 'percentage', discountValue: 10 }
    ]);

    const [thresholdConfig, setThresholdConfig] = useState({
        minSubtotal: 1000,
        rewardProductId: '',
        rewardQuantity: 1,
        discountType: 'percentage',
        discountValue: 100
    });

    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [bogoTriggerProduct, setBogoTriggerProduct] = useState<any | null>(null);
    const [bogoRewardProduct, setBogoRewardProduct] = useState<any | null>(null);
    const [thresholdRewardProduct, setThresholdRewardProduct] = useState<any | null>(null);

    const updateForm = (key: string, value: any) => setFormData(p => ({ ...p, [key]: value }));

    // Load campaign details on mount
    useEffect(() => {
        if (!campaignId || !storeId) return;
        setIsLoading(true);
        getPublicCampaign(campaignId, storeId)
            .then((camp: any) => {
                if (camp) {
                    setFormData({
                        name: camp.name || '',
                        type: camp.type || 'upsell',
                        triggerEvent: camp.trigger?.event || 'product_page',
                        priority: camp.priority ?? 100,
                        placement: camp.placement || 'product_page',
                        priorityGroup: camp.priorityGroup || 'normal',
                        allowStacking: camp.allowStacking ?? true,
                        exclusiveCampaign: camp.exclusiveCampaign ?? false,
                        offerProductId: camp.offerProducts?.[0]?.productId || '',
                        discountType: camp.offerProducts?.[0]?.discountType || 'percentage',
                        discountValue: camp.offerProducts?.[0]?.discountValue || 10,
                        displayTitle: camp.display?.headline || 'Upgrade Your Order',
                        displaySubtitle: camp.display?.description || 'Special one-time offer',
                        callToActionText: camp.display?.ctaText || 'Yes, add to my order',
                        declineText: camp.display?.dismissText || 'No thanks'
                    });

                    if (camp.offerProducts?.[0]?.productId) {
                        getProductById(camp.offerProducts[0].productId)
                            .then((res: any) => {
                                const prod = res?.product || res;
                                if (prod) setSelectedProduct(prod);
                            });
                    }

                    if (camp.type === 'offer_page' && camp.pricingTiers) {
                        setPricingTiers(camp.pricingTiers);
                        if (camp.shippingFee !== undefined) {
                            setShippingFeeInput(camp.shippingFee.toString());
                        }
                    }

                    if (camp.type === 'bogo' && camp.bogoConfig) {
                        const bc = camp.bogoConfig;
                        setBogoConfig({
                            triggerProductId: bc.triggerProductIds?.[0] || '',
                            triggerQuantity: bc.triggerQuantity || 1,
                            rewardProductId: bc.rewardProductId || '',
                            rewardQuantity: bc.rewardQuantity || 1,
                            discountType: bc.discountType || 'percentage',
                            discountValue: bc.discountValue || 100
                        });

                        if (bc.triggerProductIds?.[0]) {
                            getProductById(bc.triggerProductIds[0]).then((res: any) => {
                                const prod = res?.product || res;
                                if (prod) setBogoTriggerProduct(prod);
                            });
                        }
                        if (bc.rewardProductId) {
                            getProductById(bc.rewardProductId).then((res: any) => {
                                const prod = res?.product || res;
                                if (prod) setBogoRewardProduct(prod);
                            });
                        }
                    }

                    if (camp.type === 'volume_discount' && camp.volumeDiscountTiers) {
                        setVolumeTiers(camp.volumeDiscountTiers);
                    }

                    if (camp.type === 'cart_threshold' && camp.thresholdConfig) {
                        const tc = camp.thresholdConfig;
                        const rw = tc.rewards?.[0];
                        setThresholdConfig({
                            minSubtotal: tc.minSubtotal || 1000,
                            rewardProductId: rw?.rewardProductId || '',
                            rewardQuantity: rw?.rewardQuantity || 1,
                            discountType: rw?.discountType || 'percentage',
                            discountValue: rw?.discountValue || 100
                        });

                        if (rw?.rewardProductId) {
                            getProductById(rw.rewardProductId).then((res: any) => {
                                const prod = res?.product || res;
                                if (prod) setThresholdRewardProduct(prod);
                            });
                        }
                    }
                }
            })
            .catch(err => {
                console.error("Failed to load campaign", err);
                toast.error("Failed to load campaign data");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [campaignId, storeId]);

    const handleSubmit = async () => {
        setIsSaving(true);
        try {
            const payload: any = {
                storeId,
                name: formData.name,
                type: formData.type,
                placement: formData.placement,
                priority: Number(formData.priority),
                priorityGroup: formData.priorityGroup,
                allowStacking: formData.allowStacking,
                exclusiveCampaign: formData.exclusiveCampaign,
                trigger: {
                    event: formData.type === 'offer_page' ? 'product_page' : formData.triggerEvent,
                    conditions: {}
                },
                offerProducts: [],
                display: {
                    headline: formData.displayTitle,
                    description: formData.displaySubtitle,
                    ctaText: formData.type === 'offer_page' ? (formData.callToActionText || 'Confirm Order') : formData.callToActionText,
                    dismissText: formData.type === 'offer_page' ? (formData.declineText || 'No thanks') : formData.declineText
                }
            };

            if (['upsell', 'cross_sell', 'down_sell'].includes(formData.type)) {
                payload.offerProducts = [
                    {
                        productId: formData.offerProductId,
                        discountType: formData.discountType === 'override' ? 'none' : formData.discountType,
                        discountValue: formData.discountType === 'override' ? 0 : Number(formData.discountValue),
                        ...(formData.discountType === 'override' ? { overridePrice: Number(formData.discountValue) } : {}),
                        quantity: 1,
                        displayOrder: 1
                    }
                ];
            }

            if (formData.type === 'offer_page') {
                payload.offerProducts = [
                    {
                        productId: formData.offerProductId,
                        discountType: 'none',
                        discountValue: 0,
                        quantity: 1,
                        displayOrder: 1
                    }
                ];
                payload.pricingTiers = pricingTiers.map(t => ({
                    quantity: Number(t.quantity),
                    totalPrice: Number(t.totalPrice)
                }));
                if (shippingFeeInput.trim() !== '') {
                    payload.shippingFee = Number(shippingFeeInput);
                }
            }

            if (formData.type === 'bogo') {
                payload.bogoConfig = {
                    triggerProductIds: [bogoConfig.triggerProductId],
                    triggerQuantity: Number(bogoConfig.triggerQuantity),
                    rewardProductId: bogoConfig.rewardProductId,
                    rewardQuantity: Number(bogoConfig.rewardQuantity),
                    discountType: bogoConfig.discountType,
                    discountValue: Number(bogoConfig.discountValue)
                };
            }

            if (formData.type === 'volume_discount') {
                payload.volumeDiscountTiers = volumeTiers.map(t => ({
                    quantity: Number(t.quantity),
                    discountType: t.discountType,
                    discountValue: Number(t.discountValue)
                }));
            }

            if (formData.type === 'cart_threshold') {
                payload.thresholdConfig = {
                    minSubtotal: Number(thresholdConfig.minSubtotal),
                    rewards: [{
                        rewardProductId: thresholdConfig.rewardProductId,
                        rewardQuantity: Number(thresholdConfig.rewardQuantity),
                        discountType: thresholdConfig.discountType,
                        discountValue: Number(thresholdConfig.discountValue)
                    }]
                };
            }
            
            await updateCampaign(campaignId, payload);
            toast.success('Campaign updated successfully!');
            router.push(`/dashboard/stores/${storeId}/offers`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to update campaign');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-muted-foreground font-semibold">Loading campaign details...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon" className="rounded-full">
                    <Link href={`/dashboard/stores/${storeId}/offers`}>
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter">Edit Campaign</h1>
                    <p className="text-muted-foreground font-medium">Modify conversion-optimized settings</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-muted -z-10" />
                {[
                    { n: 1, l: 'Basics', i: <Settings2 size={18} /> },
                    { n: 2, l: 'Offer details', i: <PackagePlus size={18} /> },
                    { n: 3, l: 'Display', i: <LayoutTemplate size={18} /> }
                ].map((s) => (
                    <div key={s.n} className="flex flex-col items-center gap-2 bg-background px-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                            step >= s.n ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-card text-muted-foreground'
                        }`}>
                            {s.i}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">{s.l}</span>
                    </div>
                ))}
            </div>

            <div className="bg-card border rounded-[32px] p-8 shadow-sm">
                {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-bold">Campaign Basics</h2>
                        
                        <div className="space-y-2">
                            <Label>Campaign Name (Internal)</Label>
                            <Input 
                                value={formData.name}
                                onChange={(e) => updateForm('name', e.target.value)}
                                placeholder="e.g. Summer Checkout Upsell" 
                                className="h-12"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Offer Type</Label>
                                <select 
                                    value={formData.type}
                                    onChange={(e) => updateForm('type', e.target.value)}
                                    className="w-full h-12 rounded-md border border-input bg-background px-3"
                                >
                                    <option value="upsell">Upsell (Upgrade/Replace)</option>
                                    <option value="cross_sell">Cross-sell (Add-on)</option>
                                    <option value="down_sell">Down-sell (Alternative)</option>
                                    <option value="volume_discount">Volume Discount (Tiers)</option>
                                    <option value="bogo">BOGO (Buy X Get Y)</option>
                                    <option value="cart_threshold">Cart Threshold Promotion</option>
                                    <option value="offer_page">Offer Page (Direct Checkout & Tiers)</option>
                                </select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Placement</Label>
                                <select 
                                    value={formData.placement}
                                    onChange={(e) => updateForm('placement', e.target.value)}
                                    className="w-full h-12 rounded-md border border-input bg-background px-3"
                                >
                                    <option value="product_page">Product Page</option>
                                    <option value="cart">Cart Drawer/Page</option>
                                    <option value="checkout">Checkout Flow</option>
                                    <option value="post_purchase">Post Purchase Offer</option>
                                    <option value="standalone">Standalone Landing Page</option>
                                </select>
                            </div>
                        </div>

                        {formData.type !== 'offer_page' && (
                            <div className="space-y-2">
                                <Label>Trigger Event</Label>
                                <select 
                                    value={formData.triggerEvent}
                                    onChange={(e) => updateForm('triggerEvent', e.target.value)}
                                    className="w-full h-12 rounded-md border border-input bg-background px-3"
                                >
                                    <option value="product_page">On Product Page Load</option>
                                    <option value="cart_view">On Cart View</option>
                                    <option value="checkout_start">On Checkout Start</option>
                                    <option value="checkout_abandon">On Exit Intent</option>
                                    <option value="post_purchase">Post Purchase</option>
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label>Priority Group</Label>
                                <select 
                                    value={formData.priorityGroup}
                                    onChange={(e) => updateForm('priorityGroup', e.target.value)}
                                    className="w-full h-12 rounded-md border border-input bg-background px-3"
                                >
                                    <option value="critical">Critical (Always Evaluated First)</option>
                                    <option value="high">High</option>
                                    <option value="normal">Normal</option>
                                    <option value="low">Low (Evaluated Last)</option>
                                </select>
                            </div>
                            
                            <div className="space-y-2">
                                <Label>Priority Level (numeric)</Label>
                                <Input 
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) => updateForm('priority', Number(e.target.value))}
                                    placeholder="e.g. 100" 
                                    className="h-12"
                                />
                            </div>
                        </div>

                        <div className="flex gap-8 border-t pt-4">
                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => updateForm('allowStacking', !formData.allowStacking)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                                        formData.allowStacking ? 'bg-primary' : 'bg-muted'
                                    }`}
                                >
                                    <div className={`w-4 h-4 bg-background rounded-full transition-transform duration-200 ${
                                        formData.allowStacking ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                                <div>
                                    <Label className="font-bold cursor-pointer" onClick={() => updateForm('allowStacking', !formData.allowStacking)}>Allow Stacking</Label>
                                    <p className="text-xs text-muted-foreground font-medium">Allows other campaigns to apply alongside this one.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => updateForm('exclusiveCampaign', !formData.exclusiveCampaign)}
                                    className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                                        formData.exclusiveCampaign ? 'bg-primary' : 'bg-muted'
                                    }`}
                                >
                                    <div className={`w-4 h-4 bg-background rounded-full transition-transform duration-200 ${
                                        formData.exclusiveCampaign ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                                </button>
                                <div>
                                    <Label className="font-bold cursor-pointer" onClick={() => updateForm('exclusiveCampaign', !formData.exclusiveCampaign)}>Exclusive Campaign</Label>
                                    <p className="text-xs text-muted-foreground font-medium">Disables all other campaigns if this campaign qualifies.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-bold">Offer Configuration</h2>

                        {['upsell', 'cross_sell', 'down_sell', 'offer_page'].includes(formData.type) && (
                            <div className="space-y-4">
                                <Label>Offer Product</Label>
                                <ProductSelector
                                    storeId={storeId}
                                    selectedProduct={selectedProduct}
                                    onSelect={(prod) => {
                                        setSelectedProduct(prod);
                                        updateForm('offerProductId', prod._id);
                                    }}
                                    onRemove={() => {
                                        setSelectedProduct(null);
                                        updateForm('offerProductId', '');
                                    }}
                                    placeholder="Select campaign product..."
                                />

                                {formData.type === 'offer_page' ? (
                                    <div className="space-y-6 border-t pt-4">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Label className="text-base font-bold">Pricing Tiers (Egypt Bundles)</Label>
                                                    <p className="text-xs text-muted-foreground font-medium">Set total bundle prices for each quantity.</p>
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => setPricingTiers(p => [...p, { quantity: p.length + 1, totalPrice: 0 }])}
                                                    className="rounded-full h-9 px-4 font-bold text-xs uppercase"
                                                >
                                                    + Add Tier
                                                </Button>
                                            </div>
                                            
                                            <div className="space-y-3">
                                                {pricingTiers.map((tier, idx) => (
                                                    <div key={idx} className="flex gap-4 items-center">
                                                        <div className="flex-1 space-y-1">
                                                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Quantity</span>
                                                            <Input 
                                                                type="number"
                                                                value={tier.quantity}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setPricingTiers(p => p.map((t, i) => i === idx ? { ...t, quantity: val } : t));
                                                                }}
                                                                className="h-11"
                                                                placeholder="Qty"
                                                                min="1"
                                                            />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Total Price (EGP)</span>
                                                            <Input 
                                                                type="number"
                                                                value={tier.totalPrice}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setPricingTiers(p => p.map((t, i) => i === idx ? { ...t, totalPrice: val } : t));
                                                                }}
                                                                className="h-11"
                                                                placeholder="Total Price"
                                                                min="0"
                                                            />
                                                        </div>
                                                        {pricingTiers.length > 1 && (
                                                            <Button 
                                                                type="button" 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="text-red-500 hover:text-red-700 mt-5 shrink-0 font-bold uppercase text-[10px]"
                                                                onClick={() => setPricingTiers(p => p.filter((_, i) => i !== idx))}
                                                            >
                                                                Delete
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2 border-t pt-4">
                                            <Label>Custom Shipping Fee Override (EGP) - Optional</Label>
                                            <Input 
                                                type="number"
                                                value={shippingFeeInput}
                                                onChange={(e) => setShippingFeeInput(e.target.value)}
                                                placeholder="e.g. 20 (leave empty to use store default)" 
                                                className="h-12"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                        <div className="space-y-2">
                                            <Label>Discount Type</Label>
                                            <select 
                                                value={formData.discountType}
                                                onChange={(e) => updateForm('discountType', e.target.value)}
                                                className="w-full h-12 rounded-md border border-input bg-background px-3"
                                            >
                                                <option value="percentage">% Off</option>
                                                <option value="fixed">Fixed Amount Off</option>
                                                <option value="override">Override Price To</option>
                                                <option value="none">No Discount</option>
                                            </select>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <Label>Discount Value</Label>
                                            <Input 
                                                type="number"
                                                value={formData.discountValue}
                                                onChange={(e) => updateForm('discountValue', e.target.value)}
                                                className="h-12"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {formData.type === 'bogo' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-4">
                                    <Label className="text-base font-bold">1. Buy Trigger Product</Label>
                                    <ProductSelector
                                        storeId={storeId}
                                        selectedProduct={bogoTriggerProduct}
                                        onSelect={(prod) => {
                                            setBogoTriggerProduct(prod);
                                            setBogoConfig(p => ({ ...p, triggerProductId: prod._id }));
                                        }}
                                        onRemove={() => {
                                            setBogoTriggerProduct(null);
                                            setBogoConfig(p => ({ ...p, triggerProductId: '' }));
                                        }}
                                        placeholder="Search trigger product..."
                                    />
                                    <div className="space-y-2">
                                        <Label>Required Trigger Quantity</Label>
                                        <Input
                                            type="number"
                                            value={bogoConfig.triggerQuantity}
                                            onChange={(e) => setBogoConfig(p => ({ ...p, triggerQuantity: Number(e.target.value) }))}
                                            className="h-11"
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <Label className="text-base font-bold">2. Get Reward Product</Label>
                                    <ProductSelector
                                        storeId={storeId}
                                        selectedProduct={bogoRewardProduct}
                                        onSelect={(prod) => {
                                            setBogoRewardProduct(prod);
                                            setBogoConfig(p => ({ ...p, rewardProductId: prod._id }));
                                        }}
                                        onRemove={() => {
                                            setBogoRewardProduct(null);
                                            setBogoConfig(p => ({ ...p, rewardProductId: '' }));
                                        }}
                                        placeholder="Search reward product..."
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Reward Quantity</Label>
                                            <Input
                                                type="number"
                                                value={bogoConfig.rewardQuantity}
                                                onChange={(e) => setBogoConfig(p => ({ ...p, rewardQuantity: Number(e.target.value) }))}
                                                className="h-11"
                                                min="1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Reward Discount Type</Label>
                                            <select
                                                value={bogoConfig.discountType}
                                                onChange={(e) => setBogoConfig(p => ({ ...p, discountType: e.target.value }))}
                                                className="w-full h-11 rounded-md border border-input bg-background px-3"
                                            >
                                                <option value="percentage">% Off</option>
                                                <option value="fixed">Fixed Amount Off</option>
                                                <option value="override">Override Price To</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reward Discount Value (use 100 for 100% free gift)</Label>
                                        <Input
                                            type="number"
                                            value={bogoConfig.discountValue}
                                            onChange={(e) => setBogoConfig(p => ({ ...p, discountValue: Number(e.target.value) }))}
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {formData.type === 'volume_discount' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <Label className="text-base font-bold">Volume Discount Tiers</Label>
                                        <p className="text-xs text-muted-foreground font-medium">Add quantity discounts (e.g. Buy 2 get 10% off).</p>
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => setVolumeTiers(p => [...p, { quantity: p.length + 2, discountType: 'percentage', discountValue: 10 }])}
                                        className="rounded-full h-9 px-4 font-bold text-xs uppercase"
                                    >
                                        + Add Tier
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {volumeTiers.map((tier, idx) => (
                                        <div key={idx} className="flex gap-4 items-end border p-4 rounded-2xl bg-muted/25">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs">Min Quantity</Label>
                                                <Input 
                                                    type="number"
                                                    value={tier.quantity}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setVolumeTiers(p => p.map((t, i) => i === idx ? { ...t, quantity: val } : t));
                                                    }}
                                                    className="h-11"
                                                    min="1"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs">Discount Type</Label>
                                                <select 
                                                    value={tier.discountType}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setVolumeTiers(p => p.map((t, i) => i === idx ? { ...t, discountType: val } : t));
                                                    }}
                                                    className="w-full h-11 rounded-md border border-input bg-background px-3"
                                                >
                                                    <option value="percentage">% Off</option>
                                                    <option value="fixed">Fixed Amount Off</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs">Discount Value</Label>
                                                <Input 
                                                    type="number"
                                                    value={tier.discountValue}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        setVolumeTiers(p => p.map((t, i) => i === idx ? { ...t, discountValue: val } : t));
                                                    }}
                                                    className="h-11"
                                                    min="0"
                                                />
                                            </div>
                                            {volumeTiers.length > 1 && (
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="sm" 
                                                    className="text-rose-500 hover:text-rose-700 font-bold uppercase text-[10px] h-11 px-2"
                                                    onClick={() => setVolumeTiers(p => p.filter((_, i) => i !== idx))}
                                                >
                                                    Delete
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.type === 'cart_threshold' && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="space-y-2">
                                    <Label className="text-base font-bold">Minimum Subtotal Threshold (EGP)</Label>
                                    <Input
                                        type="number"
                                        value={thresholdConfig.minSubtotal}
                                        onChange={(e) => setThresholdConfig(p => ({ ...p, minSubtotal: Number(e.target.value) }))}
                                        className="h-12"
                                        min="1"
                                    />
                                    <p className="text-xs text-muted-foreground font-medium">Offers rewards when the customer's cart subtotal exceeds this amount.</p>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <Label className="text-base font-bold">Reward Product / Free Gift</Label>
                                    <ProductSelector
                                        storeId={storeId}
                                        selectedProduct={thresholdRewardProduct}
                                        onSelect={(prod) => {
                                            setThresholdRewardProduct(prod);
                                            setThresholdConfig(p => ({ ...p, rewardProductId: prod._id }));
                                        }}
                                        onRemove={() => {
                                            setThresholdRewardProduct(null);
                                            setThresholdConfig(p => ({ ...p, rewardProductId: '' }));
                                        }}
                                        placeholder="Search reward product..."
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Reward Quantity</Label>
                                            <Input
                                                type="number"
                                                value={thresholdConfig.rewardQuantity}
                                                onChange={(e) => setThresholdConfig(p => ({ ...p, rewardQuantity: Number(e.target.value) }))}
                                                className="h-11"
                                                min="1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Reward Discount Type</Label>
                                            <select
                                                value={thresholdConfig.discountType}
                                                onChange={(e) => setThresholdConfig(p => ({ ...p, discountType: e.target.value }))}
                                                className="w-full h-11 rounded-md border border-input bg-background px-3"
                                            >
                                                <option value="percentage">% Off</option>
                                                <option value="fixed">Fixed Amount Off</option>
                                                <option value="override">Override Price To</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Reward Discount Value (use 100 for 100% free gift)</Label>
                                        <Input
                                            type="number"
                                            value={thresholdConfig.discountValue}
                                            onChange={(e) => setThresholdConfig(p => ({ ...p, discountValue: Number(e.target.value) }))}
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-bold">Customer Facing Display</h2>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Headline / Title</Label>
                                <Input 
                                    value={formData.displayTitle}
                                    onChange={(e) => updateForm('displayTitle', e.target.value)}
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Subtitle (Optional)</Label>
                                <Input 
                                    value={formData.displaySubtitle}
                                    onChange={(e) => updateForm('displaySubtitle', e.target.value)}
                                    className="h-12"
                                />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Accept Button Text</Label>
                                    <Input 
                                        value={formData.callToActionText}
                                        onChange={(e) => updateForm('callToActionText', e.target.value)}
                                        className="h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Decline Button Text</Label>
                                    <Input 
                                        value={formData.declineText}
                                        onChange={(e) => updateForm('declineText', e.target.value)}
                                        className="h-12"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Controls */}
                <div className="flex justify-between mt-12 pt-8 border-t">
                    <Button 
                        variant="outline" 
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1 || isSaving}
                        className="h-12 px-6"
                    >
                        Back
                    </Button>

                    {step < 3 ? (
                        <Button 
                            onClick={() => setStep(s => Math.min(3, s + 1))}
                            className="h-12 px-8 rounded-full"
                        >
                            Next Step <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                    ) : (
                        <Button 
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90"
                        >
                            {isSaving ? 'Saving...' : (
                                <><Save className="mr-2 w-4 h-4" /> Save Campaign Changes</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
