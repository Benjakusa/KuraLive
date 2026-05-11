import { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaCreditCard, FaLock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../contexts/SubscriptionContext';

const ManagerBilling = () => {
    const { currentUser } = useAuth();
    const { subscription, PLANS, setShowUpgradeModal, daysLeft } = useSubscription();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            if (!currentUser) return;
            setLoading(true);
            try {
                const data = await api.getPaymentHistory();
                setPayments(data.data || []);
            } catch (err) {
                console.error("Failed to fetch billing history:", err);
            }
            setLoading(false);
        };
        fetchHistory();
    }, [currentUser]);

    const isTrial = subscription?.plan === 'free';
    const isExpired = subscription?.status === 'expired_trial' || subscription?.status === 'expired';

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Loading billing details...</div>;

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '0.5rem' }}>Billing & Subscriptions</h1>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
                Manage your subscription plan, upgrades, and view payment history.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card" style={{ padding: '1.5rem', borderLeft: isTrial ? '4px solid #718096' : '4px solid var(--teal)' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', margin: '0 0 0.5rem' }}>Current Plan</h3>
                    <div style={{ fontSize: '2rem', fontWeight: '800', margin: '0 0 1rem', textTransform: 'capitalize' }}>
                        {subscription?.plan || 'Free'}
                    </div>
                    {isTrial ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: isExpired ? 'var(--danger)' : 'var(--warning)', fontWeight: '600' }}>
                            <FaExclamationTriangle />
                            {isExpired ? 'Trial Expired' : `${daysLeft} days left in Trial`}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)', fontWeight: '600' }}>
                            <FaCheckCircle /> Active Subscription
                        </div>
                    )}
                </div>

                <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <h3 style={{ fontSize: '1rem', color: 'var(--color-text-muted)', margin: '0 0 1rem' }}>Need more features?</h3>
                    <button className="btn btn-primary" onClick={() => setShowUpgradeModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.8rem' }}>
                        <FaCreditCard /> Upgrade Plan
                    </button>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                        <FaLock style={{ fontSize: '0.65rem' }} /> Secured by M-Pesa STK Push
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)' }}>
                    <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaFileInvoiceDollar /> Payment History
                    </h2>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Plan</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Amount</th>
                                <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Receipt</th>
                                <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No billing history available.
                                    </td>
                                </tr>
                            ) : payments.map(payment => (
                                <tr key={payment.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{new Date(payment.created_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem', textTransform: 'capitalize', fontWeight: '500' }}>{payment.plan}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '600' }}>KSh {Number(payment.amount).toLocaleString()}</td>
                                    <td style={{ padding: '1rem', fontSize: '0.85rem', fontFamily: 'monospace', color: 'var(--color-text-muted)' }}>{payment.mpesa_receipt || '---'}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: payment.status === 'Paid' ? 'rgba(56,161,105,0.1)' : payment.status === 'Failed' ? 'rgba(229,62,62,0.1)' : 'rgba(214,158,46,0.1)', color: payment.status === 'Paid' ? 'var(--success)' : payment.status === 'Failed' ? 'var(--danger)' : 'var(--warning)' }}>
                                            {payment.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ManagerBilling;
