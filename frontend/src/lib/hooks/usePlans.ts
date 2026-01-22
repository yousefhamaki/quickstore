'use client';

import { useQuery } from '@tanstack/react-query';
import * as billingApi from '@/lib/api/billing';

export const usePlans = () => {
    return useQuery({
        queryKey: ['plans'],
        queryFn: billingApi.getPlans,
    });
};
