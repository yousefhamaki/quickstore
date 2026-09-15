export const PLAN_NAMES = {
    STARTER: 'starter',
    PROFESSIONAL: 'professional',
    PROFESSIONAL_PLUS: 'professional_plus',
    ENTERPRISE: 'enterprise'
} as const;

// Map DB names (SubscriptionPlan.name) to the internal standard keys above.
//
// IMPORTANT: this MUST be kept in sync with backend/src/config/planFeatures.ts
// (a separate copy of this same table) and with whatever SubscriptionPlan.name
// values actually exist in the database. 'Free'/'Basic'/'Pro' below used to be
// the only entries (matching the original seedPlans.ts names), but the live
// plans were renamed to 'Starter'/'Professional'/'Professional Plus' via the
// admin plan editor without this map being updated here — since
// canAccessFeature() silently falls back to STARTER for any unrecognized
// name, that drift meant a paying customer on the real 'Professional' plan
// was silently treated as free-tier for coupons/pixels/SEO/abandoned-cart on
// the Marketing Hub page (the exact "I'm on Pro but it's locked" bug this
// fixed). Prefer keying plan-gating off `SubscriptionPlan.features.*`
// booleans where practical — see billing.ts's Plan.features — since those
// can't drift out of sync with a rename the way this string table can.
export const PLAN_MAPPING: Record<string, string> = {
    'Free': PLAN_NAMES.STARTER,
    'Starter': PLAN_NAMES.STARTER,
    'Basic': PLAN_NAMES.PROFESSIONAL,
    'Professional': PLAN_NAMES.PROFESSIONAL,
    'Pro': PLAN_NAMES.PROFESSIONAL_PLUS,
    'Professional Plus': PLAN_NAMES.PROFESSIONAL_PLUS,
    'Enterprise': PLAN_NAMES.ENTERPRISE
};

export const FEATURE_MATRIX = {
    coupons: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.PROFESSIONAL_PLUS, PLAN_NAMES.ENTERPRISE],
    pixels: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.PROFESSIONAL_PLUS, PLAN_NAMES.ENTERPRISE],
    seo: [PLAN_NAMES.PROFESSIONAL, PLAN_NAMES.PROFESSIONAL_PLUS, PLAN_NAMES.ENTERPRISE],
    abandoned_cart: [PLAN_NAMES.PROFESSIONAL_PLUS, PLAN_NAMES.ENTERPRISE],
    ai_marketing: [PLAN_NAMES.ENTERPRISE]
} as const;

export type FeatureKey = keyof typeof FEATURE_MATRIX;

export const canAccessFeature = (planName: string, feature: FeatureKey): boolean => {
    const normalizedPlan = PLAN_MAPPING[planName];
    if (!normalizedPlan) {
        // Fails safe (denies the feature) rather than crash, but this should
        // never happen for a real plan — log loudly so a future rename
        // doesn't silently lock out paying customers again like it did
        // before this was added (see the comment on PLAN_MAPPING above).
        console.error(
            `[planFeatures] Unrecognized SubscriptionPlan.name "${planName}" is not in PLAN_MAPPING — ` +
            `treating as Starter/free-tier for feature "${feature}". Add it to PLAN_MAPPING in config/planFeatures.ts.`
        );
    }
    const allowedPlans = FEATURE_MATRIX[feature] as unknown as string[];
    return allowedPlans.includes(normalizedPlan || PLAN_NAMES.STARTER);
};

export const getRequiredPlanForFeature = (feature: FeatureKey): string => {
    const allowedPlans = FEATURE_MATRIX[feature] as unknown as any[];
    if (allowedPlans.includes(PLAN_NAMES.PROFESSIONAL)) return 'Professional';
    if (allowedPlans.includes(PLAN_NAMES.PROFESSIONAL_PLUS)) return 'Professional Plus';
    if (allowedPlans.includes(PLAN_NAMES.ENTERPRISE)) return 'Enterprise';
    return 'Professional';
};
