import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStore, updateStore, publishStore, pauseStore, resumeStore, setCustomDomain, verifyCustomDomain, removeCustomDomain } from '@shared/lib/api/stores';
import { toast } from 'sonner';

export const useStore = (storeId: string) => {
    return useQuery({
        queryKey: ['store', storeId],
        queryFn: () => getStore(storeId),
        enabled: !!storeId,
    });
};

export const useUpdateStore = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: any) => updateStore(storeId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Settings updated');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Update failed');
        },
    });
};

export const usePublishStore = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => publishStore(storeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            // Success toast handled by component usually, but adding here as fallback
            toast.success('Store is now LIVE!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Publish failed');
        },
    });
};

export const usePauseStore = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => pauseStore(storeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Store paused');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Pause failed');
        },
    });
};

export const useSetCustomDomain = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (customDomain: string) => setCustomDomain(storeId, customDomain),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save custom domain');
        },
    });
};

export const useVerifyCustomDomain = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => verifyCustomDomain(storeId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            if (data.isVerified) {
                toast.success('Domain verified!');
            } else {
                toast.error(data.message || 'Verification failed — DNS record not found yet.');
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Verification check failed');
        },
    });
};

export const useRemoveCustomDomain = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => removeCustomDomain(storeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            toast.success('Custom domain removed');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to remove custom domain');
        },
    });
};

export const useResumeStore = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => resumeStore(storeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Store resumed');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Resume failed');
        },
    });
};
