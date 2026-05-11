import { useState, useEffect } from 'react';
import { FaPlus, FaFileUpload, FaEdit, FaTrash } from 'react-icons/fa';
import { kenyaLocations } from '../../utils/kenyaLocations';

import { useData } from '../../contexts/DataContext';

const PollingStations = () => {
    const { stations, addStation, deleteStation, loading } = useData();

    const [showAddModal, setShowAddModal] = useState(false);
    const [newStation, setNewStation] = useState({ name: '', county: '', constituency: '', ward: '', voters: '' });
    const [availableConstituencies, setAvailableConstituencies] = useState([]);
    const [availableWards, setAvailableWards] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (newStation.county) {
            const countyData = kenyaLocations.find(c => c.name === newStation.county);
            setAvailableConstituencies(countyData ? countyData.constituencies : []);
            setNewStation(prev => ({ ...prev, constituency: '', ward: '' }));
        } else {
            setAvailableConstituencies([]);
            setAvailableWards([]);
        }
    }, [newStation.county]);

    useEffect(() => {
        if (newStation.constituency && newStation.county) {
            const countyData = kenyaLocations.find(c => c.name === newStation.county);
            if (countyData) {
                const consData = countyData.constituencies.find(c => c.name === newStation.constituency);
                setAvailableWards(consData ? consData.wards : []);
                setNewStation(prev => ({ ...prev, ward: '' }));
            }
        } else {
            setAvailableWards([]);
        }
    }, [newStation.constituency, newStation.county]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this station?')) {
            try {
                await deleteStation(id);
                setError(null);
            } catch (err) {
                setError('Failed to delete station. Please try again.');
            }
        }
    };

    const handleInputChange = (e) => {
        setNewStation({ ...newStation, [e.target.name]: e.target.value });
    };

    const handleAddStation = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await addStation(newStation);
            setShowAddModal(false);
            setNewStation({ name: '', county: '', constituency: '', ward: '', voters: '' });
        } catch (err) {
            setError('Failed to add station. Please try again.');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>Loading stations...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                <h1>Polling Stations</h1>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        <FaPlus style={{ marginRight: 'var(--space-2)' }} /> Add Station
                    </button>
                    <button className="btn btn-outline">
                        <FaFileUpload style={{ marginRight: 'var(--space-2)' }} /> Import CSV
                    </button>
                </div>
            </div>

            {error && (
                <div style={{ padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', backgroundColor: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem' }}>
                    {error}
                </div>
            )}

            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                {stations.length === 0 ? (
                    <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                        No stations added yet. Click "Add Station" to get started.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ backgroundColor: 'var(--teal)', color: 'white' }}>
                            <tr>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'left' }}>Station Name</th>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'left' }}>Location</th>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'left' }}>Registered Voters</th>
                                <th style={{ padding: 'var(--space-4)', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stations.map((station) => (
                                <tr key={station.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: 'var(--space-4)' }}>{station.name}</td>
                                    <td style={{ padding: 'var(--space-4)' }}>
                                        {station.county} / {station.constituency} / {station.ward}
                                    </td>
                                    <td style={{ padding: 'var(--space-4)' }}>{station.registered_voters?.toLocaleString() || '—'}</td>
                                    <td style={{ padding: 'var(--space-4)', textAlign: 'right' }}>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', marginRight: 'var(--space-3)' }}>
                                            <FaEdit />
                                        </button>
                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} onClick={() => handleDelete(station.id)}>
                                            <FaTrash />
                                        </button>
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
                    <div className="card" style={{ width: '500px' }}>
                        <h2 style={{ marginBottom: 'var(--space-4)' }}>Add New Station</h2>
                        <form onSubmit={handleAddStation}>
                            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                                <input className="input" name="name" placeholder="Station Name" value={newStation.name} onChange={handleInputChange} required />

                                <select className="select" name="county" value={newStation.county} onChange={handleInputChange} required>
                                    <option value="">Select County</option>
                                    {kenyaLocations.map(c => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </select>

                                <select className="select" name="constituency" value={newStation.constituency} onChange={handleInputChange} required disabled={!newStation.county}>
                                    <option value="">Select Constituency</option>
                                    {availableConstituencies.map(c => (
                                        <option key={c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </select>

                                <select className="select" name="ward" value={newStation.ward} onChange={handleInputChange} required disabled={!newStation.constituency}>
                                    <option value="">Select Ward</option>
                                    {availableWards.map(w => (
                                        <option key={w} value={w}>{w}</option>
                                    ))}
                                </select>

                                <input className="input" name="voters" type="number" placeholder="Registered Voters" value={newStation.voters} onChange={handleInputChange} required />
                            </div>
                            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Station</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PollingStations;
