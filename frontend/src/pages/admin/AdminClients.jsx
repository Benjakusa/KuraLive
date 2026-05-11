import { useState, useEffect } from 'react';
import { FaUsers, FaUserPlus, FaUserEdit, FaTrash, FaSearch, FaEnvelope, FaKey, FaCrown, FaBell, FaVolumeMute, FaVolumeUp, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import api, { setToken } from '../../lib/api';

const AdminClients = () => {
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [formData, setFormData] = useState({
        name: '', email: '', role: 'manager', stationId: '', status: 'Active', permissions: 'edit'
    });
    const [error, setError] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await api.getAdminClients();
            setClients(data.data || []);
        } catch (err) {
            console.error('Error fetching clients:', err);
        }
        setLoading(false);
    };

    const openCreateModal = () => {
        setEditingClient(null);
        setFormData({ name: '', email: '', role: 'manager', stationId: '', status: 'Active', permissions: 'edit' });
        setError('');
        setShowModal(true);
    };

    const openEditModal = (client) => {
        setEditingClient(client);
        setFormData({
            name: client.name || '',
            email: client.email || '',
            role: client.role || 'manager',
            stationId: client.station_id || '',
            status: client.status || 'Active',
            permissions: client.permissions || 'edit'
        });
        setError('');
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this manager? This action cannot be undone.')) return;
        try {
            await api.deleteAdminClient(id);
            setClients(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            console.error('Error deleting client:', err);
        }
    };

    const handleToggleMute = async (client) => {
        const newStatus = client.status === 'Suspended' ? 'Active' : 'Suspended';
        if (!confirm(`Are you sure you want to ${newStatus === 'Suspended' ? 'mute/suspend' : 'unmute/activate'} ${client.name}?`)) return;
        try {
            await api.toggleClientStatus(client.id, newStatus);
            setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: newStatus } : c));
        } catch (err) {
            console.error('Error toggling status:', err);
        }
    };

    const handleSendReminder = (client) => {
        alert(`Reminder email sent to ${client.email} regarding their package expiry.`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (editingClient) {
            try {
                await api.updateAdminClient(editingClient.id, formData);
                setClients(prev => prev.map(c =>
                    c.id === editingClient.id
                        ? { ...c, ...formData, station_id: formData.stationId || null }
                        : c
                ));
                setShowModal(false);
            } catch (err) {
                setError(err.message);
            }
        } else {
            const tempPassword = formData.name.split(' ').join('').toLowerCase() + '123!';
            try {
                const data = await api.signup(formData.email, tempPassword, formData.role, formData.name);
                const userId = data.user.id;

                await api.updateAdminClient(userId, {
                    station_id: formData.stationId || null,
                    status: formData.status,
                    permissions: formData.permissions
                });

                await fetchData();
                setShowModal(false);
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const filteredClients = clients.filter(client => {
        const matchesSearch = client.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = filterRole === 'all' || client.role === filterRole;
        const matchesStatus = filterStatus === 'all' || client.status === filterStatus;
        return matchesSearch && matchesRole && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filteredClients.length / itemsPerPage));
    const currentClients = filteredClients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
                <div style={{
                    width: '40px', height: '40px', margin: '0 auto var(--space-4)',
                    border: '3px solid rgba(0, 230, 230, 0.1)', borderTopColor: 'var(--turquoise-bright)',
                    borderRadius: '50%', animation: 'spin 0.8s linear infinite'
                }} />
                Loading clients...
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Client Management</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 'var(--space-1) 0 0' }}>
                        Create, edit, and manage all client accounts
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <FaUserPlus style={{ marginRight: 'var(--space-2)' }} /> Add Client
                </button>
            </div>

            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-6)', display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                    <FaSearch style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }} />
                    <input type="text" placeholder="Search by name or email..." value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                        style={{ width: '100%', padding: 'var(--space-2) var(--space-3) var(--space-2) var(--space-8)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--turquoise-bright)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                    />
                </div>
                <select value={filterRole} onChange={(e) => { setFilterRole(e.target.value); setCurrentPage(1); }}
                    style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}>
                    <option value="all">All Roles</option>
                    <option value="manager">Managers</option>
                    <option value="admin">Admins</option>
                </select>
                <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}>
                    <option value="all">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                </select>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''}
                </span>
            </div>

            <div className="card table-responsive">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>Client</th>
                            <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>Status & Role</th>
                            <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>Stats</th>
                            <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>Subscription</th>
                            <th style={{ padding: 'var(--space-3) var(--space-4)', color: 'var(--color-text-muted)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentClients.length === 0 ? (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
                                    <FaUsers style={{ fontSize: '2rem', marginBottom: 'var(--space-4)', opacity: 0.3 }} />
                                    <p>No clients found matching your criteria.</p>
                                </td>
                            </tr>
                        ) : (
                            currentClients.map(client => (
                                <tr key={client.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: client.status === 'Inactive' ? 0.6 : 1, transition: 'background-color 0.2s ease' }}>
                                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--color-text-main)', marginBottom: '4px' }}>
                                            {client.name || 'Unknown'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)' }}>
                                            <FaEnvelope style={{ fontSize: '0.7rem' }} /> {client.email}
                                        </div>
                                    </td>
                                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                                            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-full)', fontSize: '0.7rem', backgroundColor: client.status === 'Active' ? 'rgba(0, 255, 127, 0.15)' : client.status === 'Suspended' ? 'rgba(255, 193, 7, 0.15)' : 'var(--gray-400)', color: client.status === 'Active' ? 'var(--success)' : client.status === 'Suspended' ? 'var(--warning)' : 'white' }}>
                                                {client.status || 'Unknown'}
                                            </span>
                                            <span style={{ padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', textTransform: 'uppercase', backgroundColor: 'rgba(0, 230, 230, 0.08)', color: 'var(--turquoise-bright)', border: '1px solid rgba(0, 230, 230, 0.2)' }}>
                                                {client.role}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Elec.</div>
                                                <div style={{ fontWeight: 'bold' }}>{client.electionsCount || 0}</div>
                                            </div>
                                            <div style={{ textAlign: 'center' }}>
                                                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Agts.</div>
                                                <div style={{ fontWeight: 'bold' }}>{client.agentsCount || 0}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                        {client.subscription && (() => {
                                            const sub = client.subscription;
                                            const isTrial = sub.plan === 'free';
                                            let daysLeft = 0;
                                            if (sub.trial_expires_at) {
                                                const diff = new Date(sub.trial_expires_at) - new Date();
                                                daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
                                            }
                                            return (
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
                                                    <span style={{ padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'rgba(0, 179, 179, 0.08)', color: 'var(--teal)', border: '1px solid rgba(0, 179, 179, 0.2)' }}>
                                                        <FaCrown size={10} /> {sub.plan}
                                                    </span>
                                                    {isTrial ? (
                                                        <span style={{ padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', backgroundColor: daysLeft === 0 ? 'rgba(229,62,62,0.1)' : 'rgba(255, 193, 7, 0.08)', color: daysLeft === 0 ? 'var(--danger)' : 'var(--warning)', border: daysLeft === 0 ? '1px solid rgba(229,62,62,0.2)' : '1px solid rgba(255, 193, 7, 0.2)' }}>
                                                            {daysLeft === 0 ? 'Expired' : `${daysLeft}d left`}
                                                        </span>
                                                    ) : (
                                                        <span style={{ padding: '2px 6px', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', backgroundColor: 'rgba(56,161,105,0.1)', color: 'var(--success)', border: '1px solid rgba(56,161,105,0.2)' }}>
                                                            Paid
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                            <button onClick={() => openEditModal(client)} title="Edit" style={{ background: 'transparent', border: 'none', color: 'var(--turquoise-bright)', cursor: 'pointer', padding: '4px' }}>
                                                <FaUserEdit size={16} />
                                            </button>
                                            <button onClick={() => handleSendReminder(client)} title="Reminder" style={{ background: 'transparent', border: 'none', color: 'var(--warning)', cursor: 'pointer', padding: '4px' }}>
                                                <FaBell size={16} />
                                            </button>
                                            <button onClick={() => handleToggleMute(client)} title={client.status === 'Suspended' ? 'Unmute' : 'Mute'} style={{ background: 'transparent', border: 'none', color: '#d69e2e', cursor: 'pointer', padding: '4px' }}>
                                                {client.status === 'Suspended' ? <FaVolumeUp size={16} /> : <FaVolumeMute size={16} />}
                                            </button>
                                            <button onClick={() => handleDelete(client.id)} title="Delete" style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                                                <FaTrash size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--color-border)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredClients.length)} of {filteredClients.length}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: currentPage === 1 ? 'var(--color-text-muted)' : 'var(--color-text-main)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                <FaChevronLeft size={12} /> Prev
                            </button>
                            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: currentPage === totalPages ? 'var(--color-text-muted)' : 'var(--color-text-main)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                                Next <FaChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }} onClick={() => setShowModal(false)}>
                    <div className="card" style={{ width: '100%', maxWidth: '480px', padding: 'var(--space-6)', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: '1.125rem', margin: '0 0 var(--space-4)' }}>
                            {editingClient ? 'Edit Client' : 'Create New Client'}
                        </h3>

                        {error && (
                            <div style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-4)', backgroundColor: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', fontSize: '0.85rem' }}>
                                {error}
                            </div>
                        )}

                        {!editingClient && (
                            <div style={{ padding: 'var(--space-3)', marginBottom: 'var(--space-4)', backgroundColor: 'rgba(0, 230, 230, 0.05)', border: '1px solid rgba(0, 230, 230, 0.15)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                                <FaKey style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span>A temporary password will be generated: <strong>{formData.name ? formData.name.split(' ').join('').toLowerCase() + '123!' : 'name123!'}</strong></span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Full Name</label>
                                    <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--turquoise-bright)'}
                                        onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                                    />
                                </div>

                                {!editingClient && (
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Email</label>
                                        <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}
                                            onFocus={(e) => e.target.style.borderColor = 'var(--turquoise-bright)'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Role</label>
                                    <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 'var(--space-4)' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Status</label>
                                        <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}>
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Permissions</label>
                                        <select value={formData.permissions} onChange={(e) => setFormData({ ...formData, permissions: e.target.value })} style={{ width: '100%', padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none' }}>
                                            <option value="edit">Edit</option>
                                            <option value="view">View Only</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
                                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>{editingClient ? 'Save Changes' : 'Create Client'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AdminClients;
