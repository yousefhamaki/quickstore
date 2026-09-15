export const PLAN_NAMES = {
    STARTER: 'starter',
    PROFESSIONAL: 'professional',
    PROFESSIONAL_PLUS: 'professional_plus',
    ENTERPRISE: 'enterprise'
} as const;

// Map DB names (SubscriptionPlan.name — the internal short name, not
// name_en/name_ar) to the internal standard keys above.
//
// IMPORTANT: this MUST be kept in sync with whatever SubscriptionPlan.name
// values actually exist in the database — 'Free'/'Basic'/'Pro' below were
// the names in the original seed script (seedPlans.ts), but the live plans
// were later renamed to 'Starter'/'Professional'/'Professional Plus' (e.g.
// via the admin plan editor) WITHOUT this map being updated. Since
// canAccessFeature() silently falls back to STARTER for any unrecognized
// name (see below), that drift meant paying customers on the
// 'Professional' plan were silently treated as free-tier for coupons,
// pixels, SEO, abandoned-cart recovery, and offers/UCD — exactly the "why
// do I see upgrade to Pro" bug reported against a live account.
//
// Prefer keying plan-gating off `SubscriptionPlan.features.*` booleans
// (already used for customDomain/dropshipping/allowUCD) over adding more
// names here where practical — a boolean on the plan document itself can't
// drift out of sync with a rename the way this string table can.
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
    ai_marketing: [PLAN_NAMES.ENTERPRISE],
    ucd: [PLAN_NAMES.PROFESSIONAL_PLUS, PLAN_NAMES.ENTERPRISE],
} as const;

export type FeatureKey = keyof typeof FEATURE_MATRIX;

export const canAccessFeature = (planName: string, feature: FeatureKey): boolean => {
    const normalizedPlan = PLAN_MAPPING[planName];
    if (!normalizedPlan) {
        // Fails safe (denies the feature) rather than crash, but this
        // should never happen for a real plan — log loudly so a future
        // rename doesn't silently lock out paying customers again like it
        // did before this was added (see the comment on PLAN_MAPPING above).
        console.error(
            `[planFeatures] Unrecognized SubscriptionPlan.name "${planName}" is not in PLAN_MAPPING — ` +
            `treating as Starter/free-tier for feature "${feature}". Add it to PLAN_MAPPING in config/planFeatures.ts.`
        );
    }
    const allowedPlans = FEATURE_MATRIX[feature] as unknown as string[];
    return allowedPlans.includes(normalizedPlan || PLAN_NAMES.STARTER);
};
