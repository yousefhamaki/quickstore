import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStores, createStore, deleteStore, pauseStore, resumeStore } from '@/lib/api/stores';
import { toast } from 'sonner';

export const useStores = () => {
    return useQuery({
        queryKey: ['stores'],
        queryFn: getStores,
    });
};

export const useCreateStore = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createStore,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Store created successfully!');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create store');
        },
    });
};

export const useDeleteStore = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteStore,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            toast.success('Store deleted successfully');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete store');
        },
    });
};

export const usePauseStore = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => pauseStore(storeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            toast.success('Store paused');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to pause store');
        },
    });
};

export const useResumeStore = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => resumeStore(storeId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stores'] });
            queryClient.invalidateQueries({ queryKey: ['store', storeId] });
            toast.success('Store resumed');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to resume store');
        },
    });
};
