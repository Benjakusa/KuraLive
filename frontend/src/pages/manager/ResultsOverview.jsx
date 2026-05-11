import { useState, useEffect } from 'react';
import {
    FaChartBar, FaMapMarkerAlt, FaUserCheck, FaVoteYea,
    FaFileImage, FaTimes, FaFilePdf, FaFileExcel,
    FaCheckCircle, FaClock, FaArrowDown, FaTrophy,
} from 'react-icons/fa';
import { BsArrowClockwise } from 'react-icons/bs';
import { useData } from '../../contexts/DataContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

/* ─── helpers ─────────────────────────────────────── */
const pct = (n, d) => (d > 0 ? ((n / d) * 100).toFixed(1) : '0.0');

const CANDIDATE_COLORS = [
    '#008080', '#F57C00', '#1976D2', '#7B1FA2',
    '#C62828', '#2E7D32', '#00838F', '#AD1457',
];

/* ─── Glass card wrapper ──────────────────────────── */
const GlassCard = ({ children, style = {} }) => (
    <div style={{
        background: 'var(--color-surface)',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        ...style,
    }}>
        {children}
    </div>
);

const CardHeader = ({ title, subtitle, action }) => (
    <div style={{
        padding: '1.1rem 1.5rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem',
    }}>
        <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-text-main)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: 2 }}>{subtitle}</div>}
        </div>
        {action}
    </div>
);

/* ─── Stat metric card ────────────────────────────── */
const StatMetric = ({ label, value, sub, accent, icon }) => (
    <div style={{
        borderRadius: '14px',
        padding: '1.1rem 1.25rem',
        background: accent
            ? `linear-gradient(135deg, ${accent}, ${accent}cc)`
            : 'var(--color-surface)',
        border: accent ? 'none' : '1px solid var(--color-border)',
        boxShadow: accent
            ? `0 6px 24px ${accent}40`
            : '0 2px 12px rgba(0,0,0,0.05)',
        color: accent ? 'white' : 'var(--color-text-main)',
        position: 'relative', overflow: 'hidden',
        flex: '1 1 160px', minWidth: 0,
    }}>
        {accent && (
            <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(255,255,255,0.12)',
            }} />
        )}
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            marginBottom: '0.4rem',
            opacity: accent ? 0.85 : 1,
            fontSize: '0.72rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: accent ? 'rgba(255,255,255,0.85)' : 'var(--color-text-muted)',
        }}>
            {icon} {label}
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {value}
        </div>
        {sub && (
            <div style={{
                fontSize: '0.8rem', marginTop: 4,
                color: accent ? 'rgba(255,255,255,0.75)' : 'var(--color-text-muted)',
            }}>
                {sub}
            </div>
        )}
    </div>
);

/* ─── Excel export helpers ────────────────────────── */
function exportResultsToExcel(candidates, results, stations) {
    const candidateCols = candidates.map(c => c.name);

    const rows = results.map(res => {
        const reg = stations.find(s => s.id === res.station_id)?.registered_voters || 0;
        const totalVotes = candidates.reduce((sum, c) => sum + (parseInt(res.results_data?.[c.id]) || 0), 0);
        const row = {
            'Station': res.station_name || '—',
            'Agent': res.agent_name || '—',
            'Submitted At': res.timestamp ? new Date(res.timestamp).toLocaleString('en-KE') : '—',
            'Registered Voters': reg,
            'Total Votes Cast': totalVotes,
            'Turnout %': reg > 0 ? `${pct(totalVotes, reg)}%` : '—',
            'Spoilt Votes': res.stats?.spoilt || 0,
            'Rejected Votes': res.stats?.rejected || 0,
        };
        candidates.forEach(c => {
            row[c.name] = parseInt(res.results_data?.[c.id]) || 0;
        });
        return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, 'KuraLive_Results.xlsx');
}

function exportAnalyticsToExcel({ totalRegistered, totalVotesCast, reportingProgress, stationsIn, stations, candidates, aggregatedVotes }) {
    const summary = [
        { 'Metric': 'Total Registered Voters', 'Value': totalRegistered },
        { 'Metric': 'Total Votes Cast', 'Value': totalVotesCast },
        { 'Metric': 'Voter Turnout %', 'Value': `${pct(totalVotesCast, totalRegistered)}%` },
        { 'Metric': 'Stations Reporting', 'Value': `${stationsIn} / ${stations.length}` },
        { 'Metric': 'Reporting Progress %', 'Value': `${reportingProgress}%` },
    ];

    const candidateRows = candidates.map((c, i) => {
        const votes = aggregatedVotes[c.id] || 0;
        return {
            'Rank': i + 1,
            'Candidate': c.name,
            'Party': c.party || '—',
            'Votes': votes,
            'Vote Share %': `${pct(votes, totalVotesCast)}%`,
        };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(candidateRows), 'Candidate Totals');
    XLSX.writeFile(wb, 'KuraLive_Analytics.xlsx');
}

/* ─── PDF from image ──────────────────────────────── */
async function downloadProofAsPDF(imageUrl, stationName) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });

    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

    const orientation = img.naturalWidth > img.naturalHeight ? 'l' : 'p';
    const pdf = new jsPDF({ orientation, unit: 'px', format: [img.naturalWidth, img.naturalHeight] });
    pdf.addImage(dataUrl, 'JPEG', 0, 0, img.naturalWidth, img.naturalHeight);
    pdf.save(`${stationName.replace(/\s+/g, '_')}_Results_Form.pdf`);
}

