// "Fly to cart" add-to-cart animation. A cloned product image travels from
// the product photo to the header cart icon along a slight upward arc,
// shrinking and fading as it lands — replaces a plain "Added to cart" toast
// with a visual confirmation the shopper can actually see happen.
//
// Deliberately DOM-based (not a React tree) because the source (the product
// image on the PDP) and the target (the cart icon in the header) live in
// completely separate component trees with no shared parent worth threading
// props/context through just for this. The cart icon just needs a stable
// `id="storefront-cart-icon"`; this fires a `storefront:cart-fly-landed`
// window event when the flight completes so the cart icon can react (see
// HeaderCart.tsx) without a direct reference to this module.
export const CART_ICON_ELEMENT_ID = 'storefront-cart-icon';
export const CART_FLY_LANDED_EVENT = 'storefront:cart-fly-landed';

export function flyToCart(sourceEl: HTMLImageElement | HTMLElement | null) {
    if (typeof window === 'undefined' || !sourceEl) return;

    const cartEl = document.getElementById(CART_ICON_ELEMENT_ID);
    if (!cartEl) return;

    // Respect reduced-motion preferences — just land the count update
    // (already reactive via cart state) without the flight.
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        cartEl.dispatchEvent(new CustomEvent(CART_FLY_LANDED_EVENT));
        window.dispatchEvent(new CustomEvent(CART_FLY_LANDED_EVENT));
        return;
    }

    const sourceRect = sourceEl.getBoundingClientRect();
    const cartRect = cartEl.getBoundingClientRect();
    if (sourceRect.width === 0 || sourceRect.height === 0) return;

    // A round, palm-sized clone reads better mid-flight than a big square
    // product photo — shrink the starting size a bit before the fly-out.
    const startSize = Math.min(96, sourceRect.width, sourceRect.height);
    const startLeft = sourceRect.left + (sourceRect.width - startSize) / 2;
    const startTop = sourceRect.top + (sourceRect.height - startSize) / 2;

    const imgSrc = (sourceEl as HTMLImageElement).currentSrc || (sourceEl as HTMLImageElement).src;

    const flyer = document.createElement('div');
    Object.assign(flyer.style, {
        position: 'fixed',
        left: `${startLeft}px`,
        top: `${startTop}px`,
        width: `${startSize}px`,
        height: `${startSize}px`,
        borderRadius: '9999px',
        overflow: 'hidden',
        zIndex: '9999',
        pointerEvents: 'none',
        boxShadow: '0 12px 28px rgba(0,0,0,0.28)',
        border: '2px solid rgba(255,255,255,0.9)',
        willChange: 'transform, opacity',
    } as CSSStyleDeclaration);

    if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        Object.assign(img.style, { width: '100%', height: '100%', objectFit: 'cover' } as CSSStyleDeclaration);
        flyer.appendChild(img);
    }

    document.body.appendChild(flyer);

    const targetCenterX = cartRect.left + cartRect.width / 2;
    const targetCenterY = cartRect.top + cartRect.height / 2;
    const startCenterX = startLeft + startSize / 2;
    const startCenterY = startTop + startSize / 2;

    const deltaX = targetCenterX - startCenterX;
    const deltaY = targetCenterY - startCenterY;
    // Arc upward first (like a lobbed throw) rather than a straight line —
    // the midpoint lifts above the direct path by a fraction of the travel
    // distance, capped so short hops don't overshoot absurdly high.
    const arcLift = Math.min(160, Math.max(60, Math.abs(deltaY) * 0.6));

    const animation = flyer.animate(
        [
            { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 0 },
            {
                transform: `translate(${deltaX * 0.55}px, ${deltaY * 0.45 - arcLift}px) scale(0.75)`,
                opacity: 1,
                offset: 0.55,
            },
            {
                transform: `translate(${deltaX}px, ${deltaY}px) scale(0.15)`,
                opacity: 0.35,
                offset: 1,
            },
        ],
        {
            duration: 650,
            easing: 'cubic-bezier(0.3, 0.05, 0.4, 1)',
            fill: 'forwards',
        }
    );

    animation.onfinish = () => {
        flyer.remove();
        cartEl.dispatchEvent(new CustomEvent(CART_FLY_LANDED_EVENT));
        window.dispatchEvent(new CustomEvent(CART_FLY_LANDED_EVENT));
    };
}
