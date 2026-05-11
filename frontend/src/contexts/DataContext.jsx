import { createContext, useState, useContext, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const DataContext = createContext(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) {
        throw new Error('useData() must be used within a DataProvider');
    }
    return context;
};

export const DataProvider = ({ children }) => {
    const [electionDetails, setElectionDetails] = useState(null);
    const [stations, setStations] = useState([]);
    const [agents, setAgents] = useState([]);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { currentUser } = useAuth();

    // For managers: their own uid is the manager_id scope.
    // For agents: their manager's uid.
    // For admin: no scope (null → sees all, handled by RLS).
    const getManagerId = () => {
        if (!currentUser) return null;
        if (currentUser.role === 'manager') return currentUser.uid;
        if (currentUser.role === 'agent') return currentUser.manager_id;
        return null; // admin: RLS allows all
    };

    const fetchData = async () => {
        if (!currentUser) return;
        setLoading(true);
        setError(null);
        const managerId = getManagerId();
        try {
            const [election, stationsData, agentsData, resultsData] = await Promise.all([
                api.getElection(managerId),
                api.getStations(managerId, currentUser),
                api.getAgents(managerId, currentUser),
                api.getResults(managerId),
            ]);

            setElectionDetails(election?.data || null);
            setStations(stationsData?.data || []);
            setAgents(agentsData?.data || []);
            setResults(resultsData?.data || []);
        } catch (err) {
            const message = err.message || 'Failed to load data. Please refresh.';
            setError(message);
            console.error('Error fetching data:', err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [currentUser]);

    const saveElectionDetails = async (details) => {
        setError(null);
        try {
            await api.saveElection(details, getManagerId());
            setElectionDetails(details);
        } catch (err) {
            setError(err.message || 'Failed to save election data.');
            throw err;
        }
    };

    const addStation = async (station) => {
        setError(null);
        try {
            const res = await api.addStation(station, getManagerId());
            setStations(prev => [...prev, res?.data || res]);
        } catch (err) {
            setError(err.message || 'Failed to add station.');
            throw err;
        }
    };

    const deleteStation = async (id) => {
        setError(null);
        try {
            await api.deleteStation(id);
            setStations(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            setError(err.message || 'Failed to delete station.');
            throw err;
        }
    };

    const addAgent = async (agent) => {
        setError(null);
        try {
            const res = await api.addAgent(agent, getManagerId());
            setAgents(prev => [...prev, res?.data || res]);
            return res;
        } catch (err) {
            setError(err.message || 'Failed to create agent.');
            throw err;
        }
    };

    const updateAgent = async (updatedAgent) => {
        setError(null);
        try {
            const { id, ...data } = updatedAgent;
            const dbData = {};
            if (data.name !== undefined) dbData.name = data.name;
            if (data.email !== undefined) dbData.email = data.email;
            if (data.status !== undefined) dbData.status = data.status;
            if (data.station_id !== undefined) dbData.station_id = data.station_id;
            if (data.permissions !== undefined) dbData.permissions = data.permissions;
            if (data.submission_status !== undefined) dbData.submission_status = data.submission_status;
            const res = await api.updateAgent(id, dbData);
            setAgents(prev => prev.map(a => a.id === id ? { ...a, ...(res?.data || res) } : a));
        } catch (err) {
            setError(err.message || 'Failed to update agent.');
            throw err;
        }
    };

    const deleteAgent = async (id) => {
        setError(null);
        try {
            await api.deleteAgent(id);
            setAgents(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            setError(err.message || 'Failed to delete agent.');
            throw err;
        }
    };

    const submitResult = async (result) => {
        setError(null);
        try {
            const res = await api.submitResult(result, getManagerId());
            const item = res?.data || res;
            setResults(prev => [item, ...prev]);
            return item;
        } catch (err) {
            setError(err.message || 'Failed to submit result.');
            throw err;
        }
    };

    const clearError = () => setError(null);

    const value = {
        electionDetails,
        saveElectionDetails,
        stations,
        addStation,
        deleteStation,
        agents,
        addAgent,
        updateAgent,
        deleteAgent,
        results,
        submitResult,
        loading,
        error,
        clearError,
        refreshData: fetchData,
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};
