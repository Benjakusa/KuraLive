import { useState, useEffect } from 'react';
import { FaCalendarAlt, FaMapMarkedAlt, FaVoteYea, FaPlus, FaTrash, FaUserTie } from 'react-icons/fa';
import { kenyaLocations } from '../../utils/kenyaLocations';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';

const ElectionSetup = () => {
    const { saveElectionDetails, electionDetails: savedDetails } = useData();
    const navigate = useNavigate();

    const [electionDetails, setElectionDetails] = useState({
        name: '',
        date: '',
        type: 'presidential',
        regionLevel: 'national', // national, county, constituency, ward
        county: '',
        constituency: '',
        ward: '',
        candidates: []
    });

    const [availableConstituencies, setAvailableConstituencies] = useState([]);
    const [availableWards, setAvailableWards] = useState([]);

    // New Candidate State
    const [newCandidate, setNewCandidate] = useState({ name: '', party: '', slogan: '' });

    // Load existing details if editing
    useEffect(() => {
        if (savedDetails?.details) {
            setElectionDetails(savedDetails.details);
        }
    }, [savedDetails]);

    // Update constituencies when county changes
    useEffect(() => {
        if (electionDetails.county) {
            const countyData = kenyaLocations.find(c => c.name === electionDetails.county);
            setAvailableConstituencies(countyData ? countyData.constituencies : []); // Now an array of objects
        } else {
            setAvailableConstituencies([]);
        }
    }, [electionDetails.county]);

    // Update wards when constituency changes
    useEffect(() => {
        if (electionDetails.constituency && electionDetails.county) {
            const countyData = kenyaLocations.find(c => c.name === electionDetails.county);
            if (countyData) {
                const consData = countyData.constituencies.find(c => c.name === electionDetails.constituency);
                setAvailableWards(consData ? consData.wards : []);
            } else {
                setAvailableWards([]);
            }
        } else {
            setAvailableWards([]);
        }
    }, [electionDetails.constituency, electionDetails.county]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setElectionDetails(prev => {
            const updates = { [name]: value };

            // Reset child fields if parent changes
            if (name === 'regionLevel') {
                updates.county = '';
                updates.constituency = '';
                updates.ward = '';
            }
            if (name === 'county') {
                updates.constituency = '';
                updates.ward = '';
            }
            if (name === 'constituency') {
                updates.ward = '';
            }

            return { ...prev, ...updates };
        });
    };

    const handleCandidateChange = (e) => {
        const { name, value } = e.target;
        setNewCandidate(prev => ({ ...prev, [name]: value }));
    };

    const addCandidate = () => {
        if (!newCandidate.name || !newCandidate.party) return;
        setElectionDetails(prev => ({
            ...prev,
            candidates: [...prev.candidates, { ...newCandidate, id: Date.now() }]
        }));
        setNewCandidate({ name: '', party: '', slogan: '' });
    };

    const removeCandidate = (id) => {
        setElectionDetails(prev => ({
            ...prev,
            candidates: prev.candidates.filter(c => c.id !== id)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        saveElectionDetails(electionDetails);
        alert('Election details saved successfully!');
        navigate('/manager');
    };

    return (
        <div>
            <h1 style={{ marginBottom: 'var(--space-6)' }}>Election Setup</h1>

            <div className="card" style={{ maxWidth: '800px', marginBottom: 'var(--space-8)' }}>
                <h2 style={{ marginBottom: 'var(--space-4)', fontSize: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                    1. General Information
                </h2>

                <form onSubmit={handleSubmit} id="electionForm">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--space-6)' }}>

                        {/* Election Name */}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>
                                Election Name
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FaVoteYea style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    className="input"
                                    type="text"
                                    name="name"
                                    value={electionDetails.name}
                                    onChange={handleChange}
                                    placeholder="e.g., 2027 General Election"
                                    style={{ paddingLeft: '3rem' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>
                                Election Date
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FaCalendarAlt style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    className="input"
                                    type="date"
                                    name="date"
                                    value={electionDetails.date}
                                    onChange={handleChange}
                                    style={{ paddingLeft: '3rem' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Type */}
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>
                                Election Type
                            </label>
                            <select className="select" name="type" value={electionDetails.type} onChange={handleChange}>
                                <option value="presidential">Presidential</option>
                                <option value="gubernatorial">Gubernatorial (Governor)</option>
                                <option value="senatorial">Senatorial</option>
                                <option value="woman_rep">County Woman Representative</option>
                                <option value="mp">Constituency MP</option>
                                <option value="mca">Ward MCA</option>
                                <option value="other">Other / Organizational</option>
                            </select>
                        </div>
                    </div>
                </form>
            </div>

            <div className="card" style={{ maxWidth: '800px', marginBottom: 'var(--space-8)' }}>
                <h2 style={{ marginBottom: 'var(--space-4)', fontSize: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                    <FaMapMarkedAlt style={{ marginRight: 'var(--space-2)' }} />
                    2. Geographic Scope
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 'var(--space-6)' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>
                            Level of Representation
                        </label>
                        <select className="select" name="regionLevel" value={electionDetails.regionLevel} onChange={handleChange} form="electionForm">
                            <option value="national">National (All Counties)</option>
                            <option value="county">Specific County</option>
                            <option value="constituency">Specific Constituency</option>
                            <option value="ward">Specific Ward</option>
                        </select>
                    </div>

                    {/* Conditional Location Fields */}
                    {(electionDetails.regionLevel !== 'national') && (
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>County</label>
                            <select className="select" name="county" value={electionDetails.county} onChange={handleChange} form="electionForm">
                                <option value="">Select County</option>
                                {kenyaLocations.map(c => (
                                    <option key={c.name} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(electionDetails.regionLevel === 'constituency' || electionDetails.regionLevel === 'ward') && (
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>Constituency</label>
                            <select
                                className="select"
                                name="constituency"
                                value={electionDetails.constituency}
                                onChange={handleChange}
                                form="electionForm"
                                disabled={!electionDetails.county}
                            >
                                <option value="">Select Constituency</option>
                                {availableConstituencies.map(constituency => (
                                    <option key={constituency.name} value={constituency.name}>{constituency.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {electionDetails.regionLevel === 'ward' && (
                        <div>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: '500' }}>Ward</label>
                            <select
                                className="select"
                                name="ward"
                                value={electionDetails.ward}
                                onChange={handleChange}
                                form="electionForm"
                                disabled={!electionDetails.constituency}
                            >
                                <option value="">Select Ward</option>
                                {availableWards.map(ward => (
                                    <option key={ward} value={ward}>{ward}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ maxWidth: '800px' }}>
                <h2 style={{ marginBottom: 'var(--space-4)', fontSize: '1.25rem', borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-2)' }}>
                    <FaUserTie style={{ marginRight: 'var(--space-2)' }} />
                    3. Candidates & Parties
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-4)', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Candidate Name</label>
                        <input
                            className="input"
                            name="name"
                            placeholder="Full Name"
                            value={newCandidate.name}
                            onChange={handleCandidateChange}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>Party / Coalition</label>
                        <input
                            className="input"
                            name="party"
                            placeholder="e.g. UDA, ODM, Independent"
                            value={newCandidate.party}
                            onChange={handleCandidateChange}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={addCandidate}
                        disabled={!newCandidate.name || !newCandidate.party}
                        style={{ height: 'fit-content' }}
                    >
                        <FaPlus /> Add
                    </button>
                </div>

                {/* Candidate List */}
                {electionDetails.candidates.length > 0 && (
                    <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'var(--space-4)', minWidth: '400px' }}>
                        <thead style={{ backgroundColor: 'var(--teal)', color: 'white' }}>
                            <tr>
                                <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Candidate</th>
                                <th style={{ padding: 'var(--space-3)', textAlign: 'left' }}>Party</th>
                                <th style={{ padding: 'var(--space-3)', textAlign: 'right' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {electionDetails.candidates.map(candidate => (
                                <tr key={candidate.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: 'var(--space-3)' }}>
                                        <div style={{ fontWeight: '500' }}>{candidate.name}</div>
                                    </td>
                                    <td style={{ padding: 'var(--space-3)' }}>{candidate.party}</td>
                                    <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                                        <button
                                            type="button"
                                            onClick={() => removeCandidate(candidate.id)}
                                            style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                )}

                <div style={{ marginTop: 'var(--space-8)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" form="electionForm" className="btn btn-primary" style={{ minWidth: '200px', fontSize: '1.1rem' }}>
                        Save Final Election Setup
                    </button>
                </div>
            </div>

        </div>
    );
};

export default ElectionSetup;
