import { useQuery } from '@tanstack/react-query';
import * as analyticsApi from '@/lib/api/analytics';

export const useAnalyticsOverview = (days = 30) => {
    return useQuery({
        queryKey: ['analyticsOverview', days],
        queryFn: () => analyticsApi.getAnalyticsOverview(days),
        refetchInterval: 300000, // Reduced from 60s to 5 minutes
        staleTime: 120000, // Consider data fresh for 2 minutes
    });
};

export const useRecentOrdersAnalytics = (limit = 5) => {
    return useQuery({
        queryKey: ['recentOrdersAnalytics', limit],
        queryFn: () => analyticsApi.getRecentOrdersAnalytics(limit),
    });
};
