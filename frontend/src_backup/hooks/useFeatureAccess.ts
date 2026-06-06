import { useAuth } from "@/context/AuthContext";
import { canAccessFeature, FeatureKey, getRequiredPlanForFeature } from "@/config/planFeatures";
import { useStore } from "@/lib/hooks/useStore";

export const useFeatureAccess = (feature?: FeatureKey, storeId?: string) => {
    const { user } = useAuth();
    const { data: store, isLoading } = useStore(storeId || "");

    let planName = 'Free';

    const storePlan = (store as any)?.subscriptionId?.planId?.name;
    const userPlan = user?.subscriptionPlan?.name;

    if (storeId && storePlan) {
        planName = storePlan;
    } else if (userPlan) {
        planName = userPlan;
    }

    const hasAccess = feature ? canAccessFeature(planName, feature) : false;
    const requiredPlan = feature ? getRequiredPlanForFeature(feature) : '';

    return {
        hasAccess,
        planName,
        requiredPlan,
        isLoading,
        checkAccess: (feat: FeatureKey) => canAccessFeature(planName, feat),
        getRequiredPlan: (feat: FeatureKey) => getRequiredPlanForFeature(feat)
    };
};
