import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    FaFacebook, FaTwitter, FaInstagram, FaTiktok, FaShareAlt,
    FaPlus, FaTimes, FaCalendarAlt, FaChartBar, FaHeart,
    FaChartLine, FaSmile, FaMeh, FaFrown, FaLink, FaTrash
} from 'react-icons/fa';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const req = (url, opts = {}) => fetch(url, { ...opts, credentials: 'include' });

const PLATFORMS = [
    { key: 'facebook', label: 'Facebook', icon: <FaFacebook />, color: '#1877f2', limit: 63206 },
    { key: 'twitter', label: 'X / Twitter', icon: <FaTwitter />, color: '#000000', limit: 280 },
    { key: 'instagram', label: 'Instagram', icon: <FaInstagram />, color: '#e1306c', limit: 2200 },
    { key: 'tiktok', label: 'TikTok', icon: <FaTiktok />, color: '#010101', limit: 2200 },
];

const TABS = ['Overview', 'Engagement', 'Sentiment'];

/* ── Simple SVG line chart ─────────────────────────── */
function LineChart({ data, color = '#008080', height = 80 }) {
    if (!data || data.length < 2) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No data yet</div>;
    const max = Math.max(...data.map(d => d.value));
    const min = Math.min(...data.map(d => d.value));
    const range = max - min || 1;
    const w = 300, h = height;
    const pts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((d.value - min) / range) * (h - 10) - 5;
        return `${x},${y}`;
    }).join(' ');
    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
            <polyline points={`0,${h} ${pts} ${w},${h}`} fill={`${color}18`} stroke="none" />
        </svg>
    );
}

/* ── Simple SVG bar chart ──────────────────────────── */
function BarChart({ data, height = 120 }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d.value)) || 1;
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
            {data.map((d, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{d.value?.toLocaleString()}</div>
                    <div style={{ width: '100%', background: d.color || 'var(--teal)', borderRadius: '4px 4px 0 0', height: `${(d.value / max) * (height - 24)}px`, minHeight: 2, transition: 'height 0.4s ease' }} />
                    <div style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', textAlign: 'center', lineHeight: 1.2, maxWidth: 48 }}>{d.label}</div>
                </div>
            ))}
        </div>
    );
}

