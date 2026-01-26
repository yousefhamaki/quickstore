import { useQuery } from '@tanstack/react-query';
import * as analyticsApi from '@/lib/api/analytics';

export const useAnalyticsOverview = (days = 30) => {
    return useQuery({
        queryKey: ['analyticsOverview', days],
        queryFn: () => analyticsApi.getAnalyticsOverview(days),
        refetchInterval: 60000, // Refresh every minute
    });
};

export const useRecentOrdersAnalytics = (limit = 5) => {
    return useQuery({
        queryKey: ['recentOrdersAnalytics', limit],
        queryFn: () => analyticsApi.getRecentOrdersAnalytics(limit),
    });
};
