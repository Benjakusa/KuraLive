import { useState, useEffect } from 'react';
import { FaDatabase, FaTable, FaSearch, FaSync, FaExclamationTriangle, FaCheckCircle, FaClock } from 'react-icons/fa';
import api from '../../lib/api';

const tables = [
    { key: 'users', label: 'Users', icon: '\ud83d\udc64' },
    { key: 'stations', label: 'Stations', icon: '\ud83d\udccd' },
    { key: 'results', label: 'Results', icon: '\ud83d\udcca' },
    { key: 'elections', label: 'Elections', icon: '\ud83d\uddf3\ufe0f' }
];

const AdminDatabase = () => {
    const [selectedTable, setSelectedTable] = useState('users');
    const [tableData, setTableData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [healthStatus, setHealthStatus] = useState(null);
    const [tableCounts, setTableCounts] = useState({});

    useEffect(() => {
        checkHealth();
        fetchCounts();
    }, []);

    useEffect(() => {
        fetchTableData();
    }, [selectedTable]);

    const checkHealth = async () => {
        try {
            const data = await api.checkHealth();
            setHealthStatus(data);
        } catch (err) {
            setHealthStatus({ status: 'error', latency: '0ms', message: err.message });
        }
    };

    const fetchCounts = async () => {
        try {
            const data = await api.getTableCounts();
            setTableCounts(data.counts || {});
        } catch (err) {
            console.error('Error fetching counts:', err);
        }
    };

    const fetchTableData = async () => {
        setLoading(true);
        try {
            const data = await api.getTableData(selectedTable);
            setTableData(data.data || []);
        } catch (err) {
            setTableData([]);
        }
        setLoading(false);
    };

    const getColumns = () => {
        if (tableData.length === 0) return [];
        return Object.keys(tableData[0]);
    };

    const filteredData = tableData.filter(row => {
        if (!searchQuery) return true;
        return Object.values(row).some(val =>
            String(val).toLowerCase().includes(searchQuery.toLowerCase())
        );
    });

    const formatValue = (value, key) => {
        if (value === null || value === undefined) return <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>null</span>;
        if (typeof value === 'object') return <pre style={{ margin: 0, fontSize: '0.7rem', maxHeight: '60px', overflow: 'auto' }}>{JSON.stringify(value, null, 2)}</pre>;
        if (key.includes('timestamp') || key.includes('created_at') || key.includes('updated_at') || key.includes('expires_at')) {
            try { return new Date(value).toLocaleString(); } catch { return String(value); }
        }
        if (typeof value === 'boolean') return value ? '\u2713' : '\u2717';
        return String(value);
    };

    const handleRefresh = async () => {
        await Promise.all([checkHealth(), fetchCounts(), fetchTableData()]);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Database Inspector</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 'var(--space-1) 0 0' }}>Browse and inspect raw table data</p>
                </div>
                <button className="btn btn-outline" onClick={handleRefresh}><FaSync style={{ marginRight: 'var(--space-2)' }} /> Refresh All</button>
            </div>

            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    {healthStatus?.status === 'healthy' ? <FaCheckCircle style={{ color: 'var(--success)' }} />
                        : healthStatus?.status === 'error' ? <FaExclamationTriangle style={{ color: 'var(--danger)' }} />
                        : <FaClock style={{ color: 'var(--color-text-muted)' }} />}
                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>
                        {healthStatus?.status === 'healthy' ? 'Database Healthy' : healthStatus?.status === 'error' ? 'Connection Error' : 'Checking...'}
                    </span>
                </div>
                {healthStatus && (
                    <>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Latency: {healthStatus.latency}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{healthStatus.message}</span>
                    </>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                {tables.map(table => (
                    <button key={table.key} onClick={() => setSelectedTable(table.key)} style={{
                        padding: 'var(--space-4)', backgroundColor: selectedTable === table.key ? 'rgba(0, 230, 230, 0.08)' : 'var(--color-surface)',
                        border: `1px solid ${selectedTable === table.key ? 'var(--turquoise-bright)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)',
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease', fontFamily: 'inherit'
                    }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>{table.icon}</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: '500', color: selectedTable === table.key ? 'var(--turquoise-bright)' : 'var(--color-text-main)' }}>{table.label}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', marginTop: 'var(--space-1)', color: 'var(--color-text-main)' }}>{tableCounts[table.key] ?? '...'}</div>
                    </button>
                ))}
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
                <div style={{ position: 'relative', maxWidth: '400px' }}>
                    <FaSearch style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }} />
                    <input type="text" placeholder={`Search ${selectedTable}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '100%', padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-8)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--turquoise-bright)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                    />
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                        <div style={{ width: '30px', height: '30px', margin: '0 auto var(--space-3)', border: '2px solid rgba(0, 230, 230, 0.1)', borderTopColor: 'var(--turquoise-bright)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                        Loading records...
                    </div>
                ) : filteredData.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--color-text-muted)' }}>
                        <FaTable style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)', opacity: 0.3 }} />
                        <p>{searchQuery ? 'No records match your search.' : 'No records found.'}</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {getColumns().map(col => (
                                        <th key={col} style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', fontWeight: '600', whiteSpace: 'nowrap', backgroundColor: 'var(--color-surface)', position: 'sticky', top: 0 }}>
                                            {col.replace(/_/g, ' ')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-light)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        {getColumns().map(col => (
                                            <td key={col} style={{ padding: 'var(--space-3) var(--space-4)', fontSize: '0.8rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: col === 'id' ? 'var(--color-text-muted)' : 'var(--color-text-main)' }}>
                                                {formatValue(row[col], col)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>Showing {filteredData.length} of {tableData.length} records</span>
                    <span style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}>Table: {selectedTable}</span>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AdminDatabase;