/* ── Donut chart ───────────────────────────────────── */
function DonutChart({ slices, size = 100 }) {
    if (!slices?.length) return null;
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    let offset = 0;
    const r = 40, circ = 2 * Math.PI * r;
    return (
        <svg width={size} height={size} viewBox="0 0 100 100">
            {slices.map((s, i) => {
                const pct = s.value / total;
                const d = pct * circ;
                const el = <circle key={i} cx={50} cy={50} r={r} fill="none" stroke={s.color} strokeWidth={18}
                    strokeDasharray={`${d} ${circ - d}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" />;
                offset += d;
                return el;
            })}
            <circle cx={50} cy={50} r={31} fill="var(--color-surface)" />
        </svg>
    );
}

export default function SocialMedia() {
    const headers = { 'Content-Type': 'application/json' };

    const [accounts, setAccounts] = useState([]);
    const [posts, setPosts] = useState([]);
    const [metrics, setMetrics] = useState([]);
    const [mentions, setMentions] = useState([]);
    const [keywords, setKeywords] = useState([]);
    const [competitors, setCompetitors] = useState([]);

    const [activeTab, setActiveTab] = useState('Overview');
    const [daysRange, setDaysRange] = useState(30);
    const [composerOpen, setComposerOpen] = useState(false);

    // Composer state
    const [postText, setPostText] = useState('');
    const [selectedPlatforms, setSelectedPlatforms] = useState([]);
    const [postSchedule, setPostSchedule] = useState('');
    const [postStatus, setPostStatus] = useState('');
    const [savingPost, setSavingPost] = useState(false);

    // Competitor input
    const [newCompetitor, setNewCompetitor] = useState({ handle: '', platform: 'twitter' });
    // Keyword input
    const [newKeyword, setNewKeyword] = useState('');

    useEffect(() => { fetchAll(); }, [daysRange]);

    async function fetchAll() {
        const [ar, pr, mr, mnr, kr, cr] = await Promise.all([
            req(`${API}/social/accounts`, { headers }).then(r => r.json()),
            req(`${API}/social/posts`, { headers }).then(r => r.json()),
            req(`${API}/social/metrics?days=${daysRange}`, { headers }).then(r => r.json()),
            req(`${API}/social/mentions`, { headers }).then(r => r.json()),
            req(`${API}/social/keywords`, { headers }).then(r => r.json()),
            req(`${API}/social/competitors`, { headers }).then(r => r.json()),
        ]);
        setAccounts(ar.data || []);
        setPosts(pr.data || []);
        setMetrics(mr.data || []);
        setMentions(mnr.data || []);
        setKeywords(kr.data || []);
        setCompetitors(cr.data || []);
    }

    async function savePost() {
        if (!postText.trim()) return;
        setSavingPost(true);
        setPostStatus('');
        const r = await req(`${API}/social/posts`, {
            method: 'POST', headers,
            body: JSON.stringify({ content_text: postText, platforms: selectedPlatforms, scheduled_at: postSchedule || null, status: postSchedule ? 'scheduled' : 'draft' }),
        });
        setSavingPost(false);
        if (r.ok) { setPostText(''); setSelectedPlatforms([]); setPostSchedule(''); setComposerOpen(false); fetchAll(); }
        else { const d = await r.json(); setPostStatus(d.error || 'Failed'); }
    }

    async function deletePost(id) {
        await req(`${API}/social/posts/${id}`, { method: 'DELETE', headers });
        fetchAll();
    }

    async function addKeyword() {
        if (!newKeyword.trim()) return;
        await req(`${API}/social/keywords`, { method: 'POST', headers, body: JSON.stringify({ keyword: newKeyword }) });
        setNewKeyword('');
        fetchAll();
    }

    async function deleteKeyword(id) {
        await req(`${API}/social/keywords/${id}`, { method: 'DELETE', headers });
        fetchAll();
    }

    async function addCompetitor() {
        if (!newCompetitor.handle) return;
        await req(`${API}/social/competitors`, { method: 'POST', headers, body: JSON.stringify(newCompetitor) });
        setNewCompetitor({ handle: '', platform: 'twitter' });
        fetchAll();
    }

    async function deleteCompetitor(id) {
        await req(`${API}/social/competitors/${id}`, { method: 'DELETE', headers });
        fetchAll();
    }

    // Derived metrics
    const metricsByPlatform = {};
    metrics.forEach(m => { metricsByPlatform[m.platform] = metricsByPlatform[m.platform] || []; metricsByPlatform[m.platform].push(m); });

    const totalFollowers = Object.values(metricsByPlatform).reduce((sum, arr) => {
        const last = arr[arr.length - 1]; return sum + (last?.followers || 0);
    }, 0);

    const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
    mentions.forEach(m => { sentimentCounts[m.sentiment] = (sentimentCounts[m.sentiment] || 0) + 1; });

    const followerTrend = (metricsByPlatform[Object.keys(metricsByPlatform)[0]] || []).map(m => ({ label: m.date, value: m.followers }));
    const reachTrend = (metricsByPlatform[Object.keys(metricsByPlatform)[0]] || []).map(m => ({ label: m.date, value: m.reach }));

    const engagementBars = PLATFORMS.map(p => ({
        label: p.label,
        color: p.color,
        value: (metricsByPlatform[p.key] || []).reduce((s, m) => s + (m.engagements || 0), 0),
    }));

    const statusColor = { draft: '#6b7280', scheduled: '#d97706', posted: '#008080', failed: '#dc2626' };

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '1.2rem' }}>
                    <FaShareAlt />
                </div>
                <div>
                    <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Social Media</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>Manage accounts, posts, and analytics</p>
                </div>
                <button onClick={() => setComposerOpen(true)} className="btn btn-primary" style={{ marginLeft: 'auto' }}>
                    <FaPlus /> Compose Post
                </button>
            </div>

            {/* Connected Accounts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                {PLATFORMS.map(p => {
                    const acc = accounts.find(a => a.platform === p.key);
                    return (
                        <div key={p.key} className="card" style={{ padding: '1rem', borderTop: `3px solid ${p.color}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <span style={{ color: p.color, fontSize: '1.25rem' }}>{p.icon}</span>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{p.label}</span>
                            </div>
                            {acc?.connected ? (
                                <>
                                    <div style={{ fontWeight: 700, fontSize: '1.25rem', color: p.color }}>{(acc.follower_count || 0).toLocaleString()}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>followers</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>@{acc.handle}</div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Not connected</div>
                                    <a href={`#connect-${p.key}`} style={{ fontSize: '0.8rem', color: p.color, fontWeight: 600, textDecoration: 'none' }}>
                                        <FaLink style={{ fontSize: '0.7rem', marginRight: 4 }} />Connect
                                    </a>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
                {/* Main content */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Analytics Tabs */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {TABS.map(t => (
                                    <button key={t} onClick={() => setActiveTab(t)} style={{
                                        padding: '0.4rem 1rem', borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer',
                                        border: `1.5px solid ${activeTab === t ? 'var(--teal)' : 'var(--color-border)'}`,
                                        background: activeTab === t ? 'var(--teal-light)' : 'transparent',
                                        color: activeTab === t ? 'var(--teal)' : 'inherit', fontWeight: activeTab === t ? 700 : 400, fontSize: '0.875rem',
                                    }}>{t}</button>
                                ))}
                            </div>
                            <select className="select" style={{ width: 'auto' }} value={daysRange} onChange={e => setDaysRange(Number(e.target.value))}>
                                <option value={7}>Last 7 days</option>
                                <option value={30}>Last 30 days</option>
                                <option value={90}>Last 90 days</option>
                            </select>
                        </div>

                        {activeTab === 'Overview' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>FOLLOWER GROWTH</div>
                                    <LineChart data={followerTrend} color="var(--teal)" height={90} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>REACH OVER TIME</div>
                                    <LineChart data={reachTrend} color="#7c3aed" height={90} />
                                </div>
                                <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem', paddingTop: '0.5rem' }}>
                                    Total followers across all platforms: <strong style={{ color: 'var(--color-text-main)' }}>{totalFollowers.toLocaleString()}</strong>
                                </div>
                            </div>
                        )}

                        {activeTab === 'Engagement' && (
                            <div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '1rem' }}>ENGAGEMENTS BY PLATFORM</div>
                                <BarChart data={engagementBars} height={140} />
                            </div>
                        )}

                        {activeTab === 'Sentiment' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '1.5rem', alignItems: 'center' }}>
                                <DonutChart size={140} slices={[
                                    { label: 'Positive', value: sentimentCounts.positive, color: '#008080' },
                                    { label: 'Neutral', value: sentimentCounts.neutral, color: '#9ca3af' },
                                    { label: 'Negative', value: sentimentCounts.negative, color: '#ef4444' },
                                ]} />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {[['positive', '#008080', <FaSmile />], ['neutral', '#9ca3af', <FaMeh />], ['negative', '#ef4444', <FaFrown />]].map(([k, col, icon]) => {
                                        const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative || 1;
                                        const pct = Math.round((sentimentCounts[k] / total) * 100);
                                        return (
                                            <div key={k}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.2rem' }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: col }}>{icon} {k}</span>
                                                    <span style={{ fontWeight: 700 }}>{sentimentCounts[k]} ({pct}%)</span>
                                                </div>
                                                <div style={{ height: 6, background: 'var(--gray-200)', borderRadius: 99 }}>
                                                    <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 99, transition: 'width 0.5s ease' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {mentions.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>No mentions tracked yet. Add keywords below.</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Scheduled Posts Queue */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <h3 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaCalendarAlt color="var(--teal)" /> Scheduled Posts</h3>
                        {posts.length === 0 ? (
                            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                <FaShareAlt style={{ fontSize: '2rem', opacity: 0.25, display: 'block', margin: '0 auto 0.5rem' }} />
                                <p style={{ margin: 0 }}>No posts yet. Compose your first post.</p>
                            </div>
                        ) : posts.map(p => {
                            const platforms_list = Array.isArray(p.platforms) ? p.platforms : JSON.parse(p.platforms || '[]');
                            return (
                                <div key={p.id} style={{ display: 'flex', gap: '1rem', padding: '0.875rem', border: '1px solid var(--color-border)', borderRadius: 10, marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
                                            {platforms_list.map(pl => {
                                                const pf = PLATFORMS.find(x => x.key === pl);
                                                return pf ? <span key={pl} style={{ color: pf.color, fontSize: '0.9rem' }}>{pf.icon}</span> : null;
                                            })}
                                        </div>
                                        <p style={{ margin: '0 0 0.4rem', fontSize: '0.875rem' }}>{p.content_text?.slice(0, 120)}{p.content_text?.length > 120 ? '…' : ''}</p>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {p.scheduled_at ? `Scheduled: ${new Date(p.scheduled_at).toLocaleString()}` : 'Draft'}
                                        </div>
                                    </div>
                                    <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: `${statusColor[p.status]}18`, color: statusColor[p.status], flexShrink: 0 }}>{p.status}</span>
                                    <button onClick={() => deletePost(p.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}><FaTrash /></button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Keywords */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <h3 style={{ margin: '0 0 1rem' }}>Keyword Tracking</h3>
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <input className="input" placeholder="Add keyword…" value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addKeyword()} style={{ flex: 1 }} />
                            <button onClick={addKeyword} className="btn btn-primary btn-sm"><FaPlus /></button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {keywords.map(k => (
                                <span key={k.id} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '3px 10px', borderRadius: 20, background: 'var(--teal-light)', color: 'var(--teal)', fontSize: '0.8rem', fontWeight: 500 }}>
                                    #{k.keyword}
                                    <button onClick={() => deleteKeyword(k.id)} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}><FaTimes /></button>
                                </span>
                            ))}
                            {keywords.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>No keywords yet</p>}
                        </div>
                    </div>

                    {/* Competitor Tracker */}
                    <div className="card" style={{ padding: '1.25rem' }}>
                        <h3 style={{ margin: '0 0 1rem' }}>Competitor Tracker</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <select className="select" value={newCompetitor.platform} onChange={e => setNewCompetitor(c => ({ ...c, platform: e.target.value }))}>
                                {PLATFORMS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                            </select>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input className="input" placeholder="@handle" value={newCompetitor.handle} onChange={e => setNewCompetitor(c => ({ ...c, handle: e.target.value }))} style={{ flex: 1 }} />
                                <button onClick={addCompetitor} className="btn btn-primary btn-sm"><FaPlus /></button>
                            </div>
                        </div>
                        {competitors.length > 0 && (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <th style={{ padding: '6px 4px', textAlign: 'left' }}>Handle</th>
                                            <th style={{ padding: '6px 4px', textAlign: 'right' }}>Followers</th>
                                            <th style={{ padding: '6px 4px', textAlign: 'right' }}>Eng%</th>
                                            <th style={{ padding: '6px 4px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {competitors.map(c => {
                                            const pf = PLATFORMS.find(p => p.key === c.platform);
                                            return (
                                                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <td style={{ padding: '6px 4px' }}>
                                                        <span style={{ color: pf?.color, marginRight: 4 }}>{pf?.icon}</span>@{c.handle}
                                                    </td>
                                                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{(c.follower_count || 0).toLocaleString()}</td>
                                                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>{c.engagement_rate || 0}%</td>
                                                    <td style={{ padding: '6px 4px' }}>
                                                        <button onClick={() => deleteCompetitor(c.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}><FaTrash /></button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {competitors.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>No competitors tracked yet</p>}
                    </div>
                </div>
            </div>

            {/* Post Composer Modal */}
            {composerOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--overlay-bg)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setComposerOpen(false)}>
                    <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-surface)', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h2 style={{ margin: 0 }}>Compose Post</h2>
                            <button onClick={() => setComposerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}><FaTimes /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {/* Platform Select */}
                            <div>
                                <label>Platforms</label>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {PLATFORMS.map(p => {
                                        const sel = selectedPlatforms.includes(p.key);
                                        return (
                                            <button key={p.key} onClick={() => setSelectedPlatforms(prev => sel ? prev.filter(x => x !== p.key) : [...prev, p.key])}
                                                style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: `1.5px solid ${sel ? p.color : 'var(--color-border)'}`, background: sel ? `${p.color}14` : 'transparent', color: sel ? p.color : 'var(--color-text-main)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: sel ? 700 : 400 }}>
                                                {p.icon} {p.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Text area */}
                            <div>
                                <label>Message</label>
                                <textarea className="input" rows={5} value={postText} onChange={e => setPostText(e.target.value)} placeholder="What do you want to share?" style={{ resize: 'vertical' }} />
                                {/* Per-platform char check */}
                                {selectedPlatforms.length > 0 && (
                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                                        {selectedPlatforms.map(pl => {
                                            const p = PLATFORMS.find(x => x.key === pl);
                                            const over = postText.length > p.limit;
                                            return <span key={pl} style={{ fontSize: '0.75rem', color: over ? 'var(--danger)' : 'var(--color-text-muted)' }}>{p.label}: {postText.length}/{p.limit} {over && '⚠'}</span>;
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Schedule */}
                            <div>
                                <label>Schedule (optional)</label>
                                <input type="datetime-local" className="input" value={postSchedule} onChange={e => setPostSchedule(e.target.value)} />
                            </div>

                            {postStatus && <p style={{ color: 'var(--danger)', margin: 0, fontSize: '0.875rem' }}>{postStatus}</p>}

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button onClick={() => setComposerOpen(false)} className="btn btn-outline" style={{ flex: 1 }}>Cancel</button>
                                <button onClick={savePost} disabled={savingPost} className="btn btn-primary" style={{ flex: 1 }}>
                                    {savingPost ? 'Saving…' : postSchedule ? '📅 Schedule' : '💾 Save Draft'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
