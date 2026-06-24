'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { trackAddToCart } from '@shared/lib/pixelTracking';

export interface CartItem {
    cartItemId: string;
    _id: string;
    variantId?: string;
    name: string;
    price: number;
    originalPrice?: number;
    quantity: number;
    image?: string;
    selectedOptions?: Record<string, string>;
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
        parentCartItemId?: string
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
        parentCartItemId?: string
    ) => {
        setCart(prevCart => {
            const optionsString = selectedOptions ? JSON.stringify(selectedOptions) : '';
            let cartItemId = variantId ? `${product._id}_${variantId}` : `${product._id}_${optionsString}`;
            if (campaignId) {
                cartItemId += `_${campaignId}`;
            }
            if (parentCartItemId) {
                cartItemId += `_child_${parentCartItemId}`;
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
                price: product.price,
                originalPrice: product.originalPrice,
                quantity: quantity,
                image: product.images?.[0]?.url,
                selectedOptions: selectedOptions,
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
            price: product.price,
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
        return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
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
