import { useState, useEffect } from 'react';
import { FaFileInvoiceDollar, FaCheckCircle, FaTimesCircle, FaClock, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import api from '../../lib/api';
import { useTheme } from '../../contexts/ThemeContext';

const AdminBilling = () => {
    const { darkMode } = useTheme();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const surface = darkMode ? 'rgba(0,26,26,0.6)' : '#ffffff';
    const border = darkMode ? 'rgba(0,230,230,0.12)' : '#e2e8f0';
    const mutedText = darkMode ? 'rgba(179,255,255,0.5)' : '#718096';

    useEffect(() => {
        const fetchBilling = async () => {
            setLoading(true);
            try {
                const data = await api.getAdminBilling();
                setPayments(data.data || []);
            } catch (err) {
                console.error("Failed to fetch billing", err);
            }
            setLoading(false);
        };
        fetchBilling();
    }, []);

    const markAsPaid = async (id) => {
        try {
            await api.markPaymentPaid(id);
            setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'Paid' } : p));
        } catch (err) {
            console.error("Failed to mark as paid", err);
        }
    };

    const totalPages = Math.max(1, Math.ceil(payments.length / itemsPerPage));
    const currentPayments = payments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: mutedText }}>Loading billing history...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0, color: darkMode ? '#fff' : '#1a202c' }}>Billing & Invoices</h2>
                    <p style={{ color: mutedText, fontSize: '0.85rem', margin: '4px 0 0' }}>Manage client payments and upgrade history.</p>
                </div>
                <div style={{ padding: '0.6rem 1rem', background: 'rgba(0, 230, 230, 0.1)', color: 'var(--turquoise-bright)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '600', fontSize: '0.85rem' }}>
                    <FaFileInvoiceDollar /> {payments.length} Records
                </div>
            </div>

            <div className="card table-responsive" style={{ padding: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${border}` }}>
                            {['Date', 'Client', 'Package', 'Amount (KSh)', 'M-Pesa Receipt', 'Status', 'Actions'].map(h => (
                                <th key={h} style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', color: mutedText }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {currentPayments.length === 0 ? (
                            <tr><td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: mutedText }}>No payment history found.</td></tr>
                        ) : currentPayments.map(payment => (
                            <tr key={payment.id} style={{ borderBottom: `1px solid ${border}` }}>
                                <td style={{ padding: '1rem', fontSize: '0.8rem', color: darkMode ? '#e2e8f0' : '#2d3748' }}>
                                    {new Date(payment.created_at).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: '600', fontSize: '0.85rem', color: darkMode ? '#fff' : '#1a202c' }}>{payment.manager_name || 'Unknown'}</div>
                                    <div style={{ fontSize: '0.75rem', color: mutedText }}>{payment.manager_email}</div>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.8rem', textTransform: 'capitalize', color: darkMode ? '#e2e8f0' : '#2d3748' }}>
                                    {payment.plan}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: '600', color: darkMode ? '#fff' : '#1a202c' }}>
                                    {Number(payment.amount).toLocaleString()}
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.8rem', color: mutedText, fontFamily: 'monospace' }}>
                                    {payment.mpesa_receipt || '---'}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        padding: '4px 10px', borderRadius: '2rem', fontSize: '0.7rem', fontWeight: '600',
                                        backgroundColor: payment.status === 'Paid' ? 'rgba(56,161,105,0.1)' : payment.status === 'Failed' ? 'rgba(229,62,62,0.1)' : 'rgba(214,158,46,0.1)',
                                        color: payment.status === 'Paid' ? '#38a169' : payment.status === 'Failed' ? '#e53e3e' : '#d69e2e',
                                    }}>
                                        {payment.status === 'Paid' ? <FaCheckCircle /> : payment.status === 'Failed' ? <FaTimesCircle /> : <FaClock />}
                                        {payment.status}
                                    </span>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    {payment.status === 'Pending' && (
                                        <button onClick={() => markAsPaid(payment.id)} style={{
                                            padding: '4px 10px', fontSize: '0.7rem', background: '#38a169', color: '#fff',
                                            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600'
                                        }}>
                                            Mark Paid
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: `1px solid ${border}` }}>
                        <div style={{ fontSize: '0.8rem', color: mutedText }}>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, payments.length)} of {payments.length}
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                style={{
                                    padding: '6px 12px', background: surface, border: `1px solid ${border}`,
                                    borderRadius: '6px', color: currentPage === 1 ? mutedText : (darkMode ? '#fff' : '#1a202c'),
                                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                <FaChevronLeft size={12} /> Prev
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                style={{
                                    padding: '6px 12px', background: surface, border: `1px solid ${border}`,
                                    borderRadius: '6px', color: currentPage === totalPages ? mutedText : (darkMode ? '#fff' : '#1a202c'),
                                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                Next <FaChevronRight size={12} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminBilling;
