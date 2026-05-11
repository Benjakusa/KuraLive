import { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaVoteYea, FaCamera, FaCheckCircle, FaLock, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import api from '../services/api';

const AgentDashboard = () => {
    const { currentUser } = useAuth();
    const { agents, stations, electionDetails } = useData();

    const [step, setStep] = useState('confirmation');
    const [loading, setLoading] = useState(true);

    const [assignedStation, setAssignedStation] = useState(null);
    const [electionCandidates, setElectionCandidates] = useState([]);

    const [votes, setVotes] = useState({});
    const [stats, setStats] = useState({ spoilt: '', rejected: '' });
    const [proofFile, setProofFile] = useState(null);
    const [proofPreview, setProofPreview] = useState(null);
    const [voteError, setVoteError] = useState('');

    const totalVotes = Object.values(votes).reduce((sum, v) => sum + (parseInt(v) || 0), 0)
        + (parseInt(stats.spoilt) || 0) + (parseInt(stats.rejected) || 0);
    const maxVoters = assignedStation?.registered_voters || 0;
    const exceedsMax = maxVoters > 0 && totalVotes > maxVoters;

    useEffect(() => {
        if (!currentUser || agents.length === 0 || stations.length === 0) {
            return;
        }

        const agentRecord = agents.find(a => a.id === currentUser.uid || a.email === currentUser.email);

        if (agentRecord) {
            if (agentRecord.submission_status === 'Submitted' || agentRecord.submission_status === 'Locked') {
                setStep('completed');
            }

            const station = stations.find(s => s.id === agentRecord.station_id);
            if (station) {
                setAssignedStation({
                    ...station,
                    agentName: agentRecord.name
                });
            }
        }

        if (electionDetails?.details?.candidates) {
            setElectionCandidates(electionDetails.details.candidates);
        }

        setLoading(false);

    }, [currentUser, agents, stations, electionDetails]);

    const handleConfirmStation = () => {
        if (window.confirm("Confirm that this is your assigned station? This action cannot be undone.")) {
            setStep('reporting');
            window.scrollTo(0, 0);
        }
    };

    const handleRequestUpdate = () => {
        const reason = prompt("Please describe the error in the station details:");
        if (reason) {
            alert("Request sent to Election Manager. Please wait for them to update the details, then refresh this page.");
        }
    };

    const handleVoteChange = (candidateId, value) => {
        setVotes(prev => ({ ...prev, [candidateId]: value }));
    };

    const handleStatChange = (e) => {
        setStats(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProofFile(file);
            setProofPreview(URL.createObjectURL(file));
        }
    };

    const handleSubmitResults = async (e) => {
        e.preventDefault();

        if (!proofFile) {
            alert("Please take/upload a picture of the results form.");
            return;
        }

        if (!assignedStation) return;

        if (exceedsMax) {
            alert(`Total votes (${totalVotes}) cannot exceed registered voters (${maxVoters}).`);
            return;
        }

        try {
            const proofImageUrl = await api.uploadProof(proofFile, currentUser.uid);

            const submissionPayload = {
                station_id: assignedStation.id,
                station_name: assignedStation.name,
                agent_id: currentUser.uid,
                agent_name: assignedStation.agentName,
                results_data: votes,
                stats: stats,
                proof_image: proofImageUrl
            };

            await api.submitResult(submissionPayload);

            console.log("Submitting Results:", submissionPayload);
            setStep('completed');
            window.scrollTo(0, 0);

        } catch (error) {
            console.error("Submission Error:", error);
            alert("Failed to submit results. Please try again.");
        }
    };

    if (loading) return <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>Loading Assignment...</div>;

    if (!assignedStation) return (
        <div style={{ padding: 'var(--space-8)', textAlign: 'center' }}>
            <h2>No Station Assigned</h2>
            <p>Please contact the Election Manager to be assigned to a polling station.</p>
        </div>
    );

    return (
        <div className="container" style={{ maxWidth: '600px', paddingBottom: 'var(--space-12)' }}>

            <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-8)', position: 'relative', marginTop: 'var(--space-6)' }}>
                <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', backgroundColor: 'var(--color-border)', zIndex: 0, transform: 'translateY(-50%)' }}></div>
                {['confirmation', 'reporting', 'completed'].map((s, index) => {
                    const isActive = step === s;
                    const isCompleted = (step === 'reporting' && index === 0) || (step === 'completed' && index <= 1);
                    const isCurrent = step === s;

                    return (
                        <div key={s} style={{ position: 'relative', zIndex: 1, textAlign: 'center', backgroundColor: 'var(--color-bg)', padding: '0 var(--space-2)' }}>
                            <div style={{
                                width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-full)',
                                backgroundColor: isActive || isCompleted ? 'var(--teal)' : 'var(--color-surface)',
                                color: isActive || isCompleted ? 'var(--white)' : 'var(--color-text-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto var(--space-1)',
                                border: isCurrent ? '2px solid var(--color-accent)' : `1px solid var(--color-border)`,
                                transition: 'all 0.3s ease'
                            }}>
                                {isCompleted ? <FaCheckCircle /> : index + 1}
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: isActive ? '700' : '500', color: isActive ? 'var(--teal)' : 'var(--color-text-muted)' }}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </span>
                        </div>
                    )
                })}
            </div>

            {step === 'confirmation' && (
                <div className="card">
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>Confirm Assignment</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                        Verify your physical location matches these details.
                    </p>

                    <div style={{ backgroundColor: 'var(--teal)', color: 'var(--white)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-6)' }}>
                        <div className="flex items-center" style={{ marginBottom: 'var(--space-2)' }}>
                            <FaMapMarkerAlt style={{ marginRight: 'var(--space-2)', fontSize: '1.2rem', color: 'var(--aqua)' }} />
                            <h3 style={{ margin: 0, color: 'var(--white)' }}>{assignedStation.name}</h3>
                        </div>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', fontSize: '0.9rem', color: 'var(--aqua)' }}>
                            <div><strong>County:</strong> {assignedStation.county}</div>
                            <div><strong>Const:</strong> {assignedStation.constituency}</div>
                            <div><strong>Ward:</strong> {assignedStation.ward}</div>
                            <div><strong>Voters:</strong> {assignedStation.registered_voters?.toLocaleString() || '—'}</div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <button className="btn btn-primary" onClick={handleConfirmStation} style={{ padding: 'var(--space-4)' }}>
                            <FaCheckCircle style={{ marginRight: 'var(--space-2)' }} /> Confirm & Proceed
                        </button>
                        <button
                            className="btn btn-outline"
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                            onClick={handleRequestUpdate}
                        >
                            <FaExclamationTriangle style={{ marginRight: 'var(--space-2)' }} /> Report Issue
                        </button>
                    </div>
                </div>
            )}

            {step === 'reporting' && (
                <div className="card">
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>Declare Results</h2>
                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center' }}>
                        <FaLock style={{ marginRight: 'var(--space-1)', color: 'var(--success)' }} />
                        Secured for: <strong>&nbsp;{assignedStation.name}</strong>
                    </div>

                    <form onSubmit={handleSubmitResults}>
                        <h4 style={{ marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>Candidate Votes</h4>

                        {electionCandidates.length > 0 ? electionCandidates.map(candidate => (
                            <div key={candidate.id} style={{ marginBottom: 'var(--space-4)' }}>
                                <label style={{ fontSize: '1rem', marginBottom: 'var(--space-2)' }}>
                                    {candidate.name} <span style={{ fontWeight: 'normal', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>({candidate.party})</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="input"
                                    onChange={(e) => handleVoteChange(candidate.id, e.target.value)}
                                    required
                                    style={{ fontSize: '1.25rem', padding: 'var(--space-3)', fontWeight: 'bold' }}
                                />
                            </div>
                        )) : (
                            <p>No candidates found. Please contact manager.</p>
                        )}

                        <h4 style={{ marginTop: 'var(--space-8)', marginBottom: 'var(--space-4)', paddingBottom: 'var(--space-2)', borderBottom: '1px solid var(--color-border)' }}>Statistics</h4>
                        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div>
                                <label>Spoilt Votes</label>
                                <input className="input" type="number" name="spoilt" value={stats.spoilt} onChange={handleStatChange} required />
                            </div>
                            <div>
                                <label>Rejected Votes</label>
                                <input className="input" type="number" name="rejected" value={stats.rejected} onChange={handleStatChange} required />
                            </div>
                        </div>

                        {maxVoters > 0 && (
                            <div style={{
                                marginTop: 'var(--space-4)', padding: 'var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                backgroundColor: exceedsMax ? 'var(--danger-light)' : 'var(--teal-light)',
                                color: exceedsMax ? 'var(--danger)' : 'var(--teal)',
                                fontSize: '0.85rem', fontWeight: 600
                            }}>
                                Total: {totalVotes} / {maxVoters} registered voters
                                {exceedsMax && ' — Turnout exceeds registered voters!'}
                            </div>
                        )}

                        <div style={{ marginTop: 'var(--space-8)' }}>
                            <label style={{ marginBottom: 'var(--space-2)' }}>Evidence (Form 34A)</label>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                id="proof-upload"
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            <label
                                htmlFor="proof-upload"
                                style={{
                                    display: 'block',
                                    padding: 'var(--space-8)',
                                    border: '2px dashed var(--color-border)',
                                    borderRadius: 'var(--radius-lg)',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    backgroundColor: 'var(--teal-light)',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                {proofPreview ? (
                                    <div style={{ position: 'relative' }}>
                                        <img src={proofPreview} alt="Preview" style={{ maxHeight: '250px', maxWidth: '100%', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }} />
                                        <div style={{ marginTop: 'var(--space-2)', fontSize: '0.875rem', color: 'var(--teal)' }}>Tap to retake</div>
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ width: '4rem', height: '4rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--space-4)' }}>
                                            <FaCamera style={{ fontSize: '1.5rem', color: 'var(--color-text-muted)' }} />
                                        </div>
                                        <div style={{ color: 'var(--color-text-main)', fontWeight: '600' }}>Take Photo of Form</div>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Ensure details are legible</div>
                                    </>
                                )}
                            </label>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-8)', fontSize: '1.125rem', padding: 'var(--space-4)' }}>
                            Submit Final Declaration
                        </button>
                    </form>
                </div>
            )}

            {step === 'completed' && (
                <div style={{ textAlign: 'center', padding: 'var(--space-12) 0' }}>
                    <div style={{
                        width: '6rem', height: '6rem', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--success)', color: 'var(--white)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', margin: '0 auto var(--space-6)',
                        boxShadow: 'var(--shadow-lg)'
                    }}>
                        <FaCheckCircle />
                    </div>
                    <h2 style={{ marginBottom: 'var(--space-2)' }}>Results Declared</h2>
                    <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                        Submission Timestamp: <br /><strong>{new Date().toLocaleTimeString()}</strong>
                    </p>
                    <div className="card" style={{ backgroundColor: 'var(--teal-light)', marginBottom: 'var(--space-8)' }}>
                        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                            Thank you, <strong>{assignedStation ? assignedStation.agentName : 'Agent'}</strong>.<br />
                            Your report for <strong>{assignedStation ? assignedStation.name : 'your station'}</strong> has been received by the Election Manager.
                        </p>
                    </div>

                    <div style={{
                        padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                        backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)',
                        marginBottom: 'var(--space-6)', fontSize: '0.9rem', color: 'var(--warning)'
                    }}>
                        <FaLock style={{ marginRight: 'var(--space-2)' }} />
                        Submission locked. Only the Election Manager can unlock it for corrections.
                    </div>

                    <button className="btn btn-outline" disabled style={{ opacity: 0.5, width: '100%', cursor: 'not-allowed' }}><FaLock style={{ marginRight: 'var(--space-2)' }} /> Submission Locked</button>
                </div>
            )}

        </div>
    );
};

export default AgentDashboard;
