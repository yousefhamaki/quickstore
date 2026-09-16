/**
 * Shared coupon eligibility + discount computation — used by every place a
 * coupon's discount can apply, so a manually-typed code, an auto-applied
 * coupon, and the server's final re-check at order creation can never
 * diverge:
 *  - publicController.ts's validateCoupon (manual code lookup) and
 *    getAutoApplyCoupon (auto-apply lookup) — both storefront-facing
 *    display/validation endpoints.
 *  - publicOrderController.ts's createPublicOrder — the authoritative,
 *    server-side re-derivation at order-creation time. Never trusts a
 *    client's claimed discount/coupon choice.
 */

export interface CouponLike {
    isActive: boolean;
    type: 'percentage' | 'fixed' | 'free_shipping';
    value: number;
    maxUsage: number;
    usageCount: number;
    minOrderAmount?: number;
    expiresAt?: Date | string | null;
    restrictedToCustomerEmail?: string | null;
}

/**
 * True when this coupon can legally be used on an order with the given
 * subtotal and (optional) customer email. Mirrors every check
 * validateCoupon and createPublicOrder already performed individually,
 * plus the new restrictedToCustomerEmail check for personal vouchers.
 */
export function isCouponEligible(
    coupon: CouponLike,
    subtotal: number,
    customerEmail?: string | null,
    now: Date = new Date()
): boolean {
    if (!coupon.isActive) return false;
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return false;
    if (coupon.maxUsage !== -1 && coupon.usageCount >= coupon.maxUsage) return false;
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) return false;
    if (coupon.restrictedToCustomerEmail) {
        if (!customerEmail) return false;
        if (coupon.restrictedToCustomerEmail.toLowerCase() !== customerEmail.toLowerCase()) return false;
    }
    return true;
}

/** The discount amount a (presumed-eligible) coupon yields on this subtotal/shipping. */
export function computeCouponDiscount(coupon: CouponLike, subtotal: number, shippingFee: number): number {
    if (coupon.type === 'percentage') {
        return (subtotal * coupon.value) / 100;
    }
    if (coupon.type === 'fixed') {
        return coupon.value;
    }
    if (coupon.type === 'free_shipping') {
        return shippingFee;
    }
    return 0;
}

/**
 * Picks the single best eligible auto-apply coupon (by resulting discount)
 * from a candidate list — never stacks more than one. Ties are broken by
 * whichever sorts first (stable), since callers that also have a
 * manually-typed candidate handle that tie-break themselves (see
 * createPublicOrder's precedence comment).
 */
export function pickBestEligibleCoupon<T extends CouponLike>(
    candidates: T[],
    subtotal: number,
    shippingFee: number,
    customerEmail?: string | null,
    now: Date = new Date()
): { coupon: T; discount: number } | null {
    let best: { coupon: T; discount: number } | null = null;
    for (const coupon of candidates) {
        if (!isCouponEligible(coupon, subtotal, customerEmail, now)) continue;
        const discount = computeCouponDiscount(coupon, subtotal, shippingFee);
        if (!best || discount > best.discount) {
            best = { coupon, discount };
        }
    }
    return best;
}
