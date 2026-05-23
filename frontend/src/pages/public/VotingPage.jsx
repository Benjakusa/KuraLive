import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { FaCheckCircle, FaSpinner, FaLock, FaMapMarkerAlt, FaFileContract } from 'react-icons/fa';
import { kenyaLocations } from '../../utils/kenyaLocations';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function VotingPage() {
    const { token } = useParams();
    const [poll, setPoll] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [answers, setAnswers] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [voterStatus, setVoterStatus] = useState('');
    const [location, setLocation] = useState({ county: '', constituency: '', ward: '', polling_station: '' });
    const [agreeTerms, setAgreeTerms] = useState(false);

    useEffect(() => {
        fetch(`${API}/api/public/poll/${token}`)
            .then(r => r.json())
            .then(d => {
                if (!d.error) {
                    setPoll(d);
                    if (localStorage.getItem(`kl_poll_voted_${token}`) === "true") {
                        setSubmitted(true);
                    }
                    let hash = localStorage.getItem(`kl_poll_${token}`);
                    if (!hash) {
                        hash = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
                        localStorage.setItem(`kl_poll_${token}`, hash);
                    }
                } else {
                    setError(d.error || 'Poll not found');
                }
            })
            .catch(() => setError('Connection error'))
            .finally(() => setLoading(false));
    }, [token]);

    async function submitVote(e) {
        e.preventDefault();
        const qList = Array.isArray(poll.questions) ? poll.questions : JSON.parse(poll.questions || '[]');
        if (Object.keys(answers).length < qList.length) {
            setError('Please answer all questions');
            return;
        }
        if (!agreeTerms) {
            setError('You must agree to the data collection terms to proceed');
            return;
        }
        setError('');
        setSubmitting(true);

        const hash = localStorage.getItem(`kl_poll_${token}`);

        const r = await fetch(`${API}/api/public/poll/${token}/vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_hash: hash,
                answers,
                voter_status: voterStatus,
                location
            })
        });

        const d = await r.json();
        setSubmitting(false);

        if (r.ok || r.status === 409 || d.error === 'duplicate') {
            localStorage.setItem(`kl_poll_voted_${token}`, "true");
            setSubmitted(true);
        } else {
            setError(d.error || 'Failed to submit vote');
        }
    }

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}><FaSpinner className="spin" style={{ fontSize: '2rem', color: 'var(--teal)' }} /></div>;

    if (error && !poll) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div className="card" style={{ padding: '2rem', textAlign: 'center', maxWidth: 400 }}>
                <FaLock style={{ fontSize: '3rem', color: 'var(--color-text-muted)', marginBottom: '1rem', opacity: 0.5 }} />
                <h2 style={{ margin: '0 0 0.5rem' }}>Poll Unavailable</h2>
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{error}</p>
            </div>
        </div>
    );

    if (submitted) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
            <div className="card" style={{ padding: '2.5rem 2rem', textAlign: 'center', maxWidth: 400, animation: 'fadeIn 0.5s ease-out' }}>
                <FaCheckCircle style={{ fontSize: '4rem', color: 'var(--teal)', marginBottom: '1rem' }} />
                <h2 style={{ margin: '0 0 0.5rem' }}>Thank You!</h2>
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Your voice has been heard. We appreciate you taking the time to share your opinion with KuraLive.</p>
                <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-border)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Powered by KuraLive Secure Polls
                </div>
            </div>
        </div>
    );

    const qList = Array.isArray(poll.questions) ? poll.questions : JSON.parse(poll.questions || '[]');
    const activeLocations = poll.locations || [];

    const counties = [...kenyaLocations].map(c => c.name).sort();

    const selectedCountyObj = kenyaLocations.find(c => c.name === location.county);
    const constituencies = selectedCountyObj ? selectedCountyObj.constituencies.map(c => c.name).sort() : [];

    const selectedConstObj = selectedCountyObj?.constituencies.find(c => c.name === location.constituency);
    const wards = selectedConstObj ? selectedConstObj.wards.sort() : [];

    const pollingStations = [...new Set(activeLocations
        .filter(s => (!location.county || s.county === location.county) && (!location.constituency || s.constituency === location.constituency) && (!location.ward || s.ward === location.ward))
        .map(s => s.polling_station).filter(Boolean))].sort();

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: 640, margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: 48, height: 48, background: 'var(--teal)', borderRadius: '50%', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto 1rem', fontWeight: 800, fontFamily: 'serif' }}>K:</div>
                    <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem' }}>{poll.title}</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '1rem', margin: 0 }}>{poll.description}</p>
                </div>

                <form onSubmit={submitVote}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* 1. Demographics & Verification Verification */}
                        <div className="card" style={{ padding: '1.5rem', border: voterStatus === 'unregistered' ? '2px solid var(--danger)' : 'none' }}>
                            <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaMapMarkerAlt color="var(--teal)" /> Voter Verification</h3>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <label>Are you a registered voter? *</label>
                                <select required className="select" value={voterStatus} onChange={e => setVoterStatus(e.target.value)}>
                                    <option value="">-- Please Select --</option>
                                    <option value="registered">Yes, I am a registered voter</option>
                                    <option value="unregistered">No, I am not registered / Prefer not to say</option>
                                </select>
                            </div>

                            {voterStatus === 'unregistered' && (
                                <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, marginTop: '1rem', fontSize: '0.9rem' }}>
                                    <FaLock style={{ marginRight: '0.5rem' }} /> This poll is currently restricted to registered voters only. You cannot proceed further.
                                </div>
                            )}

                            {voterStatus === 'registered' && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', padding: '1.5rem', background: 'var(--color-surface-alt)', borderRadius: 12 }}>
                                    <div>
                                        <label>County *</label>
                                        <select required className="select" value={location.county} onChange={e => setLocation(prev => ({ ...prev, county: e.target.value, constituency: '', ward: '', polling_station: '' }))}>
                                            <option value="">-- Select County --</option>
                                            {counties.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Constituency *</label>
                                        <select required className="select" value={location.constituency} onChange={e => setLocation(prev => ({ ...prev, constituency: e.target.value, ward: '', polling_station: '' }))}>
                                            <option value="">-- Select Constituency --</option>
                                            {constituencies.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Ward *</label>
                                        <select required className="select" value={location.ward} onChange={e => setLocation(prev => ({ ...prev, ward: e.target.value, polling_station: '' }))}>
                                            <option value="">-- Select Ward --</option>
                                            {wards.map(w => <option key={w} value={w}>{w}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label>Polling Station *</label>
                                        {pollingStations.length > 0 ? (
                                            <select required className="select" value={location.polling_station} onChange={e => setLocation(prev => ({ ...prev, polling_station: e.target.value }))}>
                                                <option value="">-- Select Polling Station --</option>
                                                {pollingStations.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        ) : (
                                            <input required className="input" placeholder="e.g. Highridge Primary" value={location.polling_station} onChange={e => setLocation(prev => ({ ...prev, polling_station: e.target.value }))} />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. Poll Questions (Only shown to registered voters) */}
                        {voterStatus === 'registered' && (
                            <>
                                {qList.map((q, qIdx) => (
                                    <div key={qIdx} className="card" style={{ padding: '1.5rem' }}>
                                        <h3 style={{ margin: '0 0 1.25rem', fontSize: '1.1rem', lineHeight: 1.4 }}>{qIdx + 1}. {q.text}</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {q.options.map((opt, oIdx) => (
                                                <label key={oIdx} style={{
                                                    padding: '1rem', border: `2px solid ${answers[qIdx] === opt ? 'var(--teal)' : 'var(--color-border)'}`,
                                                    borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.75rem',
                                                    background: answers[qIdx] === opt ? 'var(--teal-light)' : 'transparent', transition: 'all 0.2s',
                                                    fontWeight: answers[qIdx] === opt ? 600 : 400
                                                }}>
                                                    <input
                                                        type="radio"
                                                        name={`q_${qIdx}`}
                                                        checked={answers[qIdx] === opt}
                                                        onChange={() => setAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                                                        style={{ width: 18, height: 18, accentColor: 'var(--teal)' }}
                                                    />
                                                    {opt}
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div className="card" style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '1rem', background: 'var(--gray-50)', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                                        <input type="checkbox" id="terms" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} style={{ width: 18, height: 18, margin: '2px 0 0', accentColor: 'var(--teal)', cursor: 'pointer' }} />
                                        <label htmlFor="terms" style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                                            <strong>Data Consent:</strong> I agree that my responses will be collected anonymously to help gauge public opinion. KuraLive does not collect personally identifying information such as names or phone numbers through this form.
                                        </label>
                                    </div>
                                </div>

                                {error && <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 10, textAlign: 'center', fontWeight: 500 }}>{error}</div>}

                                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: 10, marginTop: '0.5rem' }}>
                                    {submitting ? <><FaSpinner className="spin" /> Submitting…</> : 'Submit Vote'}
                                </button>
                            </>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}

export default VotingPage;
