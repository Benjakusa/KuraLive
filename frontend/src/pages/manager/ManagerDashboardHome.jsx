import { useState } from 'react';
import {
    FaVoteYea, FaMapMarkedAlt, FaUserFriends, FaCheckCircle,
    FaPlus, FaChartBar, FaEye, FaCreditCard, FaClock, FaExclamationTriangle,
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { useSubscription } from '../../contexts/SubscriptionContext';
import UpgradeModal from '../../components/UpgradeModal';

/* ─── Gradient stat card ──────────────────────────── */
const StatCard = ({ title, value, sub, icon, gradient, iconBg }) => (
    <div style={{
        flex: '1 1 180px', minWidth: 0,
        borderRadius: '14px',
        padding: '1.15rem 1.25rem',
        background: gradient || 'var(--color-surface)',
        border: gradient ? 'none' : '1px solid var(--color-border)',
        boxShadow: gradient ? `0 6px 24px ${gradient.split(',')[0].replace('linear-gradient(135deg,', '').trim()}40` : '0 2px 12px rgba(0,0,0,0.05)',
        color: gradient ? 'white' : 'var(--color-text-main)',
        position: 'relative', overflow: 'hidden',
        transition: 'transform 0.18s, box-shadow 0.18s',
        cursor: 'default',
    }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
        {/* Decorative circle */}
        {gradient && (
            <div style={{
                position: 'absolute', top: -22, right: -22,
                width: 80, height: 80, borderRadius: '50%',
                background: 'rgba(255,255,255,0.13)',
            }} />
        )}
        <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            marginBottom: '0.5rem',
        }}>
            <div style={{
                width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: iconBg || 'rgba(255,255,255,0.22)',
                color: gradient ? 'white' : iconBg ? 'var(--teal)' : 'var(--color-text-muted)',
                fontSize: '1.1rem',
            }}>
                {icon}
            </div>
            <div style={{
                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.07em',
                color: gradient ? 'rgba(255,255,255,0.8)' : 'var(--color-text-muted)',
            }}>
                {title}
            </div>
        </div>
        <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {value}
        </div>
        {sub && (
            <div style={{
                fontSize: '0.78rem', marginTop: '0.3rem',
                color: gradient ? 'rgba(255,255,255,0.72)' : 'var(--color-text-muted)',
            }}>
                {sub}
            </div>
        )}
    </div>
);

/* ─── Section card wrapper ────────────────────────── */
const Card = ({ children, style = {} }) => (
    <div style={{
        background: 'var(--color-surface)',
        borderRadius: '14px',
        border: '1px solid var(--color-border)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        padding: '1.35rem',
        ...style,
    }}>
        {children}
    </div>
);

