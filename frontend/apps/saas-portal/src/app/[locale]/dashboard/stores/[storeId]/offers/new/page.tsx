'use client';

import { use, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createCampaign } from "@shared/lib/api/offers";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";
import { Label } from "@shared/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save, LayoutTemplate, Settings2, PackagePlus, Search, X, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getProducts, getProductById } from "@shared/services/productService";
import { imagePreset } from "@shared/lib/cloudinaryImage";

function ProductSelector({
    storeId,
    selectedProduct,
    onSelect,
    onRemove,
    placeholder
}: {
    storeId: string; 
    selectedProduct: any; 
    onSelect: (prod: any) => void; 
    onRemove: () => void; 
    placeholder?: string;
}) {
    const t = useTranslations("merchant.marketing.offers.form.offerDetails");
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
                                <img src={imagePreset.thumbnail(selectedProduct.images[0].url)} alt="" loading="lazy" decoding="async" width={100} height={100} className="w-full h-full object-cover" />
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
                        {t("removeProduct")}
                    </Button>
                </div>
            ) : (
                <div className="relative">
                    <div className="relative z-10">
                        <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onFocus={handleFocus}
                            placeholder={placeholder ?? t("searchProductPlaceholder")}
                            className="pl-10 pr-10 h-12"
                        />
                        {searching && (
                            <Loader2 className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 animate-spin" />
                        )}
                    </div>
                    {open && (
                        <>
                            <div className="fixed inset-0 z-0" onClick={() => setOpen(false)} />
                            <div className="absolute z-20 w-full mt-2 bg-background border rounded-xl shadow-lg max-h-48 overflow-y-auto p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                                {results.length === 0 && !searching ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        {t("noProductsFound")}
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
                                                    <img src={imagePreset.thumbnail(product.images[0].url)} alt="" loading="lazy" decoding="async" width={100} height={100} className="w-full h-full object-cover" />
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

export default function NewCampaignWizard({ params }: { params: Promise<{ storeId: string }> }) {
    const { storeId } = use(params);
    const router = useRouter();
    const t = useTranslations("merchant.marketing.offers.form");

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        type: 'upsell',
        triggerEvent: 'product_page',
        priority: 100,
        placement: 'product_page',
        priorityGroup: 'normal',
        allowStacking: true,
        exclusiveCampaign: false,
        // Single product for simplicity in this wizard
        offerProductId: '',
        discountType: 'percentage',
        discountValue: 10,
        // Display options
        displayTitle: t('display.defaultHeadline'),
        displaySubtitle: t('display.defaultSubtitle'),
        callToActionText: t('display.defaultAcceptText'),
        declineText: t('display.defaultDeclineText')
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

    // Preload product if offerProductId is provided (useful for edit mode or initial state)
    useEffect(() => {
        if (formData.offerProductId && !selectedProduct) {
            getProductById(formData.offerProductId)
                .then((res: any) => {
                    const prod = res?.product || res;
                    if (prod) {
                        setSelectedProduct(prod);
                    }
                })
                .catch(err => {
                    console.error("Failed to preload product", err);
                });
        }
    }, [formData.offerProductId, selectedProduct]);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const payload: any = {
                storeId,
                name: formData.name,
                type: formData.type,
                status: 'active',
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
            
            await createCampaign(payload);
            toast.success(t('createSuccess'));
            router.push(`/dashboard/stores/${storeId}/offers`);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || t('createError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center gap-4">
                <Button asChild variant="ghost" size="icon" className="rounded-full">
                    <Link href={`/dashboard/stores/${storeId}/offers`}>
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-black tracking-tighter">{t('newTitle')}</h1>
                    <p className="text-muted-foreground font-medium">{t('newSubtitle')}</p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-muted -z-10" />
                {[
                    { n: 1, l: t('stepBasics'), i: <Settings2 size={18} /> },
                    { n: 2, l: t('stepOfferDetails'), i: <PackagePlus size={18} /> },
                    { n: 3, l: t('stepDisplay'), i: <LayoutTemplate size={18} /> }
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
                        <h2 className="text-2xl font-bold">{t('basics.heading')}</h2>

                        <div className="space-y-2">
                            <Label>{t('basics.campaignName')}</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => updateForm('name', e.target.value)}
                                placeholder={t('basics.campaignNamePlaceholder')}
                                className="h-12"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('basics.offerType')}</Label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => updateForm('type', e.target.value)}
                                    className="w-full h-12 rounded-md border border-input bg-background px-3"
                                >
                                    <option value="upsell">{t('basics.types.upsell')}</option>
                                    <option value="cross_sell">{t('basics.types.cross_sell')}</option>
                                    <option value="down_sell">{t('basics.types.down_sell')}</option>
                                    <option value="volume_discount">{t('basics.types.volume_discount')}</option>
                                    <option value="bogo">{t('basics.types.bogo')}</option>
                                    <option value="cart_threshold">{t('basics.types.cart_threshold')}</option>
                                    <option value="offer_page">{t('basics.types.offer_page')}</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('basics.placement')}</Label>
                                <select
                                    value={formData.placement}
                                    onChange={(e) => updateForm('placement', e.target.value)}
                                    className="w-full h-12 rounded-md border border-input bg-background px-3"
                                >
                                    <option value="product_page">{t('basics.placements.product_page')}</option>
                                    <option value="cart">{t('basics.placements.cart')}</option>
                                    <option value="checkout">{t('basics.placements.checkout')}</option>
                                    <option value="post_purchase">{t('basics.placements.post_purchase')}</option>
                                    <option value="standalone">{t('basics.placements.standalone')}</option>
                                </select>
                            </div>
                        </div>

                        {formData.type !== 'offer_page' && (
                            <div className="space-y-2">
                                <Label>{t('basics.triggerEvent')}</Label>
                                <select
                                    value={formData.triggerEvent}
                                    onChange={(e) => updateForm('triggerEvent', e.target.value)}
                                    className="w-full h-12 rounded-md border border-input bg-background px-3"
                                >
                                    <option value="product_page">{t('basics.triggerEvents.product_page')}</option>
                                    <option value="cart_view">{t('basics.triggerEvents.cart_view')}</option>
                                    <option value="checkout_start">{t('basics.triggerEvents.checkout_start')}</option>
                                    <option value="checkout_abandon">{t('basics.triggerEvents.checkout_abandon')}</option>
                                    <option value="post_purchase">{t('basics.triggerEvents.post_purchase')}</option>
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label>{t('basics.priorityGroup')}</Label>
                                <select
                                    value={formData.priorityGroup}
                                    onChange={(e) => updateForm('priorityGroup', e.target.value)}
                                    className="w-full h-12 rounded-md border border-input bg-background px-3"
                                >
                                    <option value="critical">{t('basics.priorityGroups.critical')}</option>
                                    <option value="high">{t('basics.priorityGroups.high')}</option>
                                    <option value="normal">{t('basics.priorityGroups.normal')}</option>
                                    <option value="low">{t('basics.priorityGroups.low')}</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label>{t('basics.priorityLevel')}</Label>
                                <Input
                                    type="number"
                                    value={formData.priority}
                                    onChange={(e) => updateForm('priority', Number(e.target.value))}
                                    placeholder={t('basics.priorityPlaceholder')}
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
                                    <Label className="font-bold cursor-pointer" onClick={() => updateForm('allowStacking', !formData.allowStacking)}>{t('basics.allowStacking')}</Label>
                                    <p className="text-xs text-muted-foreground font-medium">{t('basics.allowStackingDesc')}</p>
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
                                    <Label className="font-bold cursor-pointer" onClick={() => updateForm('exclusiveCampaign', !formData.exclusiveCampaign)}>{t('basics.exclusiveCampaign')}</Label>
                                    <p className="text-xs text-muted-foreground font-medium">{t('basics.exclusiveCampaignDesc')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                        <h2 className="text-2xl font-bold">{t('offerDetails.heading')}</h2>

                        {['upsell', 'cross_sell', 'down_sell', 'offer_page'].includes(formData.type) && (
                            <div className="space-y-4">
                                <Label>{t('offerDetails.offerProduct')}</Label>
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
                                    placeholder={t('offerDetails.selectProductPlaceholder')}
                                />

                                {formData.type === 'offer_page' ? (
                                    <div className="space-y-6 border-t pt-4">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <Label className="text-base font-bold">{t('offerDetails.offerPage.pricingTiersLabel')}</Label>
                                                    <p className="text-xs text-muted-foreground font-medium">{t('offerDetails.offerPage.pricingTiersDesc')}</p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setPricingTiers(p => [...p, { quantity: p.length + 1, totalPrice: 0 }])}
                                                    className="rounded-full h-9 px-4 font-bold text-xs uppercase"
                                                >
                                                    {t('offerDetails.offerPage.addTier')}
                                                </Button>
                                            </div>

                                            <div className="space-y-3">
                                                {pricingTiers.map((tier, idx) => (
                                                    <div key={idx} className="flex gap-4 items-center">
                                                        <div className="flex-1 space-y-1">
                                                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{t('offerDetails.offerPage.quantity')}</span>
                                                            <Input
                                                                type="number"
                                                                value={tier.quantity}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setPricingTiers(p => p.map((t, i) => i === idx ? { ...t, quantity: val } : t));
                                                                }}
                                                                className="h-11"
                                                                placeholder={t('offerDetails.offerPage.quantityPlaceholder')}
                                                                min="1"
                                                            />
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">{t('offerDetails.offerPage.totalPrice')}</span>
                                                            <Input
                                                                type="number"
                                                                value={tier.totalPrice}
                                                                onChange={(e) => {
                                                                    const val = Number(e.target.value);
                                                                    setPricingTiers(p => p.map((t, i) => i === idx ? { ...t, totalPrice: val } : t));
                                                                }}
                                                                className="h-11"
                                                                placeholder={t('offerDetails.offerPage.totalPricePlaceholder')}
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
                                                                {t('offerDetails.offerPage.delete')}
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2 border-t pt-4">
                                            <Label>{t('offerDetails.offerPage.shippingFeeLabel')}</Label>
                                            <Input
                                                type="number"
                                                value={shippingFeeInput}
                                                onChange={(e) => setShippingFeeInput(e.target.value)}
                                                placeholder={t('offerDetails.offerPage.shippingFeePlaceholder')}
                                                className="h-12"
                                                min="0"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-4 border-t pt-4">
                                        <div className="space-y-2">
                                            <Label>{t('offerDetails.discountType')}</Label>
                                            <select
                                                value={formData.discountType}
                                                onChange={(e) => updateForm('discountType', e.target.value)}
                                                className="w-full h-12 rounded-md border border-input bg-background px-3"
                                            >
                                                <option value="percentage">{t('offerDetails.discountTypes.percentage')}</option>
                                                <option value="fixed">{t('offerDetails.discountTypes.fixed')}</option>
                                                <option value="override">{t('offerDetails.discountTypes.override')}</option>
                                                <option value="none">{t('offerDetails.discountTypes.none')}</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>{t('offerDetails.discountValue')}</Label>
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
                                    <Label className="text-base font-bold">{t('offerDetails.bogo.buyTrigger')}</Label>
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
                                        placeholder={t('offerDetails.bogo.searchTriggerPlaceholder')}
                                    />
                                    <div className="space-y-2">
                                        <Label>{t('offerDetails.bogo.requiredTriggerQty')}</Label>
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
                                    <Label className="text-base font-bold">{t('offerDetails.bogo.getReward')}</Label>
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
                                        placeholder={t('offerDetails.bogo.searchRewardPlaceholder')}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('offerDetails.bogo.rewardQty')}</Label>
                                            <Input
                                                type="number"
                                                value={bogoConfig.rewardQuantity}
                                                onChange={(e) => setBogoConfig(p => ({ ...p, rewardQuantity: Number(e.target.value) }))}
                                                className="h-11"
                                                min="1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('offerDetails.bogo.rewardDiscountType')}</Label>
                                            <select
                                                value={bogoConfig.discountType}
                                                onChange={(e) => setBogoConfig(p => ({ ...p, discountType: e.target.value }))}
                                                className="w-full h-11 rounded-md border border-input bg-background px-3"
                                            >
                                                <option value="percentage">{t('offerDetails.discountTypes.percentage')}</option>
                                                <option value="fixed">{t('offerDetails.discountTypes.fixed')}</option>
                                                <option value="override">{t('offerDetails.discountTypes.override')}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('offerDetails.bogo.rewardDiscountValue')}</Label>
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
                                        <Label className="text-base font-bold">{t('offerDetails.volumeDiscount.heading')}</Label>
                                        <p className="text-xs text-muted-foreground font-medium">{t('offerDetails.volumeDiscount.desc')}</p>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setVolumeTiers(p => [...p, { quantity: p.length + 2, discountType: 'percentage', discountValue: 10 }])}
                                        className="rounded-full h-9 px-4 font-bold text-xs uppercase"
                                    >
                                        {t('offerDetails.volumeDiscount.addTier')}
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {volumeTiers.map((tier, idx) => (
                                        <div key={idx} className="flex gap-4 items-end border p-4 rounded-2xl bg-muted/25">
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs">{t('offerDetails.volumeDiscount.minQuantity')}</Label>
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
                                                <Label className="text-xs">{t('offerDetails.volumeDiscount.discountType')}</Label>
                                                <select
                                                    value={tier.discountType}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setVolumeTiers(p => p.map((t, i) => i === idx ? { ...t, discountType: val } : t));
                                                    }}
                                                    className="w-full h-11 rounded-md border border-input bg-background px-3"
                                                >
                                                    <option value="percentage">{t('offerDetails.discountTypes.percentage')}</option>
                                                    <option value="fixed">{t('offerDetails.discountTypes.fixed')}</option>
                                                </select>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <Label className="text-xs">{t('offerDetails.volumeDiscount.discountValue')}</Label>
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
                                                    {t('offerDetails.volumeDiscount.delete')}
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
                                    <Label className="text-base font-bold">{t('offerDetails.cartThreshold.minSubtotalLabel')}</Label>
                                    <Input
                                        type="number"
                                        value={thresholdConfig.minSubtotal}
                                        onChange={(e) => setThresholdConfig(p => ({ ...p, minSubtotal: Number(e.target.value) }))}
                                        className="h-12"
                                        min="1"
                                    />
                                    <p className="text-xs text-muted-foreground font-medium font-bold">{t('offerDetails.cartThreshold.minSubtotalDesc')}</p>
                                </div>

                                <div className="space-y-4 border-t pt-4">
                                    <Label className="text-base font-bold">{t('offerDetails.cartThreshold.rewardProductLabel')}</Label>
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
                                        placeholder={t('offerDetails.cartThreshold.searchRewardPlaceholder')}
                                    />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>{t('offerDetails.cartThreshold.rewardQty')}</Label>
                                            <Input
                                                type="number"
                                                value={thresholdConfig.rewardQuantity}
                                                onChange={(e) => setThresholdConfig(p => ({ ...p, rewardQuantity: Number(e.target.value) }))}
                                                className="h-11"
                                                min="1"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>{t('offerDetails.cartThreshold.rewardDiscountType')}</Label>
                                            <select
                                                value={thresholdConfig.discountType}
                                                onChange={(e) => setThresholdConfig(p => ({ ...p, discountType: e.target.value }))}
                                                className="w-full h-11 rounded-md border border-input bg-background px-3"
                                            >
                                                <option value="percentage">{t('offerDetails.discountTypes.percentage')}</option>
                                                <option value="fixed">{t('offerDetails.discountTypes.fixed')}</option>
                                                <option value="override">{t('offerDetails.discountTypes.override')}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('offerDetails.cartThreshold.rewardDiscountValue')}</Label>
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
                        <h2 className="text-2xl font-bold">{t('display.heading')}</h2>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>{t('display.headline')}</Label>
                                <Input
                                    value={formData.displayTitle}
                                    onChange={(e) => updateForm('displayTitle', e.target.value)}
                                    className="h-12"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('display.subtitle')}</Label>
                                <Input
                                    value={formData.displaySubtitle}
                                    onChange={(e) => updateForm('displaySubtitle', e.target.value)}
                                    className="h-12"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{t('display.acceptButtonText')}</Label>
                                    <Input
                                        value={formData.callToActionText}
                                        onChange={(e) => updateForm('callToActionText', e.target.value)}
                                        className="h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('display.declineButtonText')}</Label>
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
                        disabled={step === 1 || isLoading}
                        className="h-12 px-6"
                    >
                        {t('back')}
                    </Button>

                    {step < 3 ? (
                        <Button
                            onClick={() => setStep(s => Math.min(3, s + 1))}
                            className="h-12 px-8 rounded-full"
                        >
                            {t('nextStep')} <ArrowRight className="ml-2 w-4 h-4 rtl:mr-2 rtl:ml-0 rtl:rotate-180" />
                        </Button>
                    ) : (
                        <Button
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="h-12 px-8 rounded-full bg-primary hover:bg-primary/90"
                        >
                            {isLoading ? t('creating') : (
                                <><Save className="mr-2 rtl:ml-2 rtl:mr-0 w-4 h-4" /> {t('publishCampaign')}</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
