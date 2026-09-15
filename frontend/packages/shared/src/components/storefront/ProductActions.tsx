'use client';

import { useState, useMemo } from "react";
import { useCart } from "@shared/context/CartContext";
import { Plus, Minus, ShoppingCart, Heart, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@shared/lib/utils";
import { useTranslations } from "next-intl";
import { useOfferEngine } from "@shared/hooks/useOfferEngine";
import { UpsellTeaser } from "@shared/components/offers/UpsellTeaser";
import { OfferModal } from "@shared/components/offers/OfferModal";
import { useEffect } from "react";

export function ProductActions({ product }: { product: any }) {
    const t = useTranslations('store.product');
    const [quantity, setQuantity] = useState(1);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [selectedExtraIds, setSelectedExtraIds] = useState<string[]>([]);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const { addToCart, updateQuantity, removeFromCart, cart } = useCart();

    const handleOfferAccept = (result: any) => {
        if (result.localAccept && result.offer) {
            const offer = result.offer;
            // Add all offer products to cart
            offer.offerProducts.forEach((op: any) => {
                addToCart(
                    {
                        _id: op.productId,
                        name: op.name,
                        price: op.offerPrice,
                        originalPrice: op.basePrice,
                        images: [{ url: op.image }],
                        storeId: product.storeId,
                    },
                    op.quantity,
                    op.selectedOptions || {},
                    op.variantId
                );
            });

            // If it's an upsell that replaces the current product, we don't add the original product.
            // Wait, this is triggered when they view the page. The user hasn't added the base product to the cart yet.
            // So we just add the upsell products to the cart and show success.
            toast.success(t('addedToCart', { quantity: 1, name: offer.name || 'Bundle' }));
        }
    };

    const { currentOffer, isProcessing, triggerEvaluation, handleAccept, handleDecline } = useOfferEngine(handleOfferAccept);

    // Resolve the variant matching the currently-selected options (if any),
    // so the displayed price and add-to-cart charge reflect ITS price
    // rather than always the base product price — a variant with its own
    // price previously never showed up anywhere on the storefront.
    const selectedVariant = useMemo(() => {
        const hasOptions = product.options && product.options.length > 0;
        if (!hasOptions || !product.variants?.length) return null;
        const allOptionsSelected = product.options.every((opt: any) => selectedOptions[opt.name]);
        if (!allOptionsSelected) return null;
        return product.variants.find((v: any) =>
            Object.entries(selectedOptions).every(([key, value]) => v.options?.[key] === value)
        ) || null;
    }, [product, selectedOptions]);

    const displayPrice = (selectedVariant && typeof selectedVariant.price === 'number')
        ? selectedVariant.price
        : product.price;

    // Optional paid add-ons (Product.extras) — a shopper can pick zero, one,
    // or several; each selected one adds its own price to the total. The
    // authoritative price is still re-resolved server-side at order-creation
    // time (see publicOrderController.createPublicOrder) — this is only for
    // display and to tell the cart which ones were picked.
    const selectedExtras = useMemo(() => {
        if (!product.extras?.length || selectedExtraIds.length === 0) return [];
        return product.extras.filter((ex: any) => selectedExtraIds.includes(String(ex._id)));
    }, [product, selectedExtraIds]);
    const extrasTotal = selectedExtras.reduce((sum: number, ex: any) => sum + (Number(ex.price) || 0), 0);

    const toggleExtra = (extraId: string) => {
        setSelectedExtraIds(prev => prev.includes(extraId) ? prev.filter(id => id !== extraId) : [...prev, extraId]);
    };

    useEffect(() => {
        if (!product || !product.storeId) return;
        
        let sessionId = '';
        if (typeof window !== 'undefined') {
            sessionId = localStorage.getItem('storefront_session') || '';
            if (!sessionId) {
                sessionId = Math.random().toString(36).substring(2, 15);
                localStorage.setItem('storefront_session', sessionId);
            }
        }

        // Trigger product_page evaluation
        triggerEvaluation({
            storeId: product.storeId,
            event: 'product_page' as any,
            sessionId,
            cartItems: [{
                productId: product._id,
                quantity: 1,
                price: product.price,
                category: product.category
            }],
            cartSubtotal: product.price
        });
    }, [product]);

    const handleAddToCart = () => {
        // Validation: Ensure all options are selected
        const hasOptions = product.options && product.options.length > 0;
        if (hasOptions) {
            const missingOptions = product.options.filter((opt: any) => !selectedOptions[opt.name]);
            if (missingOptions.length > 0) {
                toast.error(t('selectOption', { options: missingOptions.map((o: any) => o.name).join(', ') }), {
                    icon: <AlertCircle className="text-red-500" />
                });
                return;
            }
        }

        // CartContext resolves the actual charged price itself from
        // product.variants + variantId (and product.extras + the selected
        // extra ids), so it stays correct even if this component's own
        // displayPrice/extrasTotal logic ever drifts from it.
        addToCart(product, quantity, selectedOptions, selectedVariant?._id, undefined, undefined, undefined, undefined, undefined, selectedExtraIds);
        toast.success(t('addedToCart', { quantity, name: product.name }));
    };

    const handleOptionSelect = (optionName: string, value: string) => {
        setSelectedOptions(prev => ({ ...prev, [optionName]: value }));
    };

    return (
        <div className="space-y-8 pt-4">
            {/* Price — reflects the selected variant's own price when one is
                resolved, falling back to the base product price otherwise. */}
            <div className="flex items-baseline gap-3">
                <p className="text-3xl font-black">
                    EGP {displayPrice.toLocaleString()}
                </p>
                {typeof product.compareAtPrice === 'number' && product.compareAtPrice > displayPrice && (
                    <p className="text-lg font-bold text-gray-400 line-through">
                        EGP {product.compareAtPrice.toLocaleString()}
                    </p>
                )}
            </div>

            {/* Extras — optional paid add-ons. Selecting one visibly adds
                its price to a "Total" line below. */}
            {product.extras && product.extras.length > 0 && (
                <div className="space-y-3">
                    <label className="text-sm font-bold uppercase tracking-widest text-gray-400">
                        {t('extras')}
                    </label>
                    <div className="space-y-2">
                        {product.extras.map((extra: any) => (
                            <label
                                key={extra._id}
                                className={cn(
                                    "flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition duration-300",
                                    selectedExtraIds.includes(String(extra._id))
                                        ? "border-primary bg-primary/5"
                                        : "border-gray-100 hover:border-gray-200"
                                )}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedExtraIds.includes(String(extra._id))}
                                    onChange={() => toggleExtra(String(extra._id))}
                                    className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-sm font-bold">{extra.name}</span>
                                        <span className="text-sm font-black shrink-0">+ EGP {Number(extra.price).toLocaleString()}</span>
                                    </div>
                                    {extra.description && (
                                        <p className="text-xs text-gray-400 font-medium mt-1">{extra.description}</p>
                                    )}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {/* Total — only shown once at least one extra is selected, since
                otherwise it would just duplicate the price above. */}
            {selectedExtraIds.length > 0 && (
                <p className="text-sm font-bold text-gray-500">
                    {t('total')}: <span className="text-foreground font-black">EGP {(displayPrice + extrasTotal).toLocaleString()}</span>
                </p>
            )}

            {/* Options Selection */}
            {product.options && product.options.length > 0 && (
                <div className="space-y-6">
                    {product.options.map((option: any) => (
                        <div key={option.name} className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold uppercase tracking-widest text-gray-400">
                                    {option.name}
                                </label>
                                {selectedOptions[option.name] && (
                                    <span className="text-xs font-bold text-primary">
                                        {selectedOptions[option.name]}
                                    </span>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {option.values.map((value: string) => (
                                    <button
                                        key={value}
                                        onClick={() => handleOptionSelect(option.name, value)}
                                        className={cn(
                                            "h-12 px-6 rounded-2xl text-sm font-bold border-2 transition duration-300",
                                            selectedOptions[option.name] === value
                                                ? "border-primary bg-primary text-white shadow-lg scale-105"
                                                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200"
                                        )}
                                    >
                                        {value}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quantity and Cart */}
            <div className="flex flex-col md:flex-row items-center gap-6 pt-4">
                <div className="flex items-center bg-gray-50 rounded-[24px] p-1 border w-full md:w-auto">
                    <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-[20px] transition"
                    >
                        <Minus size={18} />
                    </button>
                    <span className="w-14 text-center font-black text-lg">{quantity}</span>
                    <button
                        onClick={() => setQuantity(quantity + 1)}
                        className="w-14 h-14 flex items-center justify-center hover:bg-white rounded-[20px] transition"
                    >
                        <Plus size={18} />
                    </button>
                </div>
                <div className="flex-1 flex gap-3 w-full">
                    <button
                        onClick={handleAddToCart}
                        className="flex-1 store-button h-16 flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-transform"
                    >
                        <ShoppingCart size={20} className="stroke-[3]" /> {t('addToCart')}
                    </button>
                    <button className="w-16 h-16 rounded-[24px] border-2 border-gray-100 flex items-center justify-center hover:bg-gray-50 transition-colors">
                        <Heart size={20} />
                    </button>
                </div>
            </div>

            {currentOffer && (
                <UpsellTeaser 
                    offer={currentOffer} 
                    onClick={() => setIsOfferModalOpen(true)} 
                />
            )}

            <OfferModal 
                offer={currentOffer}
                isOpen={isOfferModalOpen}
                isProcessing={isProcessing}
                onAccept={async (products) => {
                    await handleAccept(products);
                    setIsOfferModalOpen(false);
                }}
                onDecline={async () => {
                    await handleDecline();
                    setIsOfferModalOpen(false);
                }}
            />
        </div>
    );
}
