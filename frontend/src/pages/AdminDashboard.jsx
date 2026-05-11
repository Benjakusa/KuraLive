import { useState, useEffect } from 'react';
import {
    FaUsers, FaUserShield, FaUserTie, FaCheckCircle, FaBan,
    FaDatabase, FaSearch, FaCrown, FaExclamationTriangle
} from 'react-icons/fa';
import api from '../lib/api';
import { useTheme } from '../contexts/ThemeContext';

const AdminDashboard = () => {
    const { darkMode } = useTheme();
    const [stats, setStats] = useState({ totalClients: 0, activeUsers: 0, inactiveUsers: 0, totalStations: 0, totalResults: 0 });
    const [clients, setClients] = useState([]);
    const [subscriptions, setSubscriptions] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    const surface = darkMode ? 'rgba(0,26,26,0.6)' : '#ffffff';
    const border = darkMode ? 'rgba(0,230,230,0.12)' : '#e2e8f0';
    const mutedText = darkMode ? 'rgba(179,255,255,0.5)' : '#718096';
    const hoverBg = darkMode ? 'rgba(0,230,230,0.04)' : '#f0fafa';

    useEffect(() => { fetchAllData(); }, []);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const data = await api.getAdminStats();
            const all = data.profiles || [];
            const managerClients = all.filter(p => p.role === 'manager');
            setClients(managerClients);
            setSubscriptions(data.subscriptions || []);
            setStats(data.stats);
        } catch (err) {
            console.error('Error fetching admin data:', err);
        }
        setLoading(false);
    };

    const toggleClientStatus = async (clientId, currentStatus) => {
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
        try {
            await api.toggleClientStatus(clientId, newStatus);
            setClients(prev => prev.map(c => c.id === clientId ? { ...c, status: newStatus } : c));
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    };

    const getSubForManager = (managerId) => subscriptions.find(s => s.manager_id === managerId);

    const trialExpired = (sub) => {
        if (!sub) return false;
        if (sub.status === 'active') return false;
        return new Date(sub.trial_expires_at) < new Date();
    };

    const daysLeft = (sub) => {
        if (!sub?.trial_expires_at) return 0;
        return Math.max(0, Math.ceil((new Date(sub.trial_expires_at) - new Date()) / 86400000));
    };

    const filteredClients = clients.filter(c => {
        const q = searchQuery.toLowerCase();
        return (c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    });

    const planBadge = (plan) => {
        const colors = { free: '#718096', medium: '#3182ce', enterprise: 'var(--teal)' };
        const labels = { free: 'Free', medium: 'Standard', enterprise: 'Enterprise' };
        return (
            <span style={{
                padding: '2px 8px', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '600',
                background: `${colors[plan] || '#718096'}18`, color: colors[plan] || '#718096',
                border: `1px solid ${colors[plan] || '#718096'}40`,
                textTransform: 'capitalize',
            }}>
                {labels[plan] || plan}
            </span>
        );
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '4rem', color: mutedText }}>
            <div style={{ width: '40px', height: '40px', margin: '0 auto 1rem', border: '3px solid rgba(0,230,230,0.1)', borderTopColor: 'var(--turquoise-bright)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            Loading...
        </div>
    );

    return (
        <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {[
                    { title: 'Total Clients', value: stats.totalClients, icon: <FaUsers />, color: 'var(--turquoise-bright)' },
                    { title: 'Active Clients', value: stats.activeUsers, icon: <FaCheckCircle />, color: '#38a169' },
                    { title: 'Inactive Clients', value: stats.inactiveUsers, icon: <FaBan />, color: '#e53e3e' },
                    { title: 'Total Results', value: stats.totalResults, icon: <FaDatabase />, color: '#d69e2e' },
                ].map(s => (
                    <div key={s.title} className="card" style={{
                        display: 'flex', alignItems: 'center', gap: '1rem',
                        padding: '1.25rem',
                    }}>
                        <div style={{
                            width: '2.5rem', height: '2.5rem', borderRadius: '0.625rem',
                            background: `${s.color}18`, color: s.color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem',
                        }}>
                            {s.icon}
                        </div>
                        <div>
                            <div style={{ fontSize: '1.6rem', fontWeight: '800', lineHeight: 1, color: darkMode ? '#fff' : '#1a202c' }}>{s.value}</div>
                            <div style={{ fontSize: '0.72rem', color: mutedText, marginTop: '2px' }}>{s.title}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="card table-responsive" style={{ padding: 0 }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '1rem', margin: 0, color: darkMode ? '#fff' : '#1a202c' }}>Client Directory</h2>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ position: 'relative' }}>
                            <FaSearch style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: mutedText, fontSize: '0.72rem' }} />
                            <input
                                type="text" placeholder="Search clients..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    padding: '0.5rem 0.75rem 0.5rem 2rem',
                                    background: darkMode ? 'rgba(0,0,0,0.3)' : '#f7f9fb',
                                    border: `1px solid ${border}`, borderRadius: '0.5rem',
                                    color: darkMode ? '#e2e8f0' : '#1a202c',
                                    fontSize: '0.82rem', fontFamily: 'inherit', outline: 'none', width: '200px',
                                }}
                            />
                        </div>
                    </div>
                </div>

                <div className="table-responsive">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: `1px solid ${border}` }}>
                                {['Client', 'Role', 'Plan', 'Trial Status', 'Account', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: h === 'Actions' ? 'right' : h === 'Trial Status' || h === 'Account' ? 'center' : 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: mutedText, fontWeight: '600' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: '2.5rem', textAlign: 'center', color: mutedText, fontSize: '0.9rem' }}>No clients found.</td></tr>
                            ) : filteredClients.map((client) => {
                                const sub = client.role === 'manager' ? getSubForManager(client.id) : null;
                                const expired = trialExpired(sub);
                                const days = daysLeft(sub);
                                return (
                                    <tr key={client.id} style={{ borderBottom: `1px solid ${border}`, transition: 'background 0.15s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = hoverBg}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <div style={{ fontWeight: '500', fontSize: '0.88rem', color: darkMode ? '#e2e8f0' : '#1a202c' }}>{client.name || 'Unknown'}</div>
                                            <div style={{ fontSize: '0.75rem', color: mutedText }}>{client.email}</div>
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            <span style={{
                                                padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
                                                background: 'rgba(0,128,128,0.12)',
                                                color: 'var(--teal)',
                                                border: '1px solid transparent',
                                                textTransform: 'capitalize',
                                            }}>Manager</span>
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem' }}>
                                            {sub ? planBadge(sub.plan) : <span style={{ color: mutedText, fontSize: '0.75rem' }}>---</span>}
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                                            {sub ? (
                                                sub.status === 'active' ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#38a169' }}>
                                                        <FaCrown style={{ fontSize: '0.65rem' }} /> Active
                                                    </span>
                                                ) : expired ? (
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#e53e3e' }}>
                                                        <FaExclamationTriangle style={{ fontSize: '0.65rem' }} /> Expired
                                                    </span>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: days <= 3 ? '#d69e2e' : mutedText }}>
                                                        {days}d left
                                                    </span>
                                                )
                                            ) : <span style={{ color: mutedText, fontSize: '0.75rem' }}>---</span>}
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 10px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '600',
                                                background: client.status === 'Active' ? 'rgba(56,161,105,0.15)' : 'rgba(229,62,62,0.1)',
                                                color: client.status === 'Active' ? '#38a169' : '#e53e3e',
                                            }}>{client.status || 'Unknown'}</span>
                                        </td>
                                        <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                                            <button onClick={() => toggleClientStatus(client.id, client.status)} style={{
                                                background: 'none', border: `1px solid ${border}`, borderRadius: '0.4rem',
                                                cursor: 'pointer', padding: '4px 12px', fontSize: '0.72rem',
                                                fontFamily: 'inherit', transition: 'all 0.2s',
                                                color: client.status === 'Active' ? '#d69e2e' : '#38a169',
                                            }}>
                                                {client.status === 'Active' ? 'Deactivate' : 'Activate'}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div style={{ padding: '0.875rem 1.5rem', borderTop: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: mutedText }}>
                    <span>Showing {filteredClients.length} of {clients.length} clients</span>
                    <button onClick={fetchAllData} style={{
                        padding: '5px 14px', fontSize: '0.78rem', fontFamily: 'inherit',
                        background: darkMode ? 'rgba(0,230,230,0.07)' : '#f0fafa',
                        border: `1px solid ${border}`, borderRadius: '0.4rem',
                        color: darkMode ? 'var(--turquoise-bright)' : 'var(--teal)', cursor: 'pointer',
                    }}>Refresh</button>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AdminDashboard;
