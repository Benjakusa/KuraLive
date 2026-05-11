import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { FaChartPie, FaVoteYea, FaMapMarkedAlt, FaUserFriends, FaSignOutAlt, FaChartBar, FaExclamationTriangle, FaBars, FaTimes, FaFileInvoiceDollar } from 'react-icons/fa';
import UpgradeModal from '../components/UpgradeModal';

const ManagerLayout = () => {
    const { logout } = useAuth();
    const subscriptionData = useSubscription();
    const { isTrial, isExpired, getDaysLeft, subscription } = subscriptionData || {};
    const location = useLocation();
    const navigate = useNavigate();
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        // Close sidebar on navigation (mobile)
        setSidebarOpen(false);
    }, [location]);

    if (!subscriptionData) {
        return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>Loading subscription...</div>;
    }

    const expired = isExpired ? isExpired() : false;
    const daysLeft = getDaysLeft ? getDaysLeft() : 0;
    const trialActive = isTrial && isTrial() && !expired;

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = [
        { path: '/manager', label: 'Overview', icon: <FaChartPie /> },
        { path: '/manager/elections', label: 'Elections', icon: <FaVoteYea /> },
        { path: '/manager/stations', label: 'Polling Stations', icon: <FaMapMarkedAlt /> },
        { path: '/manager/agents', label: 'Agents', icon: <FaUserFriends /> },
        { path: '/manager/results', label: 'Results', icon: <FaChartBar /> },
        { path: '/manager/billing', label: 'Billing & Plan', icon: <FaFileInvoiceDollar /> },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
            {/* Upgrade Modal */}
            {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

            {/* Expired Full-Screen Gate */}
            {expired && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9998,
                    background: 'rgba(0,0,0,0.85)',
                    backdropFilter: 'blur(6px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                }}>
                    <div style={{
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '1.25rem',
                        padding: '2.5rem 2rem',
                        maxWidth: '440px', width: '100%',
                        textAlign: 'center',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
                    }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⏰</div>
                        <h2 style={{ fontSize: '1.4rem', margin: '0 0 0.5rem', color: 'var(--color-text-main)' }}>
                            Free Trial Expired
                        </h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 1.75rem', lineHeight: 1.6 }}>
                            Your 14-day free trial has ended. Upgrade to a paid plan to continue managing your elections.
                        </p>
                        <button
                            onClick={() => setShowUpgrade(true)}
                            style={{
                                width: '100%', padding: '0.875rem',
                                background: 'linear-gradient(135deg, var(--teal), #004D4D)',
                                color: 'white', border: 'none', borderRadius: '0.75rem',
                                fontWeight: '700', fontSize: '1rem', fontFamily: 'inherit',
                                cursor: 'pointer', marginBottom: '0.75rem',
                            }}
                        >
                            Upgrade Plan
                        </button>
                        <button onClick={handleLogout} style={{
                            background: 'none', border: 'none', color: 'var(--color-text-muted)',
                            fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                            Sign out
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Header */}
            {isMobile && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                    backgroundColor: 'var(--teal)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        style={{
                            background: 'none', border: 'none', color: 'white',
                            fontSize: '1.5rem', cursor: 'pointer', padding: '4px',
                        }}
                    >
                        {sidebarOpen ? <FaTimes /> : <FaBars />}
                    </button>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>KuraLive</h2>
                    <div style={{ width: '24px' }} /> {/* Spacer */}
                </div>
            )}

            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', inset: 0, zIndex: 999,
                        background: 'rgba(0,0,0,0.5)',
                    }}
                />
            )}

            {/* Sidebar */}
            <aside style={{
                width: isMobile ? '280px' : '250px',
                backgroundColor: 'var(--teal)', color: 'white',
                display: 'flex', flexDirection: 'column',
                position: isMobile ? 'fixed' : 'fixed',
                height: '100vh',
                left: isMobile && !sidebarOpen ? '-280px' : 0,
                top: isMobile ? 0 : 0,
                zIndex: isMobile ? 1000 : 'auto',
                transition: 'left 0.3s ease',
                overflowY: 'auto',
                paddingTop: isMobile ? '56px' : 0,
            }}>
                {!isMobile && (
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800' }}>KuraLive</h2>
                        <span style={{ fontSize: '0.72rem', opacity: 0.75 }}>Manager Portal</span>
                    </div>
                )}

                {isMobile && (
                    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>KuraLive</h2>
                        <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>Manager Portal</span>
                    </div>
                )}

                <nav style={{ flex: 1, padding: '1rem' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path ||
                                (item.path !== '/manager' && location.pathname.startsWith(item.path));
                            return (
                                <li key={item.path} style={{ marginBottom: '2px' }}>
                                    <Link to={item.path} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.7rem 1rem', borderRadius: '0.625rem',
                                        color: isActive ? '#fff' : 'rgba(255,255,255,0.8)',
                                        backgroundColor: isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                                        fontWeight: isActive ? '600' : '400',
                                        textDecoration: 'none', transition: 'all 0.2s',
                                        fontSize: isMobile ? '1rem' : 'inherit',
                                    }}>
                                        <span style={{ fontSize: isMobile ? '1.1rem' : 'inherit' }}>{item.icon}</span>
                                        {item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* Trial Status Banner */}
                {subscription && !expired && (
                    <div style={{
                        margin: '0 0.75rem 0.75rem',
                        padding: '0.875rem 1rem',
                        borderRadius: '0.75rem',
                        background: daysLeft <= 3 ? 'rgba(229,62,62,0.2)' : 'rgba(255,255,255,0.1)',
                        border: `1px solid ${daysLeft <= 3 ? 'rgba(229,62,62,0.4)' : 'rgba(255,255,255,0.15)'}`,
                    }}>
                        {subscription.status === 'active' ? (
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
                                ✅ Active — {subscription.plan === 'medium' ? 'Standard' : 'Enterprise'} plan
                            </div>
                        ) : (
                            <>
                                <div style={{ fontSize: '0.72rem', color: daysLeft <= 3 ? '#feb2b2' : 'rgba(255,255,255,0.7)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {daysLeft <= 3 && <FaExclamationTriangle style={{ fontSize: '0.65rem' }} />}
                                    Free trial · {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                                </div>
                                <button onClick={() => setShowUpgrade(true)} style={{
                                    width: '100%', padding: '6px',
                                    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                                    borderRadius: '0.4rem', color: 'white', fontSize: '0.75rem',
                                    fontFamily: 'inherit', cursor: 'pointer', fontWeight: '600',
                                    transition: 'all 0.2s',
                                }}>
                                    Upgrade Plan
                                </button>
                            </>
                        )}
                    </div>
                )}

                <div style={{ padding: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                        padding: '0.7rem 1rem', borderRadius: '0.625rem',
                        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.75)',
                        cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit', transition: 'all 0.2s',
                    }}>
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main style={{
                marginLeft: isMobile ? 0 : '250px',
                flex: 1,
                padding: isMobile ? 'calc(56px + 1rem) 1rem 1rem' : '1.5rem',
                width: isMobile ? '100%' : 'auto',
                overflowX: 'hidden',
            }}>
                {/* Top trial warning bar */}
                {trialActive && daysLeft <= 5 && (
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '0.75rem 1.25rem', borderRadius: '0.625rem', marginBottom: '1.25rem',
                        background: daysLeft <= 2 ? 'rgba(229,62,62,0.08)' : 'rgba(214,158,46,0.08)',
                        border: `1px solid ${daysLeft <= 2 ? 'rgba(229,62,62,0.25)' : 'rgba(214,158,46,0.25)'}`,
                        color: daysLeft <= 2 ? '#e53e3e' : '#d69e2e',
                        fontSize: '0.85rem',
                        flexWrap: 'wrap',
                        gap: '0.5rem',
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FaExclamationTriangle style={{ fontSize: '0.8rem' }} />
                            Your free trial expires in <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''}</strong>.
                        </span>
                        <button onClick={() => setShowUpgrade(true)} style={{
                            padding: '4px 14px', borderRadius: '0.4rem', fontSize: '0.8rem',
                            fontFamily: 'inherit', fontWeight: '600', cursor: 'pointer', border: 'none',
                            background: daysLeft <= 2 ? 'rgba(229,62,62,0.12)' : 'rgba(214,158,46,0.12)',
                            color: daysLeft <= 2 ? '#e53e3e' : '#d69e2e',
                        }}>
                            Upgrade Now
                        </button>
                    </div>
                )}
                <Outlet />
            </main>
        </div>
    );
};

export default ManagerLayout;