const ManagerDashboardHome = () => {
    const navigate = useNavigate();
    const { electionDetails, stations, agents, results, loading } = useData();
    const { currentPlan, isTrial, isExpired, getDaysLeft } = useSubscription();
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const activeElections = electionDetails ? 1 : 0;
    const totalStations = stations.length;
    const activeAgents = agents.filter(a => a.status === 'Active').length;
    const submittedStations = results.filter(r => r.results_data).length;
    const pendingStations = Math.max(0, totalStations - submittedStations);
    const reportingPct = totalStations > 0 ? Math.round((submittedStations / totalStations) * 100) : 0;

    const recentActivity = results
        .slice(0, 5)
        .map(r => ({ name: r.station_name, agent: r.agent_name, time: r.timestamp }));

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: 'var(--color-text-muted)' }}>
            <div style={{
                width: 40, height: 40, border: '3px solid var(--color-border)',
                borderTopColor: 'var(--teal)', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
            }} />
            Loading dashboard…
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const currentPlanDetails = currentPlan();
    const daysLeft = getDaysLeft();
    const expired = isExpired();
    const trial = isTrial();

    return (
        <div style={{ padding: '0.5rem', paddingBottom: '2rem' }}>
            <h1 style={{ fontSize: 'clamp(1.4rem, 4vw, 2rem)', marginBottom: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                Dashboard Overview
            </h1>

            {/* Trial / Expired banner */}
            {(trial || expired) && (
                <div style={{
                    marginBottom: '1.5rem', padding: '1rem 1.35rem',
                    background: expired ? 'rgba(255,68,68,0.07)' : 'rgba(255,193,7,0.07)',
                    border: `1px solid ${expired ? 'rgba(255,68,68,0.28)' : 'rgba(255,193,7,0.28)'}`,
                    borderRadius: '12px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: '1rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <FaClock style={{ color: expired ? 'var(--danger)' : 'var(--warning)', fontSize: '1.2rem' }} />
                        <div>
                            <div style={{ fontWeight: 700, color: 'var(--color-text-main)', fontSize: '0.9rem' }}>
                                {expired ? 'Trial Expired' : 'Free Trial Active'}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                                {expired
                                    ? 'Upgrade to continue using KuraLive'
                                    : `${daysLeft} days remaining in your free trial`}
                            </div>
                        </div>
                    </div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowUpgradeModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem' }}
                    >
                        <FaCreditCard /> {expired ? 'Upgrade Now' : 'Upgrade Plan'}
                    </button>
                </div>
            )}

            {/* ── Stat cards ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                <StatCard
                    title="Active Elections"
                    value={activeElections.toString()}
                    sub={activeElections === 1 ? electionDetails?.details?.name : 'None configured'}
                    icon={<FaVoteYea />}
                    gradient="linear-gradient(135deg, #008080, #00565B)"
                />
                <StatCard
                    title="Polling Stations"
                    value={totalStations.toString()}
                    sub={`${activeAgents} active agent${activeAgents !== 1 ? 's' : ''}`}
                    icon={<FaMapMarkedAlt />}
                    gradient="linear-gradient(135deg, #F57C00, #BF360C)"
                />
                <StatCard
                    title="Station Reports"
                    value={`${submittedStations} / ${totalStations}`}
                    sub={`${reportingPct}% reporting complete`}
                    icon={<FaCheckCircle />}
                    iconBg="rgba(0,200,83,0.12)"
                />
                <StatCard
                    title="Pending Stations"
                    value={pendingStations.toString()}
                    sub={pendingStations === 0 ? 'All stations reported!' : 'awaiting submission'}
                    icon={<FaExclamationTriangle />}
                    iconBg="rgba(255,152,0,0.12)"
                />
            </div>

            {/* ── Reporting progress bar ── */}
            {totalStations > 0 && (
                <div style={{
                    marginBottom: '1.75rem', padding: '1rem 1.35rem',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)', borderRadius: '12px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>Overall Reporting Progress</div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--teal)' }}>{reportingPct}%</div>
                    </div>
                    <div style={{ height: 10, borderRadius: 5, background: 'var(--gray-200)', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 5,
                            background: `linear-gradient(90deg, var(--teal), #00BCD4)`,
                            width: `${reportingPct}%`, transition: 'width 0.6s ease',
                        }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        {submittedStations} of {totalStations} stations have submitted results
                    </div>
                </div>
            )}

            {/* ── Lower grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>

                {/* Recent Activity */}
                <Card>
                    <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 700 }}>Recent Submissions</h3>
                    {recentActivity.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.87rem' }}>No submissions yet.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {recentActivity.map((item, idx) => (
                                <li key={idx} style={{
                                    padding: '0.65rem 0',
                                    borderBottom: idx < recentActivity.length - 1 ? '1px solid var(--color-border)' : 'none',
                                    fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between',
                                    flexWrap: 'wrap', gap: '0.4rem',
                                }}>
                                    <div>
                                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                                        <span style={{ color: 'var(--color-text-muted)' }}> via {item.agent}</span>
                                    </div>
                                    <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                        {item.time ? new Date(item.time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }) : '—'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                {/* Quick Actions */}
                <Card>
                    <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 700 }}>Quick Actions</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <button className="btn btn-primary" style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.88rem' }} onClick={() => navigate('/manager/elections')}>
                            <FaPlus style={{ marginRight: '0.5rem' }} /> New Election Setup
                        </button>
                        <button className="btn btn-outline" style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.88rem' }} onClick={() => navigate('/manager/agents')}>
                            <FaUserFriends style={{ marginRight: '0.5rem' }} /> Manage Agents
                        </button>
                        <button className="btn btn-outline" style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.88rem' }} onClick={() => navigate('/manager/results')}>
                            <FaEye style={{ marginRight: '0.5rem' }} /> View Live Results
                        </button>
                        <button className="btn btn-outline" style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.88rem' }} onClick={() => navigate('/manager/stations')}>
                            <FaMapMarkedAlt style={{ marginRight: '0.5rem' }} /> Polling Stations
                        </button>
                        {!trial && !expired && (
                            <button className="btn btn-outline" style={{ justifyContent: 'flex-start', width: '100%', fontSize: '0.88rem' }} onClick={() => setShowUpgradeModal(true)}>
                                <FaCreditCard style={{ marginRight: '0.5rem' }} /> Manage Subscription
                            </button>
                        )}
                    </div>
                </Card>

                {/* Current Plan */}
                <Card>
                    <h3 style={{ marginBottom: '1rem', fontSize: '0.95rem', fontWeight: 700 }}>Current Plan</h3>
                    <div style={{
                        padding: '0.9rem 1rem',
                        background: 'rgba(0,128,128,0.04)',
                        borderRadius: '10px', border: '1px solid rgba(0,128,128,0.15)',
                        marginBottom: '0.75rem',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--color-text-main)' }}>
                                {currentPlanDetails?.name || 'Free Trial'}
                            </div>
                            <div style={{
                                padding: '2px 9px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700,
                                background: trial ? 'rgba(255,193,7,0.15)' : expired ? 'rgba(255,68,68,0.12)' : 'rgba(0,200,83,0.12)',
                                color: trial ? 'var(--warning)' : expired ? 'var(--danger)' : 'var(--success)',
                            }}>
                                {trial ? 'Trial' : expired ? 'Expired' : 'Active'}
                            </div>
                        </div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--teal)' }}>
                            {currentPlanDetails?.price === 0 ? 'Free' : `KSh ${currentPlanDetails?.price?.toLocaleString()}`}
                            <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 400 }}> /year</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>
                            {currentPlanDetails?.maxAgents === Infinity ? 'Unlimited' : currentPlanDetails?.maxAgents} agents
                        </span>
                        <span style={{ opacity: 0.4 }}>·</span>
                        <span>
                            {currentPlanDetails?.maxStations === Infinity ? 'Unlimited' : currentPlanDetails?.maxStations} stations
                        </span>
                    </div>
                    {(trial && !expired) && (
                        <button
                            onClick={() => setShowUpgradeModal(true)}
                            style={{
                                marginTop: '0.9rem', width: '100%',
                                padding: '0.55rem', borderRadius: '8px',
                                background: 'linear-gradient(135deg, var(--teal), #004D4D)',
                                color: 'white', border: 'none', cursor: 'pointer',
                                fontWeight: 700, fontSize: '0.85rem', transition: 'opacity 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                        >
                            <FaChartBar style={{ marginRight: '0.4rem' }} /> Upgrade to Pro
                        </button>
                    )}
                </Card>
            </div>

            {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default ManagerDashboardHome;
