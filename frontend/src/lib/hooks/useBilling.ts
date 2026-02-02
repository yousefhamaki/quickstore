import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as billingApi from '@/lib/api/billing';
import { toast } from 'sonner';

export const useBillingOverview = (enabled: boolean = true) => {
    return useQuery({
        queryKey: ['billingOverview'],
        queryFn: billingApi.getBillingOverview,
        refetchInterval: enabled ? 30000 : false, // Sync every 30s only if enabled
        enabled
    });
};

export const usePlans = () => {
    return useQuery({
        queryKey: ['plans'],
        queryFn: billingApi.getPlans,
    });
};

export const useRechargeWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (amount: number) => billingApi.rechargeWallet(amount),
        onSuccess: (data) => {
            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else if (data.success) {
                queryClient.invalidateQueries({ queryKey: ['billingOverview'] });
                queryClient.invalidateQueries({ queryKey: ['transactions'] });
                toast.success(data.message || 'Balance added successfully (Demo Mode)');
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Recharge failed');
        }
    });
};

export const useSubscribe = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (planId: string) => billingApi.subscribeToPlan(planId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['billingOverview'] });
            toast.success(data.message || 'Subscription updated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to subscribe');
        }
    });
};

export const useTransactions = (page = 1, limit = 10) => {
    return useQuery({
        queryKey: ['transactions', page, limit],
        queryFn: () => billingApi.getTransactions(page, limit),
        placeholderData: (previousData) => previousData,
    });
};

export const usePayFromWallet = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => billingApi.payFromWallet(),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['billingOverview'] });
            toast.success(data.message || 'Subscription activated successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Payment failed');
        }
    });
};

export const useReceipts = () => {
    return useQuery({
        queryKey: ['receipts'],
        queryFn: billingApi.getReceipts,
    });
};
