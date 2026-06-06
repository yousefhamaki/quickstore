import { useQuery } from '@tanstack/react-query';
import { getStoreChecklist } from '@shared/lib/api/stores';

export const useStoreChecklist = (storeId: string) => {
    return useQuery({
        queryKey: ['storeChecklist', storeId],
        queryFn: () => getStoreChecklist(storeId),
        enabled: !!storeId,
        refetchInterval: 10000, // Poll every 10 seconds to update progress
    });
};
