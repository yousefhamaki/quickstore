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
        // product.variants + variantId, so it stays correct even if this
        // component's own displayPrice logic ever drifts from it.
        addToCart(product, quantity, selectedOptions, selectedVariant?._id);
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
