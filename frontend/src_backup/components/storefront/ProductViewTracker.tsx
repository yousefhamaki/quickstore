'use client';

import { useEffect, useRef } from 'react';
import { trackViewContent } from '@/lib/pixelTracking';

interface ProductViewTrackerProps {
    product: {
        _id: string;
        name: string;
        price: number;
    };
}

/**
 * Client-side component to track product page views
 * Fires ViewContent event once when product loads
 * Prevents double-firing in React Strict Mode
 */
export function ProductViewTracker({ product }: ProductViewTrackerProps) {
    // Use ref to prevent double-firing in React Strict Mode
    const hasTracked = useRef(false);

    useEffect(() => {
        // Track view content event when product is available
        if (product?._id && product?.name && product?.price && !hasTracked.current) {
            hasTracked.current = true;

            trackViewContent({
                id: product._id,
                name: product.name,
                price: product.price,
                currency: 'EGP',
            });
        }

        // Reset tracking flag when product changes
        return () => {
            hasTracked.current = false;
        };
    }, [product._id, product.name, product.price]); // Include all used values

    return null; // This component doesn't render anything
}
