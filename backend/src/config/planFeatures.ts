export const PLAN_NAMES = {
    STARTER: 'starter',
    PROFESSIONAL: 'professional',
    PROFESSIONAL_PLUS: 'professional_plus',
    ENTERPRISE: 'enterprise'
} as const;

// Map DB names to internal standard keys
export const PLAN_MAPPING: Record<string, string> = {
    'Free': PLAN_NAMES.STARTER,
    'Basic': PLAN_NAMES.PROFESSIONAL,
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
    const normalizedPlan = PLAN_MAPPING[planName] || PLAN_NAMES.STARTER;
    const allowedPlans = FEATURE_MATRIX[feature] as unknown as string[];
    return allowedPlans.includes(normalizedPlan);
};
