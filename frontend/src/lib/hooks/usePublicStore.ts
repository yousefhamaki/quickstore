import { useQuery } from '@tanstack/react-query';
import { getPublicStore } from '@/services/publicStoreService';

export const usePublicStore = (subdomain: string) => {
    return useQuery({
        queryKey: ['publicStore', subdomain],
        queryFn: () => getPublicStore(subdomain),
        enabled: !!subdomain,
    });
};
