import { useState } from 'react';
import { FaUserPlus, FaEnvelope, FaTrash, FaKey, FaCopy, FaEdit, FaBan, FaCheckCircle, FaUnlock, FaUserShield, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useData } from '../../contexts/DataContext';

const AgentManagement = () => {
    const { agents, stations, addAgent, updateAgent, deleteAgent, loading } = useData();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showCredentialsModal, setShowCredentialsModal] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [newAgent, setNewAgent] = useState({ name: '', email: '', phone: '', stationId: '', permissions: 'edit', password: '' });
    const [editingAgent, setEditingAgent] = useState(null);
    const [createdAgentCredentials, setCreatedAgentCredentials] = useState(null);
    const [error, setError] = useState(null);

    const getStationName = (id) => {
        if (!id) return 'Unassigned';
        const s = stations.find(st => st.id.toString() === id.toString());
        return s ? `${s.name} (${s.ward})` : 'Unknown Station';
    };

    const generatePassword = () => {
        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let retVal = "";
        for (let i = 0, n = charset.length; i < 8; ++i) {
            retVal += charset.charAt(Math.floor(Math.random() * n));
        }
        return retVal;
    };

    const handleInputChange = (e) => {
        setNewAgent({ ...newAgent, [e.target.name]: e.target.value });
    };

    const handleEditInputChange = (e) => {
        setEditingAgent({ ...editingAgent, [e.target.name]: e.target.value });
    };

    const handleAddAgent = async (e) => {
        e.preventDefault();
        setError(null);
        const password = newAgent.password || generatePassword();
        const agentData = {
            name: newAgent.name,
            email: newAgent.email,
            stationId: newAgent.stationId,
            password: password,
            status: 'Active',
            permissions: newAgent.permissions,
            submissionStatus: 'Pending'
        };

        try {
            const res = await addAgent(agentData);
            const backendPassword = res?.temp_password || password;
            setCreatedAgentCredentials({ email: agentData.email, password: backendPassword });
            setShowAddModal(false);
            setShowCredentialsModal(true);
            setNewAgent({ name: '', email: '', phone: '', stationId: '', permissions: 'edit', password: '' });
        } catch (err) {
            setError(err.message || 'Failed to create agent. Please try again.');
        }
    };

    const handleUpdateAgent = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await updateAgent(editingAgent);
            setShowEditModal(false);
            setEditingAgent(null);
        } catch (err) {
            setError('Failed to update agent. Please try again.');
        }
    };

    const openEditModal = (agent) => {
        setEditingAgent({
            id: agent.id,
            name: agent.name,
            email: agent.email,
            phone: agent.phone || '',
            station_id: agent.station_id || '',
            permissions: agent.permissions || 'edit',
            status: agent.status || 'Active',
            submission_status: agent.submission_status || 'Pending'
        });
        setShowEditModal(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to permanently delete this agent?')) {
            try {
                await deleteAgent(id);
                setError(null);
            } catch (err) {
                setError('Failed to delete agent. Please try again.');
            }
        }
    };

    const toggleStatus = async (agent) => {
        const newStatus = agent.status === 'Active' ? 'Inactive' : 'Active';
        const message = agent.status === 'Active' ? 'Deactivate this agent account?' : 'Reactivate this agent account?';
        if (window.confirm(message)) {
            try {
                await updateAgent({ ...agent, status: newStatus });
            } catch (err) {
                setError('Failed to update agent status.');
            }
        }
    };

    const resetSubmission = async (agent) => {
        if (window.confirm(`Unlock submission for ${agent.name} to allow corrections?`)) {
            try {
                await updateAgent({ ...agent, submission_status: 'Pending' });
            } catch (err) {
                setError('Failed to reset submission status.');
            }
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>Loading agents...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h1>Polling Agents</h1>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                    <FaUserPlus style={{ marginRight: 'var(--space-2)' }} /> New Agent
                </button>
            </div>

            {error && (
                <div style={{ padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                {agents.length === 0 ? (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No agents created yet. Click "New Agent" to get started.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'var(--teal)', color: 'white' }}>
                            <tr>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'left' }}>Information</th>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'left' }}>Permissions</th>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'center' }}>Account Status</th>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'center' }}>Submission</th>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {agents.map((agent) => (
                                <tr key={agent.id} style={{ borderBottom: '1px solid var(--color-border)', opacity: agent.status === 'Inactive' ? 0.6 : 1 }}>
                                    <td style={{ padding: 'var(--space-4)' }}>
                                        <div style={{ fontWeight: '500' }}>{agent.name}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{agent.email}</div>
                                        <div style={{ fontSize: '0.85rem' }}>Stn: {getStationName(agent.station_id)}</div>
                                    </td>
                                    <td style={{ padding: 'var(--space-4)' }}>
                                        <span style={{ fontSize: '0.85rem', textTransform: 'capitalize' }}>{agent.permissions}</span>
                                    </td>
                                    <td style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '1rem',
                                            fontSize: '0.75rem',
                                            backgroundColor: agent.status === 'Active' ? 'var(--success)' : 'var(--gray-400)',
                                            color: 'white'
                                        }}>
                                            {agent.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                                        <button
                                            onClick={() => resetSubmission(agent)}
                                            title="Reset/Unlock Submission"
                                            disabled={agent.submission_status === 'Pending'}
                                            style={{
                                                background: 'none',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '4px',
                                                cursor: agent.submission_status === 'Pending' ? 'default' : 'pointer',
                                                color: agent.submission_status === 'Pending' ? 'var(--color-text-muted)' : 'var(--warning)',
                                                padding: '0.25rem 0.5rem',
                                                fontSize: '0.75rem',
                                                display: 'flex', alignItems: 'center', gap: '0.25rem', margin: '0 auto'
                                            }}
                                        >
                                            <FaUnlock /> {agent.submission_status}
                                        </button>
                                    </td>
                                    <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--teal)' }}
                                                onClick={() => openEditModal(agent)}
                                                title="Edit Details"
                                            >
                                                <FaEdit />
                                            </button>

                                            <button
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: agent.status === 'Active' ? 'var(--warning)' : 'var(--success)' }}
                                                onClick={() => toggleStatus(agent)}
                                                title={agent.status === 'Active' ? 'Deactivate' : 'Activate'}
                                            >
                                                {agent.status === 'Active' ? <FaBan /> : <FaCheckCircle />}
                                            </button>

                                            <button
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}
                                                onClick={() => handleDelete(agent.id)}
                                                title="Delete"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '450px' }}>
                        <h2 style={{ marginBottom: 'var(--space-4)' }}>Create New Agent</h2>
                        <form onSubmit={handleAddAgent}>
                            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                                <input className="input" name="name" placeholder="Full Name" value={newAgent.name} onChange={handleInputChange} required />
                                <input className="input" name="email" type="email" placeholder="Email Address" value={newAgent.email} onChange={handleInputChange} required />
                                <input className="input" name="phone" placeholder="Phone Number" value={newAgent.phone} onChange={handleInputChange} required />
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Password</label>
                                    <input className="input" name="password" type="text" placeholder="Enter password (auto-generated if empty)" value={newAgent.password} onChange={handleInputChange} />
                                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Leave empty to auto-generate</span>
                                </div>

                                <select className="select" name="stationId" value={newAgent.stationId} onChange={handleInputChange} required>
                                    <option value="">Select Station to Assign</option>
                                    {stations.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.ward})</option>
                                    ))}
                                </select>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Permissions</label>
                                    <select className="select" name="permissions" value={newAgent.permissions} onChange={handleInputChange}>
                                        <option value="edit">Edit (Can Submit Results)</option>
                                        <option value="view-only">View Only</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Create & Send Invite</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && editingAgent && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card" style={{ width: '450px' }}>
                        <h2 style={{ marginBottom: 'var(--space-4)' }}>Edit Agent</h2>
                        <form onSubmit={handleUpdateAgent}>
                            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                                <input className="input" name="name" placeholder="Full Name" value={editingAgent.name} onChange={handleEditInputChange} required />
                                <input className="input" name="email" type="email" placeholder="Email Address" value={editingAgent.email} onChange={handleEditInputChange} required />
                                <input className="input" name="phone" placeholder="Phone Number" value={editingAgent.phone} onChange={handleEditInputChange} required />

                                <select className="select" name="station_id" value={editingAgent.station_id} onChange={handleEditInputChange} required>
                                    <option value="">Select Station to Assign</option>
                                    {stations.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.ward})</option>
                                    ))}
                                </select>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem' }}>Permissions</label>
                                    <select className="select" name="permissions" value={editingAgent.permissions} onChange={handleEditInputChange}>
                                        <option value="edit">Edit (Can Submit Results)</option>
                                        <option value="view-only">View Only</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Update Agent</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showCredentialsModal && createdAgentCredentials && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1001
                }}>
                    <div className="card" style={{ width: '450px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', color: 'var(--success)', marginBottom: 'var(--space-4)' }}>
                            <FaKey />
                        </div>
                        <h2 style={{ marginBottom: 'var(--space-2)' }}>Agent Account Created!</h2>
                        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                            The login credentials have been sent to <strong>{createdAgentCredentials.email}</strong>.
                        </p>

                        <div style={{
                            backgroundColor: 'var(--gray-100)',
                            padding: 'var(--space-4)',
                            borderRadius: '0.5rem',
                            marginBottom: 'var(--space-6)',
                            textAlign: 'left'
                        }}>
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                                <span style={{ fontWeight: '600', display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Email</span>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{createdAgentCredentials.email}</span>
                                    <FaCopy style={{ cursor: 'pointer', color: 'var(--teal)' }} onClick={() => copyToClipboard(createdAgentCredentials.email)} />
                                </div>
                            </div>
                            <div>
                                <span style={{ fontWeight: '600', display: 'block', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Password</span>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '1px' }}>
                                        {showPassword ? createdAgentCredentials.password : '••••••••'}
                                    </span>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        <FaEyeSlash
                                            style={{ cursor: 'pointer', color: 'var(--color-text-muted)' }}
                                            onClick={() => setShowPassword(false)}
                                        />
                                        <FaEye
                                            style={{ cursor: 'pointer', color: 'var(--teal)' }}
                                            onClick={() => setShowPassword(true)}
                                        />
                                        <FaCopy style={{ cursor: 'pointer', color: 'var(--teal)' }} onClick={() => copyToClipboard(createdAgentCredentials.password)} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={() => { setShowCredentialsModal(false); setShowPassword(false); }}>Done</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgentManagement;
