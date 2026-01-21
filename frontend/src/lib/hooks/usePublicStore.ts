import { useQuery } from '@tanstack/react-query';
import { getPublicStore } from '@/services/publicStoreService';
import { Store } from '@/types/store';

export const usePublicStore = (subdomain: string) => {
    return useQuery<Store>({
        queryKey: ['publicStore', subdomain],
        queryFn: () => getPublicStore(subdomain),
        enabled: !!subdomain,
    });
};
