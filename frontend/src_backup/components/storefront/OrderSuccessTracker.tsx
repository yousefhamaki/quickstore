'use client';

import { useEffect, useRef } from 'react';
import { trackPurchase } from '@/lib/pixelTracking';

interface OrderSuccessTrackerProps {
    orderId: string;
    orderTotal: number;
    orderItems?: Array<{
        _id: string;
        name: string;
        price: number;
        quantity: number;
    }>;
}

/**
 * Client-side component to track completed purchases
 * Fires Purchase event ONCE per order using sessionStorage to prevent duplicates
 * Prevents double-firing in React Strict Mode
 */
export function OrderSuccessTracker({ orderId, orderTotal, orderItems }: OrderSuccessTrackerProps) {
    // Use ref to prevent double-firing in React Strict Mode
    const hasTracked = useRef(false);

    useEffect(() => {
        // Only track if we have valid order data and haven't tracked yet
        if (!orderId || !orderTotal || hasTracked.current) return;

        hasTracked.current = true;

        // Track purchase event (includes built-in duplicate prevention via sessionStorage)
        trackPurchase({
            orderId,
            total: orderTotal,
            currency: 'EGP',
            items: orderItems?.map(item => ({
                id: item._id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
            })),
        });

        // Reset flag when order changes (shouldn't happen, but defensive)
        return () => {
            hasTracked.current = false;
        };
    }, [orderId, orderTotal, orderItems]); // Include all used values to prevent stale closures

    return null; // This component doesn't render anything
}
