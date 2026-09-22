import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getStoreStaff, inviteStoreStaff, removeStoreStaff, StoreStaffRole } from '@shared/lib/api/staff';
import { toast } from 'sonner';

export const useStoreStaff = (storeId: string) => {
    return useQuery({
        queryKey: ['store-staff', storeId],
        queryFn: () => getStoreStaff(storeId),
        enabled: !!storeId,
    });
};

export const useInviteStoreStaff = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: { email: string; role: StoreStaffRole }) => inviteStoreStaff(storeId, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-staff', storeId] });
            toast.success('Invitation sent');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to send invite');
        },
    });
};

export const useRemoveStoreStaff = (storeId: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (staffId: string) => removeStoreStaff(storeId, staffId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['store-staff', storeId] });
            toast.success('Staff member removed');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to remove staff member');
        },
    });
};
