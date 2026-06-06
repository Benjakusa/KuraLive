/**
 * useResults - TanStack React Query hooks for election results.
 * Low staleTime (30s) because results change frequently during live counting.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useResults({ managerId, page = 1, pageSize = 50 } = {}) {
    const offset = (page - 1) * pageSize;
    return useQuery({
        queryKey: ['results', managerId, page, pageSize],
        queryFn: () => api.getResults(managerId, pageSize, offset),
        select: (res) => ({
            data: res?.data ?? [],
            pagination: res?.pagination ?? { total: 0 },
        }),
        staleTime: 30 * 1000,         // 30s — live data needs to be fresh
        refetchInterval: 60 * 1000,   // background refetch every 60s automatically
        keepPreviousData: true,
    });
}

export function useSubmitResult(managerId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (result) => api.submitResult(result, managerId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['results', managerId] }),
    });
}
