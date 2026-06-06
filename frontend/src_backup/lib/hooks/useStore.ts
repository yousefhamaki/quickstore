import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStore, updateStore, publishStore, pauseStore, resumeStore } from '@/lib/api/stores';
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
