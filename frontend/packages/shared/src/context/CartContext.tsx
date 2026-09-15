'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trackAddToCart } from '@shared/lib/pixelTracking';

export interface CartItem {
    cartItemId: string;
    _id: string;
    variantId?: string;
    name: string;
    /** Base/variant unit price only — extras are NOT folded in here, see selectedExtras. */
    price: number;
    originalPrice?: number;
    quantity: number;
    image?: string;
    selectedOptions?: Record<string, string>;
    /**
     * Optional paid add-ons (Product.extras) selected for this line, with
     * the price resolved at add-to-cart time (from product.extras, not
     * user input) purely for display/totals here — the order-creation
     * endpoint independently re-validates and re-resolves these against the
     * product's own extras array, so a tampered client value can't change
     * what's actually charged.
     */
    selectedExtras?: { _id: string; name: string; price: number }[];
    campaignId?: string;
    impressionId?: string;
    revenueSource?: 'order' | 'upsell' | 'bogo' | 'threshold' | 'bundle';
    placement?: 'product_page' | 'cart' | 'checkout' | 'post_purchase' | 'standalone';
    parentCartItemId?: string;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (
        product: any,
        quantity: number,
        selectedOptions?: Record<string, string>,
        variantId?: string,
        campaignId?: string,
        impressionId?: string,
        revenueSource?: 'order' | 'upsell' | 'bogo' | 'threshold' | 'bundle',
        placement?: 'product_page' | 'cart' | 'checkout' | 'post_purchase' | 'standalone',
        parentCartItemId?: string,
        selectedExtraIds?: string[]
    ) => void;
    removeFromCart: (cartItemId: string) => void;
    updateQuantity: (cartItemId: string, quantity: number) => void;
    clearCart: () => void;
    getCartTotal: () => number;
    getCartCount: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children, storeId }: { children: ReactNode; storeId: string }) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isInitialized, setIsInitialized] = useState(false);

    // Key for localStorage is store-specific to avoid mixing carts
    const cartKey = `quickstore_cart_${storeId}`;

    // Load cart from localStorage on mount
    useEffect(() => {
        const savedCart = localStorage.getItem(cartKey);
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart", e);
            }
        }
        setIsInitialized(true);
    }, [cartKey]);

    // Save cart to localStorage whenever it changes
    useEffect(() => {
        if (isInitialized) {
            localStorage.setItem(cartKey, JSON.stringify(cart));
        }
    }, [cart, cartKey, isInitialized]);

    const addToCart = (
        product: any,
        quantity: number,
        selectedOptions?: Record<string, string>,
        variantId?: string,
        campaignId?: string,
        impressionId?: string,
        revenueSource?: 'order' | 'upsell' | 'bogo' | 'threshold' | 'bundle',
        placement?: 'product_page' | 'cart' | 'checkout' | 'post_purchase' | 'standalone',
        parentCartItemId?: string,
        selectedExtraIds?: string[]
    ) => {
        // Resolve the actual charged price from the matched variant's own
        // price (when one exists) rather than always the base product
        // price — mirrors the server-side pricing-integrity fix in
        // publicOrderController.createPublicOrder, which independently
        // re-derives the same authoritative price at order-creation time.
        const matchedVariant = variantId
            ? product.variants?.find((v: any) => String(v._id) === String(variantId))
            : undefined;
        const unitPrice = (matchedVariant && typeof matchedVariant.price === 'number')
            ? matchedVariant.price
            : product.price;

        // Same treatment for optional paid extras: resolve each selected
        // extra's price from product.extras here (never trust a caller-
        // supplied price), purely for local display/totals — the server
        // independently re-validates and re-resolves these at order time.
        const resolvedExtras: { _id: string; name: string; price: number }[] = (selectedExtraIds && selectedExtraIds.length > 0)
            ? (product.extras || [])
                .filter((ex: any) => selectedExtraIds.includes(String(ex._id)))
                .map((ex: any) => ({ _id: String(ex._id), name: ex.name, price: ex.price }))
            : [];
        const extrasTotal = resolvedExtras.reduce((sum, ex) => sum + (Number(ex.price) || 0), 0);

        setCart(prevCart => {
            const optionsString = selectedOptions ? JSON.stringify(selectedOptions) : '';
            let cartItemId = variantId ? `${product._id}_${variantId}` : `${product._id}_${optionsString}`;
            if (campaignId) {
                cartItemId += `_${campaignId}`;
            }
            if (parentCartItemId) {
                cartItemId += `_child_${parentCartItemId}`;
            }
            if (resolvedExtras.length > 0) {
                // Sorted so the same set of extras always produces the same
                // id regardless of selection order — a different set of
                // extras is a genuinely different cart line.
                cartItemId += `_extras_${resolvedExtras.map(ex => ex._id).sort().join('-')}`;
            }

            const existingItemIndex = prevCart.findIndex(item => item.cartItemId === cartItemId);

            if (existingItemIndex > -1) {
                const newCart = [...prevCart];
                newCart[existingItemIndex] = {
                    ...newCart[existingItemIndex],
                    quantity: newCart[existingItemIndex].quantity + quantity
                };
                return newCart;
            }

            return [...prevCart, {
                cartItemId,
                _id: product._id,
                variantId: variantId,
                name: product.name,
                price: unitPrice,
                originalPrice: product.originalPrice,
                quantity: quantity,
                image: product.images?.[0]?.url,
                selectedOptions: selectedOptions,
                selectedExtras: resolvedExtras.length > 0 ? resolvedExtras : undefined,
                campaignId,
                impressionId,
                revenueSource,
                placement,
                parentCartItemId
            }];
        });

        // Track add to cart event across all marketing pixels
        trackAddToCart({
            id: product._id,
            name: product.name,
            price: unitPrice + extrasTotal,
            quantity,
            currency: 'EGP',
        });
    };

    const removeFromCart = (cartItemId: string) => {
        setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId && item.parentCartItemId !== cartItemId));
    };

    const updateQuantity = (cartItemId: string, quantity: number) => {
        if (quantity < 1) return;
        setCart(prevCart => {
            const targetItem = prevCart.find(item => item.cartItemId === cartItemId);
            if (!targetItem) return prevCart;

            const isDecrease = quantity < targetItem.quantity;
            if (isDecrease) {
                // If quantity is decreased, remove linked child BOGO items
                return prevCart
                    .filter(item => item.parentCartItemId !== cartItemId)
                    .map(item => item.cartItemId === cartItemId ? { ...item, quantity } : item);
            }

            return prevCart.map(item =>
                item.cartItemId === cartItemId ? { ...item, quantity } : item
            );
        });
    };

    const clearCart = () => {
        setCart([]);
    };

    const getCartTotal = () => {
        return cart.reduce((total, item) => {
            const extrasTotal = (item.selectedExtras || []).reduce((sum, ex) => sum + (Number(ex.price) || 0), 0);
            return total + ((item.price + extrasTotal) * item.quantity);
        }, 0);
    };

    const getCartCount = () => {
        return cart.reduce((count, item) => count + item.quantity, 0);
    };

    return (
        <CartContext.Provider value={{
            cart,
            addToCart,
            removeFromCart,
            updateQuantity,
            clearCart,
            getCartTotal,
            getCartCount
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
};
