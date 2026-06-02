import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FaArrowLeft, FaChartPie, FaChartBar, FaUsers, FaMapMarkerAlt, FaFilter } from 'react-icons/fa';
import { kenyaLocations } from '../../utils/kenyaLocations';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function PollResults() {
    const { id } = useParams();
    const navigate = useNavigate();
    const token = localStorage.getItem('uchaguzi360_token');
    const headers = { Authorization: `Bearer ${token}` };

    const [poll, setPoll] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [filters, setFilters] = useState({ county: '', constituency: '', ward: '', polling_station: '' });
    const [rawGeo, setRawGeo] = useState(null); // to get polling stations list
    const [isFiltering, setIsFiltering] = useState(false);

    useEffect(() => {
        fetch(`${API}/polls/${id}`, { headers }).then(r => r.json()).then(d => setPoll(d.data));
        // initial fetch just for rawGeo stations
        fetch(`${API}/polls/${id}/results`, { headers }).then(r => r.json()).then(d => setRawGeo(d.geographic_breakdown));
    }, [id]);

    useEffect(() => {
        setIsFiltering(true);
        const queryParams = new URLSearchParams(Object.entries(filters).filter(([_, v]) => v)).toString();
        const url = `${API}/polls/${id}/results${queryParams ? `?${queryParams}` : ''}`;
        fetch(url, { headers })
            .then(r => r.json())
            .then(d => setAnalytics(d))
            .finally(() => setIsFiltering(false));
    }, [id, filters]);

    if (!poll || !analytics) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading analytics…</div>;

    const qList = Array.isArray(poll.questions) ? poll.questions : JSON.parse(poll.questions || '[]');

    // Auto-populate filter options
    const counties = [...kenyaLocations].map(c => c.name).sort();
    const selectedCountyObj = kenyaLocations.find(c => c.name === filters.county);
    const constituencies = selectedCountyObj ? selectedCountyObj.constituencies.map(c => c.name).sort() : [];
    const selectedConstObj = selectedCountyObj?.constituencies.find(c => c.name === filters.constituency);
    const wards = selectedConstObj ? selectedConstObj.wards.sort() : [];
    const pollingStations = rawGeo?.polling_station ? Object.keys(rawGeo.polling_station).sort() : [];

    return (
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
            <button onClick={() => navigate('/manager/polls')} className="btn btn-outline btn-sm" style={{ marginBottom: '1rem', border: 'none', paddingLeft: 0 }}><FaArrowLeft /> Back to Polls</button>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '1.8rem', margin: '0 0 0.5rem' }}>{poll.title} - Results</h1>
                <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>{poll.description}</p>
            </div>

            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', background: 'var(--color-surface-alt)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--color-text-muted)' }}><FaFilter /> Filters</div>

                <select className="select" style={{ minWidth: 150, padding: '0.4rem 0.8rem', flex: 1 }} value={filters.county} onChange={e => setFilters(prev => ({ ...prev, county: e.target.value, constituency: '', ward: '', polling_station: '' }))}>
                    <option value="">All Counties</option>
                    {counties.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select className="select" style={{ minWidth: 150, padding: '0.4rem 0.8rem', flex: 1 }} value={filters.constituency} onChange={e => setFilters(prev => ({ ...prev, constituency: e.target.value, ward: '', polling_station: '' }))}>
                    <option value="">All Constituencies</option>
                    {constituencies.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select className="select" style={{ minWidth: 150, padding: '0.4rem 0.8rem', flex: 1 }} value={filters.ward} onChange={e => setFilters(prev => ({ ...prev, ward: e.target.value, polling_station: '' }))}>
                    <option value="">All Wards</option>
                    {wards.map(w => <option key={w} value={w}>{w}</option>)}
                </select>

                <select className="select" style={{ minWidth: 150, padding: '0.4rem 0.8rem', flex: 1 }} value={filters.polling_station} onChange={e => setFilters(prev => ({ ...prev, polling_station: e.target.value }))}>
                    <option value="">All Polling Stations</option>
                    {pollingStations.map(p => <option key={p} value={p}>{p}</option>)}
                </select>

                {(filters.county || filters.constituency || filters.ward || filters.polling_station) && (
                    <button type="button" onClick={() => setFilters({ county: '', constituency: '', ward: '', polling_station: '' })} className="btn btn-outline" style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>Clear</button>
                )}
            </div>

            <div style={{ opacity: isFiltering ? 0.6 : 1, transition: 'opacity 0.2s', pointerEvents: isFiltering ? 'none' : 'auto' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--teal-light)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><FaUsers /></div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{analytics.total_votes}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Responses</div>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(59,130,246,0.12)', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><FaChartBar /></div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{analytics.total_votes > 0 ? Math.round((analytics.registered / analytics.total_votes) * 100) : 0}%</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Registered Voters</div>
                        </div>
                    </div>
                    <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,158,11,0.12)', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><FaMapMarkerAlt /></div>
                        <div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{Object.keys(analytics.geographic_breakdown?.county || {}).length}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Counties Reached</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    {qList.map((q, qIdx) => {
                        const breakdown = analytics.results_by_question?.[qIdx]?.tally || {};
                        const total = Object.values(breakdown).reduce((s, a) => s + a, 0) || 1;
                        const options = q.options.map(opt => ({ text: opt, count: breakdown[opt] || 0, pct: Math.round(((breakdown[opt] || 0) / total) * 100) })).sort((a, b) => b.count - a.count);

                        return (
                            <div key={qIdx} className="card" style={{ padding: '1.5rem' }}>
                                <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem' }}>{qIdx + 1}. {q.text}</h3>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {options.map((opt, oIdx) => (
                                        <div key={oIdx}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.875rem' }}>
                                                <span style={{ fontWeight: oIdx === 0 ? 600 : 400 }}>{opt.text}</span>
                                                <span style={{ color: 'var(--color-text-muted)' }}>{opt.count} ({opt.pct}%)</span>
                                            </div>
                                            <div style={{ height: 8, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${opt.pct}%`, background: oIdx === 0 ? 'var(--teal)' : 'var(--gray-300)', borderRadius: 99, transition: 'width 1s ease-out' }} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export default PollResults;
