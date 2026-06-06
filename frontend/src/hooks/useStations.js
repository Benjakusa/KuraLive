/**
 * useStations - TanStack React Query hooks for stations.
 * Supports server-side pagination: pass { page, pageSize } to control fetching.
 * Default page=1, pageSize=50 — only fetch what's needed, not everything at boot.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useStations({ managerId, page = 1, pageSize = 50 } = {}) {
    const offset = (page - 1) * pageSize;
    return useQuery({
        queryKey: ['stations', managerId, page, pageSize],
        queryFn: () => api.getStations(managerId, pageSize, offset),
        select: (res) => ({
            data: res?.data ?? [],
            pagination: res?.pagination ?? { total: 0 },
        }),
        staleTime: 2 * 60 * 1000,
        keepPreviousData: true,  // smooth page transitions
    });
}

export function useAddStation(managerId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (station) => api.addStation(station, managerId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations', managerId] }),
    });
}

export function useDeleteStation(managerId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => api.deleteStation(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stations', managerId] }),
    });
}
