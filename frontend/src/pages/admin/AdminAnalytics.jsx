import { useState, useEffect } from 'react';
import { FaChartBar, FaChartLine, FaWallet, FaCrown, FaUsers, FaArrowUp, FaMoneyBillWave } from 'react-icons/fa';
import api from '../../lib/api';

const AdminAnalytics = () => {
    const [analytics, setAnalytics] = useState({
        subscriptions: [],
        payments: [],
        managers: []
    });
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('all');

    useEffect(() => {
        fetchAnalytics();
    }, [timeRange]);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const data = await api.getAdminAnalytics();
            let filteredPayments = data.payments || [];
            if (timeRange !== 'all') {
                const now = new Date();
                const cutoff = new Date();
                if (timeRange === '7d') cutoff.setDate(now.getDate() - 7);
                else if (timeRange === '30d') cutoff.setDate(now.getDate() - 30);
                else if (timeRange === '90d') cutoff.setDate(now.getDate() - 90);
                filteredPayments = filteredPayments.filter(p => new Date(p.created_at) >= cutoff);
            }

            setAnalytics({
                subscriptions: data.subscriptions || [],
                payments: filteredPayments,
                managers: data.managers || []
            });
        } catch (err) {
            console.error('Error fetching subscription analytics:', err);
        }
        setLoading(false);
    };

    const getPlanBreakdown = () => {
        return {
            free: analytics.subscriptions.filter(s => s.plan === 'free').length,
            medium: analytics.subscriptions.filter(s => s.plan === 'medium').length,
            enterprise: analytics.subscriptions.filter(s => s.plan === 'enterprise').length,
            total: analytics.subscriptions.length
        };
    };

    const getRevenueMetrics = () => {
        const paidPayments = analytics.payments.filter(p => p.status === 'Paid');
        const totalRevenue = paidPayments.reduce((acc, curr) => acc + Number(curr.amount), 0);
        return { totalRevenue, transactions: paidPayments.length };
    };

    const getRecentPayments = () => {
        return analytics.payments.slice(0, 10).map(p => {
            const manager = analytics.managers.find(m => m.id === p.manager_id);
            return {
                ...p,
                manager_name: manager ? manager.name : 'Unknown Client',
                manager_email: manager ? manager.email : ''
            };
        });
    };

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: 'var(--space-12)', color: 'var(--color-text-muted)' }}>
                <div style={{ width: '40px', height: '40px', margin: '0 auto var(--space-4)', border: '3px solid rgba(0, 230, 230, 0.1)', borderTopColor: 'var(--turquoise-bright)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Loading subscription analytics...
            </div>
        );
    }

    const plans = getPlanBreakdown();
    const revenue = getRevenueMetrics();
    const recentPayments = getRecentPayments();

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Subscription & Billing Analytics</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 'var(--space-1) 0 0' }}>
                        Monitor SaaS performance, active plans, and revenue
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {['7d', '30d', '90d', 'all'].map(range => (
                        <button key={range} onClick={() => setTimeRange(range)} style={{
                            padding: 'var(--space-2) var(--space-3)',
                            backgroundColor: timeRange === range ? 'var(--turquoise-bright)' : 'var(--color-surface)',
                            border: `1px solid ${timeRange === range ? 'var(--turquoise-bright)' : 'var(--color-border)'}`,
                            borderRadius: 'var(--radius-md)',
                            color: timeRange === range ? '#000' : 'var(--color-text-main)',
                            fontSize: '0.75rem', fontFamily: 'inherit', cursor: 'pointer',
                            textTransform: 'uppercase', fontWeight: timeRange === range ? '600' : '400',
                            transition: 'all 0.2s ease'
                        }}>
                            {range === 'all' ? 'All Time' : `Last ${range}`}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-6)', marginBottom: 'var(--space-8)' }}>
                <SummaryCard title="Total Revenue (KSh)" value={revenue.totalRevenue.toLocaleString()} icon={<FaWallet />} color="var(--turquoise-bright)" />
                <SummaryCard title="Active Plans (Paid)" value={`${plans.medium + plans.enterprise}`} icon={<FaCrown />} color="var(--teal)" />
                <SummaryCard title="Free Trials" value={`${plans.free}`} icon={<FaUsers />} color="var(--aqua)" />
                <SummaryCard title="Transactions" value={`${revenue.transactions}`} icon={<FaMoneyBillWave />} color="var(--success)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <FaChartBar /> Subscription Plan Breakdown
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                        <StatusBox label="Enterprise" value={plans.enterprise} color="var(--teal)" icon={<FaCrown />} />
                        <StatusBox label="Standard" value={plans.medium} color="#3182ce" icon={<FaArrowUp />} />
                        <StatusBox label="Free Trial" value={plans.free} color="#718096" icon={<FaUsers />} />
                    </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <FaChartLine /> Recent Transactions
                    </h3>
                    {recentPayments.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No recent transactions.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {recentPayments.map(payment => (
                                <div key={payment.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                                    <div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{payment.manager_name}</div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                                            {payment.plan} Plan &bull; {new Date(payment.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: payment.status === 'Paid' ? 'var(--success)' : 'var(--warning)' }}>
                                            KSh {Number(payment.amount).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{payment.status}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

const SummaryCard = ({ title, value, icon, color }) => (
    <div className="card" style={{ display: 'flex', alignItems: 'center', padding: 'var(--space-5)', boxShadow: `0 0 20px ${color}10` }}>
        <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-md)', backgroundColor: `${color}15`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', marginRight: 'var(--space-4)', boxShadow: `0 0 12px ${color}20` }}>
            {icon}
        </div>
        <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', lineHeight: 1, color: 'var(--color-text-main)' }}>{value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>{title}</div>
        </div>
    </div>
);

const StatusBox = ({ label, value, color, icon }) => (
    <div style={{ textAlign: 'center', padding: 'var(--space-3)', backgroundColor: `${color}08`, borderRadius: 'var(--radius-md)', border: `1px solid ${color}20` }}>
        <div style={{ color, fontSize: '1.25rem', marginBottom: 'var(--space-1)' }}>{icon}</div>
        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-text-main)' }}>{value}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
);

export default AdminAnalytics;
