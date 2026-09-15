/**
 * Mirrors Product.ts's totalStock/totalReserved/totalAvailable virtuals for
 * plain (`.lean()`-ed) product objects.
 *
 * Those are real Mongoose virtuals (with toJSON/toObject set to include
 * them), which is why a hydrated `Product.find()` result always carried
 * them — but `.lean()` bypasses the whole document/virtual machinery by
 * design, so a leaned query silently drops them unless the
 * `mongoose-lean-virtuals` plugin is registered (it isn't here). Rather
 * than add that dependency, this recomputes the exact same arithmetic on
 * the plain object — cheap, and keeps `.lean()`'s hydration-skip
 * performance win on the read-heavy product endpoints.
 */
export function withStockVirtuals<T extends { variants?: any[]; inventory?: { quantity?: number; reserved?: number } }>(
    product: T
): T & { totalStock: number; totalReserved: number; totalAvailable: number } {
    const activeVariants = (product.variants || []).filter((v: any) => !v.isDeleted);

    if (activeVariants.length > 0) {
        const totalStock = activeVariants.reduce((sum: number, v: any) => sum + (v.inventory || 0), 0);
        const totalReserved = activeVariants.reduce((sum: number, v: any) => sum + (v.reserved || 0), 0);
        return { ...product, totalStock, totalReserved, totalAvailable: totalStock - totalReserved };
    }

    const totalStock = product.inventory?.quantity || 0;
    const totalReserved = product.inventory?.reserved || 0;
    return { ...product, totalStock, totalReserved, totalAvailable: totalStock - totalReserved };
}

export function withStockVirtualsMany<T extends { variants?: any[]; inventory?: { quantity?: number; reserved?: number } }>(
    products: T[]
): Array<T & { totalStock: number; totalReserved: number; totalAvailable: number }> {
    return products.map(withStockVirtuals);
}
