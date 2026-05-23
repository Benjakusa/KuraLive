import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FaPollH, FaPlus, FaCopy, FaShareAlt, FaTrash, FaPlay, FaStop, FaTimes, FaQrcode, FaLink } from 'react-icons/fa';
import QRCode from 'react-qr-code';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function PollManager() {
    const token = localStorage.getItem('kuralive_token');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    const [polls, setPolls] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ title: '', description: '', ends_at: '', questions: [{ text: '', options: ['', ''] }] });
    const [submitting, setSubmitting] = useState(false);
    const [qrPoll, setQrPoll] = useState(null);
    const [pollError, setPollError] = useState('');

    useEffect(() => { fetchPolls(); }, []);

    async function fetchPolls() {
        const r = await fetch(`${API}/api/polls`, { headers });
        const d = await r.json();
        setPolls(d.data || []);
    }

    function addQuestion() {
        setForm(f => ({ ...f, questions: [...f.questions, { text: '', options: ['', ''] }] }));
    }

    function removeQuestion(idx) {
        const arr = [...form.questions]; arr.splice(idx, 1);
        setForm(f => ({ ...f, questions: arr }));
    }

    function updateQuestion(idx, val) {
        const arr = [...form.questions]; arr[idx].text = val;
        setForm(f => ({ ...f, questions: arr }));
    }

    function addOption(qIdx) {
        const arr = [...form.questions]; arr[qIdx].options.push('');
        setForm(f => ({ ...f, questions: arr }));
    }

    function updateOption(qIdx, oIdx, val) {
        const arr = [...form.questions]; arr[qIdx].options[oIdx] = val;
        setForm(f => ({ ...f, questions: arr }));
    }

    function removeOption(qIdx, oIdx) {
        const arr = [...form.questions]; arr[qIdx].options.splice(oIdx, 1);
        setForm(f => ({ ...f, questions: arr }));
    }

    async function submit() {
        if (!form.title) { setPollError('Title required'); return; }
        for (const q of form.questions) {
            if (!q.text) { setPollError('All questions need text'); return; }
            if (q.options.some(o => !o.trim())) { setPollError('All options must be filled'); return; }
            if (q.options.length < 2) { setPollError('Each question needs at least 2 options'); return; }
        }
        setSubmitting(true);
        const r = await fetch(`${API}/api/polls`, { method: 'POST', headers, body: JSON.stringify(form) });
        setSubmitting(false);
        if (r.ok) {
            setShowModal(false);
            setForm({ title: '', description: '', ends_at: '', questions: [{ text: '', options: ['', ''] }] });
            fetchPolls();
        } else {
            const d = await r.json(); setPollError(d.error || 'Failed to save');
        }
    }

    async function updateStatus(id, newStatus) {
        await fetch(`${API}/api/polls/${id}`, { method: 'PUT', headers, body: JSON.stringify({ status: newStatus }) });
        fetchPolls();
    }

    async function deletePoll(id) {
        if (!confirm('Are you sure you want to permanently delete this poll? All related data and votes will be lost.')) return;
        const r = await fetch(`${API}/api/polls/${id}`, { method: 'DELETE', headers });
        if (r.ok) fetchPolls();
        else alert('Failed to delete poll');
    }

    async function copyLink(token) {
        const url = `${window.location.origin}/vote/${token}`;
        await navigator.clipboard.writeText(url);
        alert('Voting link copied to clipboard!');
    }

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                    <FaPollH />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Opinion Polls</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>Create and manage public pulse surveys</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
                    <FaPlus /> Create Poll
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {polls.length === 0 ? (
                    <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)', background: 'var(--color-surface)', borderRadius: 16 }}>
                        <FaPollH style={{ fontSize: '3rem', opacity: 0.2, marginBottom: '1rem' }} />
                        <h3>No polls created</h3>
                        <p>Gather constituent feedback by creating your first opinion poll.</p>
                    </div>
                ) : polls.map(p => {
                    const isActive = p.status === 'active';
                    const isClosed = p.status === 'closed';
                    const link = `${window.location.origin}/vote/${p.share_token}`;
                    return (
                        <div key={p.id} className="card" style={{ padding: '1.25rem', borderLeft: `4px solid ${isActive ? 'var(--teal)' : isClosed ? 'var(--gray-300)' : 'var(--warning)'}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                                        <h3 style={{ margin: 0 }}>{p.title}</h3>
                                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: isActive ? 'var(--teal-light)' : isClosed ? 'var(--gray-200)' : 'rgba(245,158,11,0.15)', color: isActive ? 'var(--teal)' : isClosed ? 'var(--gray-500)' : '#d97706' }}>
                                            {p.status.toUpperCase()}
                                        </span>
                                    </div>
                                    <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{p.description || 'No description provided.'}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '0.4rem' }}>
                                    {p.status === 'draft' && <button onClick={() => updateStatus(p.id, 'active')} className="btn btn-outline btn-sm"><FaPlay style={{ color: 'var(--teal)' }} /> Publish</button>}
                                    {p.status === 'active' && <button onClick={() => updateStatus(p.id, 'closed')} className="btn btn-outline btn-sm"><FaStop style={{ color: 'var(--warning)' }} /> Close</button>}
                                    <button onClick={() => copyLink(p.share_token)} className="btn btn-outline btn-sm"><FaCopy /> Link</button>
                                    <button onClick={() => setQrPoll(p)} className="btn btn-outline btn-sm"><FaQrcode /></button>
                                    <button onClick={() => deletePoll(p.id)} className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--color-border)' }}><FaTrash /> Delete</button>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem' }}>
                                <span><strong>{p.response_count || 0}</strong> responses</span>
                                <span><strong>{Array.isArray(p.questions) ? p.questions.length : JSON.parse(p.questions || '[]').length}</strong> questions</span>
                                {p.ends_at && <span>Closes: {new Date(p.ends_at).toLocaleString()}</span>}
                                <div style={{ marginLeft: 'auto' }}>
                                    <a href={`/manager/polls/${p.id}`} style={{ color: 'var(--teal)', fontWeight: 600, textDecoration: 'none' }}>View Analytics →</a>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* QR Modal */}
            {qrPoll && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setQrPoll(null)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '2rem', textAlign: 'center', maxWidth: 400 }}>
                        <h3 style={{ margin: '0 0 1.5rem' }}>Scan to Vote</h3>
                        <div style={{ background: '#fff', padding: '1rem', borderRadius: 8, display: 'inline-block', marginBottom: '1rem' }}>
                            <QRCode value={`${window.location.origin}/vote/${qrPoll.share_token}`} size={200} />
                        </div>
                        <p style={{ margin: '0 0 1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{qrPoll.title}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button onClick={() => copyLink(qrPoll.share_token)} className="btn btn-secondary"><FaLink /> Copy URL</button>
                            <button onClick={() => setQrPoll(null)} className="btn btn-outline">Close</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowModal(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Create Opinion Poll</h2>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}><FaTimes /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div><label>Poll Title</label><input className="input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. November Pulse Check" /></div>
                            <div><label>Description (Optional)</label><textarea className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Explain the purpose of this poll…" rows={2} style={{ resize: 'vertical' }} /></div>
                            <div><label>Auto-Close Date (Optional)</label><input type="datetime-local" className="input" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} /></div>
                        </div>

                        <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem' }}>Questions</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {form.questions.map((q, qIdx) => (
                                <div key={qIdx} style={{ padding: '1.25rem', background: 'var(--color-surface-alt)', borderRadius: 12, position: 'relative' }}>
                                    {form.questions.length > 1 && <button onClick={() => removeQuestion(qIdx)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><FaTrash /></button>}
                                    <div style={{ marginBottom: '1rem', paddingRight: '2rem' }}>
                                        <label>Question {qIdx + 1}</label>
                                        <input className="input" value={q.text} onChange={e => updateQuestion(qIdx, e.target.value)} placeholder="What would you like to ask?" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1rem', borderLeft: '2px solid var(--color-border)' }}>
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} style={{ display: 'flex', gap: '0.4rem' }}>
                                                <input className="input" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }} value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} />
                                                {q.options.length > 2 && <button onClick={() => removeOption(qIdx, oIdx)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><FaTimes /></button>}
                                            </div>
                                        ))}
                                        <button onClick={() => addOption(qIdx)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--teal)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, padding: '0.4rem 0' }}>+ Add Option</button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={addQuestion} className="btn btn-outline" style={{ width: '100%', marginTop: '1rem', borderStyle: 'dashed' }}><FaPlus /> Add Question</button>

                        {pollError && <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, marginTop: '1.5rem', fontSize: '0.875rem' }}>{pollError}</div>}

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                            <button onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                            <button onClick={submit} disabled={submitting} className="btn btn-primary">{submitting ? 'Creating…' : 'Create Poll'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PollManager;
