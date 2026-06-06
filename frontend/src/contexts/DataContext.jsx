/**
 * DataContext — backward-compatible shim over TanStack React Query hooks.
 *
 * EXISTING COMPONENTS: continue to call `useData()` exactly as before.
 * NEW COMPONENTS: import the granular hooks from src/hooks/ directly for
 *   full control over pagination, loading states, and cache invalidation.
 *
 * This context exposes the same API surface as before so no page-level
 * refactoring is required to benefit from the new Query layer.
 */
import { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';
import { useElection, useSaveElection } from '../hooks/useElection';
import { useStations, useAddStation, useDeleteStation } from '../hooks/useStations';
import { useAgents, useAddAgent, useUpdateAgent, useDeleteAgent } from '../hooks/useAgents';
import { useResults, useSubmitResult } from '../hooks/useResults';

const DataContext = createContext(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error('useData() must be used within a DataProvider');
    return context;
};

export const DataProvider = ({ children }) => {
    const { currentUser } = useAuth();

    const managerId = (() => {
        if (!currentUser) return null;
        if (currentUser.role === 'manager') return currentUser.uid;
        if (currentUser.role === 'agent') return currentUser.manager_id;
        return null;
    })();

    // ── Queries ──────────────────────────────────────────────────────────────
    const electionQuery = useElection(managerId);
    const stationsQuery = useStations({ managerId });
    const agentsQuery = useAgents({ managerId });
    const resultsQuery = useResults({ managerId });

    // ── Mutations ─────────────────────────────────────────────────────────────
    const saveElectionMut = useSaveElection(managerId);
    const addStationMut = useAddStation(managerId);
    const deleteStationMut = useDeleteStation(managerId);
    const addAgentMut = useAddAgent(managerId);
    const updateAgentMut = useUpdateAgent(managerId);
    const deleteAgentMut = useDeleteAgent(managerId);
    const submitResultMut = useSubmitResult(managerId);

    // ── Unified loading / error ───────────────────────────────────────────────
    const loading = electionQuery.isLoading || stationsQuery.isLoading ||
        agentsQuery.isLoading || resultsQuery.isLoading;

    const error = electionQuery.error?.message || stationsQuery.error?.message ||
        agentsQuery.error?.message || resultsQuery.error?.message || null;

    // ── Legacy action wrappers (preserve original call signatures) ────────────
    const saveElectionDetails = (details) => saveElectionMut.mutateAsync(details);
    const addStation = (station) => addStationMut.mutateAsync(station);
    const deleteStation = (id) => deleteStationMut.mutateAsync(id);
    const addAgent = (agent) => addAgentMut.mutateAsync(agent);
    const updateAgent = ({ id, ...data }) => updateAgentMut.mutateAsync({ id, ...data });
    const deleteAgent = (id) => deleteAgentMut.mutateAsync(id);
    const submitResult = (result) => submitResultMut.mutateAsync(result);
    const refreshData = () => {
        electionQuery.refetch();
        stationsQuery.refetch();
        agentsQuery.refetch();
        resultsQuery.refetch();
    };

    const value = {
        // Data
        electionDetails: electionQuery.data ?? null,
        stations: stationsQuery.data?.data ?? [],
        agents: agentsQuery.data?.data ?? [],
        results: resultsQuery.data?.data ?? [],

        // Pagination metadata (available to new components)
        stationsPagination: stationsQuery.data?.pagination ?? { total: 0 },
        agentsPagination: agentsQuery.data?.pagination ?? { total: 0 },
        resultsPagination: resultsQuery.data?.pagination ?? { total: 0 },

        // Actions (backward-compatible)
        saveElectionDetails,
        addStation,
        deleteStation,
        addAgent,
        updateAgent,
        deleteAgent,
        submitResult,
        refreshData,

        // Status
        loading,
        error,
        clearError: () => { },   // React Query manages errors automatically
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
