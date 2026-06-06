// Production-ready tracking pixel helpers for e-commerce events
// Supports: Facebook Pixel, Google Analytics 4, TikTok Pixel, Snapchat Pixel

// Type definitions for global pixel objects
declare global {
    interface Window {
        fbq?: (action: string, event: string, data?: any) => void;
        gtag?: (...args: any[]) => void;
        ttq?: {
            track: (event: string, data?: any) => void;
        };
        snaptr?: (action: string, event: string, data?: any) => void;
    }
}

// Currency constant to avoid magic strings
const DEFAULT_CURRENCY = 'EGP';

// Type definitions for tracking data
interface ProductData {
    id: string;
    name: string;
    price: number;
    quantity?: number;
    currency?: string;
}

interface OrderData {
    orderId: string;
    total: number;
    currency?: string;
    items?: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
    }>;
}

/**
 * Track when a customer adds a product to cart
 * Fires across all configured pixels
 */
export const trackAddToCart = (product: ProductData): void => {
    // Client-side only - prevent SSR execution
    if (typeof window === 'undefined') return;

    const currency = product.currency || DEFAULT_CURRENCY;
    const quantity = product.quantity || 1;

    // Facebook Pixel
    window.fbq?.('track', 'AddToCart', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.price * quantity,
        currency,
    });

    // Google Analytics 4
    window.gtag?.('event', 'add_to_cart', {
        currency,
        value: product.price * quantity,
        items: [{
            item_id: product.id,
            item_name: product.name,
            price: product.price,
            quantity,
        }],
    });

    // TikTok Pixel
    window.ttq?.track('AddToCart', {
        content_id: product.id,
        content_name: product.name,
        price: product.price,
        quantity,
        currency,
    });

    // Snapchat Pixel
    window.snaptr?.('track', 'ADD_CART', {
        item_ids: [product.id],
        price: product.price * quantity,
        currency,
    });
};

/**
 * Track when a customer views a product detail page
 * Fires once per page load
 */
export const trackViewContent = (product: ProductData): void => {
    // Client-side only - prevent SSR execution
    if (typeof window === 'undefined') return;

    const currency = product.currency || DEFAULT_CURRENCY;

    // Facebook Pixel
    window.fbq?.('track', 'ViewContent', {
        content_ids: [product.id],
        content_name: product.name,
        content_type: 'product',
        value: product.price,
        currency,
    });

    // Google Analytics 4
    window.gtag?.('event', 'view_item', {
        currency,
        value: product.price,
        items: [{
            item_id: product.id,
            item_name: product.name,
            price: product.price,
        }],
    });

    // TikTok Pixel
    window.ttq?.track('ViewContent', {
        content_id: product.id,
        content_name: product.name,
        price: product.price,
        currency,
    });

    // Snapchat Pixel
    window.snaptr?.('track', 'VIEW_CONTENT', {
        item_ids: [product.id],
        price: product.price,
        currency,
    });
};

/**
 * Track completed purchase/order
 * CRITICAL: Should fire only ONCE per order (use sessionStorage to prevent duplicates)
 * Handles React Strict Mode, race conditions, and storage errors
 */
export const trackPurchase = (order: OrderData): void => {
    // Client-side only - prevent SSR execution
    if (typeof window === 'undefined') return;

    const currency = order.currency || DEFAULT_CURRENCY;
    const trackingKey = `tracked_order_${order.orderId}`;

    // Prevent duplicate firing with atomic check-and-set
    // Use a flag to prevent race conditions in React Strict Mode
    try {
        const alreadyTracked = sessionStorage.getItem(trackingKey);
        if (alreadyTracked) {
            return; // Already tracked this order in this session
        }

        // Set flag BEFORE tracking to prevent race conditions
        // If this throws (private browsing), we still track but may double-fire
        sessionStorage.setItem(trackingKey, 'true');
    } catch (storageError) {
        // Private browsing mode or storage quota exceeded
        // Fall back to in-memory tracking (will reset on page reload, but better than nothing)
        const globalTracked = (window as any).__trackedOrders || new Set();
        if (globalTracked.has(order.orderId)) {
            return;
        }
        globalTracked.add(order.orderId);
        (window as any).__trackedOrders = globalTracked;
    }

    // Facebook Pixel
    window.fbq?.('track', 'Purchase', {
        value: order.total,
        currency,
        content_type: 'product',
        contents: order.items?.map(item => ({
            id: item.id,
            quantity: item.quantity,
        })),
    });

    // Google Analytics 4
    window.gtag?.('event', 'purchase', {
        transaction_id: order.orderId,
        value: order.total,
        currency,
        items: order.items?.map(item => ({
            item_id: item.id,
            item_name: item.name,
            price: item.price,
            quantity: item.quantity,
        })),
    });

    // TikTok Pixel
    window.ttq?.track('CompletePayment', {
        value: order.total,
        currency,
        contents: order.items?.map(item => ({
            content_id: item.id,
            content_name: item.name,
            price: item.price,
            quantity: item.quantity,
        })),
    });

    // Snapchat Pixel
    window.snaptr?.('track', 'PURCHASE', {
        transaction_id: order.orderId,
        price: order.total,
        currency,
        item_ids: order.items?.map(item => item.id),
    });
};