/* ─────────────────────────────────────────────────── */
/*  MAIN COMPONENT                                     */
/* ─────────────────────────────────────────────────── */
const ResultsOverview = () => {
    const { electionDetails, stations, results, loading, error, refreshData } = useData();
    const [aggregatedVotes, setAggregatedVotes] = useState({});
    const [reportingProgress, setReportingProgress] = useState(0);
    const [stationsIn, setStationsIn] = useState(0);
    const [totalRegistered, setTotalRegistered] = useState(0);
    const [viewingDoc, setViewingDoc] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'breakdown' | 'pending'

    useEffect(() => {
        if (!electionDetails?.details?.candidates) return;
        const totals = {};
        electionDetails.details.candidates.forEach(c => (totals[c.id] = 0));
        let submittedCount = 0;
        results.forEach(sub => {
            if (sub.results_data) {
                submittedCount++;
                Object.entries(sub.results_data).forEach(([cid, count]) => {
                    totals[cid] = (totals[cid] || 0) + parseInt(count, 10);
                });
            }
        });
        setAggregatedVotes(totals);
        setStationsIn(submittedCount);
        if (stations.length > 0)
            setReportingProgress(Math.round((submittedCount / stations.length) * 100));
        setTotalRegistered(
            stations.reduce((s, st) => s + (parseInt(st.registered_voters) || 0), 0)
        );
    }, [results, electionDetails, stations]);

    const candidates = electionDetails?.details?.candidates || [];
    const totalVotesCast = Object.values(aggregatedVotes).reduce((a, b) => a + b, 0);
    const pendingStations = stations.filter(
        s => !results.some(r => r.station_id === s.id && r.results_data)
    );

    // Sort candidates by votes descending
    const rankedCandidates = [...candidates].sort(
        (a, b) => (aggregatedVotes[b.id] || 0) - (aggregatedVotes[a.id] || 0)
    );

    /* ── Loading / Error states ── */
    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                <div style={{
                    width: 44, height: 44, border: '3px solid var(--color-border)',
                    borderTopColor: 'var(--teal)', borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
                }} />
                Loading results…
            </div>
        </div>
    );

    if (error) return (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--danger)' }}>Error: {error}</div>
    );

    if (!electionDetails?.details?.candidates) return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: '50vh', color: 'var(--color-text-muted)',
            gap: '1rem',
        }}>
            <FaVoteYea style={{ fontSize: '3.5rem', opacity: 0.2 }} />
            <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>No Active Election</div>
            <div style={{ fontSize: '0.88rem' }}>Set up an election in Election Setup to see results here.</div>
        </div>
    );

    /* ── Tab button style ── */
    const tabStyle = (active) => ({
        padding: '0.5rem 1.1rem',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.85rem',
        transition: 'all 0.18s',
        background: active ? 'var(--teal)' : 'transparent',
        color: active ? 'white' : 'var(--color-text-muted)',
        boxShadow: active ? '0 2px 8px rgba(0,128,128,0.3)' : 'none',
    });

    return (
        <div style={{ paddingBottom: '3rem' }}>

            {/* ── Page header ── */}
            <div style={{
                display: 'flex', flexWrap: 'wrap',
                justifyContent: 'space-between', alignItems: 'flex-start',
                marginBottom: '1.75rem', gap: '1rem',
            }}>
                <div>
                    <h1 style={{
                        fontSize: 'clamp(1.4rem, 4vw, 2rem)', margin: 0,
                        fontWeight: 800, letterSpacing: '-0.02em',
                    }}>
                        {electionDetails.details.name || 'Live Results'}
                    </h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)', fontSize: '0.87rem' }}>
                        {electionDetails.details.type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        {electionDetails.details.date && ` — ${new Date(electionDetails.details.date).toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => exportAnalyticsToExcel({ totalRegistered, totalVotesCast, reportingProgress, stationsIn, stations, candidates: rankedCandidates, aggregatedVotes })}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #2E7D32',
                            background: '#E8F5E9', color: '#2E7D32', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#2E7D32'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#E8F5E9'; e.currentTarget.style.color = '#2E7D32'; }}
                        title="Export analytics summary to Excel"
                    >
                        <FaFileExcel /> Export Analytics
                    </button>
                    <button
                        onClick={() => exportResultsToExcel(candidates, results, stations)}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.4rem',
                            padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #1976D2',
                            background: '#E3F2FD', color: '#1976D2', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#1976D2'; e.currentTarget.style.color = 'white'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#E3F2FD'; e.currentTarget.style.color = '#1976D2'; }}
                        title="Export full results breakdown to Excel"
                    >
                        <FaFileExcel /> Export Results
                    </button>
                    <button
                        className="btn btn-outline"
                        onClick={refreshData}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.82rem' }}
                    >
                        <BsArrowClockwise /> Refresh
                    </button>
                </div>
            </div>

            {/* ── Stat cards row ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                <StatMetric
                    label="Registered Voters"
                    value={totalRegistered.toLocaleString()}
                    sub="across all polling stations"
                    accent="#008080"
                    icon={<FaUserCheck />}
                />
                <StatMetric
                    label="Votes Cast"
                    value={totalVotesCast.toLocaleString()}
                    sub={`${pct(totalVotesCast, totalRegistered)}% turnout`}
                    accent="#F57C00"
                    icon={<FaVoteYea />}
                />
                <StatMetric
                    label="Stations Reporting"
                    value={`${stationsIn} / ${stations.length}`}
                    sub={`${pendingStations.length} still pending`}
                    icon={<FaMapMarkerAlt />}
                />
                <StatMetric
                    label="Reporting Progress"
                    value={`${reportingProgress}%`}
                    sub={
                        <div style={{ marginTop: 6 }}>
                            <div style={{ height: 4, borderRadius: 2, background: 'var(--gray-200)', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%', borderRadius: 2,
                                    background: `linear-gradient(90deg, var(--teal), #00BCD4)`,
                                    width: `${reportingProgress}%`, transition: 'width 0.5s ease',
                                }} />
                            </div>
                        </div>
                    }
                    icon={<FaChartBar />}
                />
            </div>

            {/* ── Tab navigation ── */}
            <div style={{
                display: 'flex', gap: '0.35rem',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: '10px', padding: '0.35rem',
                marginBottom: '1.5rem', width: 'fit-content',
            }}>
                {[
                    { id: 'overview', label: 'Overview' },
                    { id: 'breakdown', label: 'Per-Station Breakdown' },
                    { id: 'pending', label: `Pending (${pendingStations.length})` },
                ].map(t => (
                    <button key={t.id} style={tabStyle(activeTab === t.id)} onClick={() => setActiveTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ════════════ OVERVIEW TAB ════════════ */}
            {activeTab === 'overview' && (
                <>
                    {/* Candidate results */}
                    <div style={{ marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h2 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)' }}>
                            Candidate Results
                        </h2>
                    </div>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                        gap: '1rem', marginBottom: '1.75rem',
                    }}>
                        {rankedCandidates.map((candidate, i) => {
                            const origIdx = candidates.indexOf(candidate);
                            const color = CANDIDATE_COLORS[origIdx % CANDIDATE_COLORS.length];
                            const voteCount = aggregatedVotes[candidate.id] || 0;
                            const percentage = pct(voteCount, totalVotesCast);
                            const isLeader = i === 0 && totalVotesCast > 0;
                            return (
                            <GlassCard key={candidate.id} style={{
                                border: `1.5px solid ${color}40`,
                                boxShadow: `0 4px 24px ${color}18, 0 1px 4px rgba(0,0,0,0.04)`,
                            }}>
                                <div style={{ padding: '1.1rem 1.1rem 1.1rem 1.35rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{candidate.name}</div>
                                                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{candidate.party || '—'}</div>
                                            </div>
                                            <div style={{
                                                display: 'flex', alignItems: 'center', gap: '0.3rem',
                                                minWidth: 28, height: 28, borderRadius: '50%',
                                                background: isLeader ? '#FFF8E1' : `${color}18`,
                                                color: isLeader ? '#F9A825' : color,
                                                justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                                            }}>
                                                {isLeader ? <FaTrophy /> : `#${i + 1}`}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.6rem' }}>
                                            <div>
                                                <div style={{ fontSize: '1.85rem', fontWeight: 800, lineHeight: 1, color }}>{voteCount.toLocaleString()}</div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>votes</div>
                                            </div>
                                            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--color-text-muted)' }}>{percentage}%</div>
                                        </div>
                                        {totalVotesCast > 0 && (
                                            <div style={{ height: 7, borderRadius: 4, background: 'var(--gray-200)', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: 4, background: color,
                                                    width: `${percentage}%`, transition: 'width 0.6s ease',
                                                }} />
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>

                    {/* Turnout analytics table */}
                    <GlassCard style={{ marginBottom: '1.75rem' }}>
                        <CardHeader
                            title="Station Turnout Analytics"
                            subtitle={`${results.length} submissions received`}
                        />
                        <div style={{ overflowX: 'auto' }}>
                            {results.length === 0 ? (
                                <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <FaVoteYea style={{ fontSize: '2.5rem', opacity: 0.18, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                                    No submissions yet. Results will appear here once agents submit.
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                            {['Station', 'Agent', 'Time', 'Reg. Voters', 'Votes Cast', 'Turnout', 'Document'].map(h => (
                                                <th key={h} style={{
                                                    padding: '0.7rem 1rem', textAlign: h === 'Document' ? 'center' : 'left',
                                                    fontSize: '0.72rem', fontWeight: 700,
                                                    color: 'var(--color-text-muted)', textTransform: 'uppercase',
                                                    letterSpacing: '0.06em', whiteSpace: 'nowrap',
                                                }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {results.map((res, i) => {
                                            const reg = stations.find(s => s.id === res.station_id)?.registered_voters || 0;
                                            const cast = candidates.reduce((sum, c) => sum + (parseInt(res.results_data?.[c.id]) || 0), 0);
                                            const turnoutPct = pct(cast, reg);
                                            return (
                                                <tr key={res.id}
                                                    style={{ borderBottom: i < results.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 0.12s' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <td style={{ padding: '0.9rem 1rem' }}>
                                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{res.station_name}</div>
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{res.agent_name}</td>
                                                    <td style={{ padding: '0.9rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                                                        {res.timestamp ? new Date(res.timestamp).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>{(parseInt(reg) || 0).toLocaleString()}</td>
                                                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}>{cast.toLocaleString()}</td>
                                                    <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--gray-200)', overflow: 'hidden', minWidth: 60 }}>
                                                                <div style={{ height: '100%', borderRadius: 3, background: 'var(--teal)', width: `${Math.min(100, parseFloat(turnoutPct))}%` }} />
                                                            </div>
                                                            <span style={{ whiteSpace: 'nowrap', fontWeight: 600 }}>{reg > 0 ? `${turnoutPct}%` : '—'}</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                                                        {res.proof_image && res.proof_image !== 'Image Upload Failed' ? (
                                                            <button
                                                                onClick={() => setViewingDoc(res)}
                                                                style={{
                                                                    background: 'var(--teal-light)', border: '1px solid var(--color-border)',
                                                                    borderRadius: '8px', padding: '5px 12px',
                                                                    cursor: 'pointer', color: 'var(--teal)', fontSize: '0.8rem',
                                                                    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5,
                                                                    transition: 'all 0.15s',
                                                                }}
                                                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--teal)'; e.currentTarget.style.color = 'white'; }}
                                                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--teal-light)'; e.currentTarget.style.color = 'var(--teal)'; }}
                                                            >
                                                                <FaFileImage /> View
                                                            </button>
                                                        ) : (
                                                            <span style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 600 }}>Missing</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </GlassCard>
                </>
            )}

            {/* ════════════ BREAKDOWN TAB ════════════ */}
            {activeTab === 'breakdown' && (
                <GlassCard>
                    <CardHeader
                        title="Per-Station Vote Breakdown"
                        subtitle="Individual candidate tallies per polling station"
                        action={
                            <button
                                onClick={() => exportResultsToExcel(candidates, results, stations)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                                    padding: '0.45rem 0.9rem', borderRadius: '7px',
                                    border: '1px solid #2E7D32', background: '#E8F5E9',
                                    color: '#2E7D32', cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem',
                                }}
                            >
                                <FaFileExcel /> Export
                            </button>
                        }
                    />
                    <div style={{ overflowX: 'auto' }}>
                        {results.length === 0 ? (
                            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                No results submitted yet.
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'rgba(0,128,128,0.04)' }}>
                                        <th style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Station</th>
                                        {candidates.map((c, i) => (
                                            <th key={c.id} style={{
                                                padding: '0.7rem 0.8rem', textAlign: 'center',
                                                fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap',
                                                color: CANDIDATE_COLORS[i % CANDIDATE_COLORS.length],
                                                textTransform: 'uppercase', letterSpacing: '0.05em',
                                            }}>
                                                {c.name.split(' ')[0]}
                                            </th>
                                        ))}
                                        <th style={{ padding: '0.7rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Total</th>
                                        <th style={{ padding: '0.7rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Spoilt</th>
                                        <th style={{ padding: '0.7rem 1rem', textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>Rejected</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((res, i) => {
                                        const stationTotal = candidates.reduce((s, c) => s + (parseInt(res.results_data?.[c.id]) || 0), 0);
                                        return (
                                            <tr key={res.id}
                                                style={{ borderBottom: i < results.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 0.12s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,128,128,0.03)'}
                                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                            >
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{res.station_name}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{res.agent_name}</div>
                                                </td>
                                                {candidates.map(c => (
                                                    <td key={c.id} style={{ padding: '0.85rem 0.8rem', textAlign: 'center', fontWeight: 600, fontSize: '0.88rem' }}>
                                                        {(parseInt(res.results_data?.[c.id]) || 0).toLocaleString()}
                                                    </td>
                                                ))}
                                                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'var(--teal)' }}>
                                                    {stationTotal.toLocaleString()}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    {res.stats?.spoilt ?? '—'}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    {res.stats?.rejected ?? '—'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                {/* Totals footer */}
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid var(--color-border)', background: 'rgba(0,128,128,0.05)' }}>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-muted)' }}>Totals</td>
                                        {candidates.map(c => (
                                            <td key={c.id} style={{ padding: '0.85rem 0.8rem', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', color: 'var(--teal)' }}>
                                                {(aggregatedVotes[c.id] || 0).toLocaleString()}
                                            </td>
                                        ))}
                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right', fontWeight: 800, fontSize: '0.95rem', color: 'var(--teal)' }}>
                                            {totalVotesCast.toLocaleString()}
                                        </td>
                                        <td colSpan={2} />
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                </GlassCard>
            )}

            {/* ════════════ PENDING TAB ════════════ */}
            {activeTab === 'pending' && (
                <GlassCard>
                    <CardHeader
                        title="Pending / Incomplete Stations"
                        subtitle={`${pendingStations.length} station${pendingStations.length !== 1 ? 's' : ''} have not yet submitted results`}
                    />
                    {pendingStations.length === 0 ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}>
                            <FaCheckCircle style={{ fontSize: '3rem', color: 'var(--success)', opacity: 0.7, marginBottom: '0.75rem', display: 'block', margin: '0 auto 0.75rem' }} />
                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>All stations have reported!</div>
                            <div style={{ color: 'var(--color-text-muted)', fontSize: '0.87rem', marginTop: 4 }}>Every polling station has submitted results.</div>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 400 }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                        {['Station', 'Location', 'Registered Voters', 'Status'].map(h => (
                                            <th key={h} style={{
                                                padding: '0.7rem 1rem', textAlign: 'left',
                                                fontSize: '0.72rem', fontWeight: 700,
                                                color: 'var(--color-text-muted)', textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingStations.map((s, i) => (
                                        <tr key={s.id}
                                            style={{ borderBottom: i < pendingStations.length - 1 ? '1px solid var(--color-border)' : 'none', transition: 'background 0.12s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '0.9rem 1rem', fontWeight: 600, fontSize: '0.88rem' }}>{s.name}</td>
                                            <td style={{ padding: '0.9rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                                                {[s.ward, s.constituency, s.county].filter(Boolean).join(', ') || '—'}
                                            </td>
                                            <td style={{ padding: '0.9rem 1rem', fontSize: '0.85rem' }}>
                                                {(parseInt(s.registered_voters) || 0).toLocaleString()}
                                            </td>
                                            <td style={{ padding: '0.9rem 1rem' }}>
                                                <span style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                                    padding: '3px 10px', borderRadius: 20,
                                                    background: '#FFF3E0', color: '#E65100',
                                                    fontSize: '0.75rem', fontWeight: 700,
                                                }}>
                                                    <FaClock style={{ fontSize: '0.7rem' }} /> Awaiting
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            )}

            {/* ════════════ DOCUMENT VIEWER MODAL ════════════ */}
            {viewingDoc && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.78)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 2000,
                        padding: '1.5rem',
                    }}
                    onClick={() => setViewingDoc(null)}
                >
                    <div
                        style={{
                            background: 'var(--color-surface)', borderRadius: '18px',
                            maxWidth: '90vw', maxHeight: '90vh', overflow: 'hidden',
                            boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
                            display: 'flex', flexDirection: 'column',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal header */}
                        <div style={{
                            padding: '1rem 1.25rem',
                            borderBottom: '1px solid var(--color-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{viewingDoc.station_name}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                                    Submitted by {viewingDoc.agent_name}
                                    {viewingDoc.timestamp && ` · ${new Date(viewingDoc.timestamp).toLocaleString('en-KE')}`}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button
                                    onClick={async () => {
                                        setPdfLoading(true);
                                        try {
                                            await downloadProofAsPDF(viewingDoc.proof_image, viewingDoc.station_name);
                                        } catch (e) {
                                            alert('Could not convert to PDF. Try right-clicking the image and saving instead.');
                                        }
                                        setPdfLoading(false);
                                    }}
                                    disabled={pdfLoading}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6,
                                        padding: '0.45rem 0.9rem', borderRadius: '8px',
                                        border: '1px solid #C62828', background: '#FFEBEE',
                                        color: '#C62828', cursor: pdfLoading ? 'not-allowed' : 'pointer',
                                        fontWeight: 600, fontSize: '0.82rem', opacity: pdfLoading ? 0.6 : 1,
                                        transition: 'all 0.15s',
                                    }}
                                    onMouseEnter={e => { if (!pdfLoading) { e.currentTarget.style.background = '#C62828'; e.currentTarget.style.color = '#fff'; } }}
                                    onMouseLeave={e => { e.currentTarget.style.background = '#FFEBEE'; e.currentTarget.style.color = '#C62828'; }}
                                >
                                    <FaFilePdf /> {pdfLoading ? 'Generating…' : 'Download PDF'}
                                </button>
                                <button
                                    onClick={() => setViewingDoc(null)}
                                    style={{
                                        background: 'rgba(0,0,0,0.08)', border: 'none', borderRadius: '50%',
                                        width: 34, height: 34, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--color-text-muted)', transition: 'background 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.18)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        {/* Image area */}
                        <div style={{ overflow: 'auto', padding: '1rem', flex: 1 }}>
                            {(viewingDoc.proof_image.startsWith('http') || viewingDoc.proof_image.startsWith('/uploads/')) ? (
                                <img
                                    src={viewingDoc.proof_image}
                                    alt="Results Form"
                                    style={{ maxWidth: '100%', maxHeight: '72vh', display: 'block', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                                    onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                                />
                            ) : null}
                            <div style={{ display: 'none', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--color-text-muted)', gap: '1rem' }}>
                                <FaFileImage style={{ fontSize: '2.5rem', opacity: 0.3 }} />
                                <span>Could not load document. The image may have been moved or deleted.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default ResultsOverview;
