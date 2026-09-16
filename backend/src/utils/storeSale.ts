/**
 * Single shared computation for the storewide sale feature (see
 * Store.settings.storeSale). Used at BOTH ends of the same price so they
 * can never disagree:
 *  - publicController.ts's getStoreProducts/getProductDetails (what the
 *    storefront displays as the "before"/"after" price)
 *  - publicOrderController.ts's createPublicOrder (the authoritative price
 *    actually charged, resolved at the exact same point that already
 *    re-derives a variant's own price over the base product price)
 *
 * Never trust a client to tell you whether a sale applies or what it's
 * worth — always recompute from the store's own settings document.
 */

export interface StoreSaleConfig {
    enabled?: boolean;
    type?: 'percentage' | 'fixed';
    value?: number;
    startAt?: Date | string | null;
    endAt?: Date | string | null;
    excludedCategoryIds?: Array<{ toString(): string } | string>;
}

/** Whether the sale is currently on: enabled AND (no schedule, or within it). */
export function isStoreSaleActive(saleConfig: StoreSaleConfig | null | undefined, now: Date = new Date()): boolean {
    if (!saleConfig?.enabled) return false;
    if (saleConfig.startAt && now < new Date(saleConfig.startAt)) return false;
    if (saleConfig.endAt && now > new Date(saleConfig.endAt)) return false;
    return true;
}

/** Whether a given product category is carved out of the sale. */
export function isCategoryExcludedFromSale(
    saleConfig: StoreSaleConfig | null | undefined,
    categoryId: { toString(): string } | string | null | undefined
): boolean {
    const excluded = saleConfig?.excludedCategoryIds;
    if (!excluded || excluded.length === 0 || !categoryId) return false;
    const categoryIdStr = categoryId.toString();
    return excluded.some((id) => id?.toString() === categoryIdStr);
}

export interface SalePriceResult {
    /** The price after the sale is applied (equal to basePrice when no sale applies). */
    price: number;
    /** Whether the sale actually discounted this particular price. */
    onSale: boolean;
}

/**
 * Applies the store's sale (if active and this product's category isn't
 * excluded) to a single base price — the caller has already resolved
 * `basePrice` to whichever price would otherwise be charged (a selected
 * variant's own price, else the product's base price). Never returns a
 * negative price; a fixed discount larger than the price floors at 0.
 */
export function getStoreSalePrice(
    saleConfig: StoreSaleConfig | null | undefined,
    categoryId: { toString(): string } | string | null | undefined,
    basePrice: number,
    now: Date = new Date()
): SalePriceResult {
    if (!isStoreSaleActive(saleConfig, now) || isCategoryExcludedFromSale(saleConfig, categoryId)) {
        return { price: basePrice, onSale: false };
    }

    const value = Number(saleConfig?.value) || 0;
    let discounted = basePrice;
    if (saleConfig?.type === 'fixed') {
        discounted = basePrice - value;
    } else {
        // 'percentage' is the default/fallback type
        discounted = basePrice - (basePrice * value) / 100;
    }

    discounted = Math.max(0, Math.round(discounted * 100) / 100);
    // Guard against a misconfigured 0%/0-value sale reporting onSale:true
    // with an unchanged price.
    const onSale = discounted !== basePrice;
    return { price: discounted, onSale };
}

/**
 * Decorates a lean product object (and its variants) with the effective
 * (sale-aware) price to display/charge, plus whichever "before" price
 * should be struck through — the sale's own original price takes priority
 * over the product's manually-set compareAtPrice whenever the sale is what
 * actually discounted it, so the storefront never has to show two
 * different "was" prices at once (see product-owner decision in the spec).
 */
export function decorateProductWithSale<T extends {
    price: number;
    compareAtPrice?: number;
    categoryId?: { toString(): string } | string | null;
    variants?: Array<{ price?: number;[key: string]: any }>;
}>(product: T, saleConfig: StoreSaleConfig | null | undefined, now: Date = new Date()): T & {
    effectivePrice: number;
    effectiveCompareAtPrice?: number;
    onSale: boolean;
} {
    const categoryId = product.categoryId;
    const base = getStoreSalePrice(saleConfig, categoryId, product.price, now);

    const decorated: any = {
        ...product,
        effectivePrice: base.price,
        effectiveCompareAtPrice: base.onSale ? product.price : product.compareAtPrice,
        onSale: base.onSale,
    };

    if (Array.isArray(product.variants)) {
        decorated.variants = product.variants.map((variant) => {
            const variantBasePrice = typeof variant.price === 'number' ? variant.price : product.price;
            const variantSale = getStoreSalePrice(saleConfig, categoryId, variantBasePrice, now);
            return {
                ...variant,
                effectivePrice: variantSale.price,
                effectiveCompareAtPrice: variantSale.onSale ? variantBasePrice : undefined,
                onSale: variantSale.onSale,
            };
        });
    }

    return decorated;
}
