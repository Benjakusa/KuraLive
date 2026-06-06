/**
 * useElection - TanStack React Query hook for election data.
 * Replaces the polling slice of DataContext.
 * Cached for 5 minutes; auto-refetches when window regains focus.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useElection(managerId) {
    return useQuery({
        queryKey: ['election', managerId],
        queryFn: () => api.getElection(managerId),
        select: (res) => res?.data ?? null,
        staleTime: 5 * 60 * 1000,
        enabled: true,
    });
}

export function useSaveElection(managerId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (details) => api.saveElection(details, managerId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['election', managerId] }),
    });
}
