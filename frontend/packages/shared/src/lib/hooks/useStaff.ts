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
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['store-staff', storeId] });
            // The invite is always created even if the email fails to send
            // (e.g. the sending account hit its provider quota) — surface
            // that distinction instead of always claiming success, and give
            // the owner the raw link to share manually as a fallback.
            if (data.emailSent) {
                toast.success('Invitation sent');
            } else {
                toast.error(
                    `Invite created, but the email failed to send${data.emailError ? `: ${data.emailError}` : '.'} Share this link with them directly: ${data.acceptUrl}`,
                    { duration: 15000 }
                );
            }
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
