/**
 * Shipping providers a store can actually be configured to use right now.
 *
 * Aramex only exists today as an unfinished skeleton: ShippingFactory.ts has
 * no real `case 'aramex'` (it's commented out) and no
 * AramexShippingService.ts file exists at all, so selecting it as a store's
 * shipping provider used to save fine and only blow up later at runtime the
 * first time a shipment/tracking/webhook action was actually attempted.
 * Until it's given a real SDK integration, it must stay unreachable: see
 * models/Store.ts (IShippingSettings comment + schema enum),
 * controllers/storeController.ts (rejects saving it), and
 * services/shipping/ShippingFactory.ts (refuses to construct it even if a
 * record somehow already holds one).
 */
export const IMPLEMENTED_SHIPPING_PROVIDERS = ['local', 'bosta'] as const;
export type ImplementedShippingProvider = typeof IMPLEMENTED_SHIPPING_PROVIDERS[number];
