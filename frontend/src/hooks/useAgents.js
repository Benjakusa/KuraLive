/**
 * useAgents - TanStack React Query hooks for agents.
 * Server-side pagination: only fetches the current page.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export function useAgents({ managerId, page = 1, pageSize = 50 } = {}) {
    const offset = (page - 1) * pageSize;
    return useQuery({
        queryKey: ['agents', managerId, page, pageSize],
        queryFn: () => api.getAgents(managerId, pageSize, offset),
        select: (res) => ({
            data: res?.data ?? [],
            pagination: res?.pagination ?? { total: 0 },
        }),
        staleTime: 2 * 60 * 1000,
        keepPreviousData: true,
    });
}

export function useAddAgent(managerId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (agent) => api.addAgent(agent, managerId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents', managerId] }),
    });
}

export function useUpdateAgent(managerId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...updates }) => api.updateAgent(id, updates),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents', managerId] }),
    });
}

export function useDeleteAgent(managerId) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id) => api.deleteAgent(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['agents', managerId] }),
    });
}
