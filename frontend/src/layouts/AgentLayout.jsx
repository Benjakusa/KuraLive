import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FaSignOutAlt, FaUserShield, FaBars, FaTimes } from 'react-icons/fa';

const AgentLayout = () => {
    const { logout, currentUser } = useAuth();
    const navigate = useNavigate();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => { setMobileMenuOpen(false); }, [location]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>
            <header style={{
                backgroundColor: 'var(--teal)', color: 'var(--white)',
                padding: isMobile ? '0.75rem 1rem' : 'var(--space-4)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                boxShadow: 'var(--shadow-md)', position: 'relative',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FaUserShield style={{ color: 'var(--aqua)' }} />
                    <span style={{ fontWeight: 700, fontSize: isMobile ? '0.95rem' : 'inherit' }}>KuraLive Agent</span>
                </div>

                {isMobile ? (
                    <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ background: 'none', border: 'none', color: 'var(--white)', fontSize: '1.3rem', cursor: 'pointer' }}>
                        {mobileMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                ) : (
                    <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--white)', display: 'flex', alignItems: 'center', fontSize: '0.875rem', cursor: 'pointer' }}>
                        Logout <FaSignOutAlt style={{ marginLeft: '0.5rem' }} />
                    </button>
                )}
            </header>

            {/* Mobile Menu */}
            {isMobile && mobileMenuOpen && (
                <div style={{
                    backgroundColor: 'var(--teal)', color: 'var(--white)', padding: '1rem',
                    borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', gap: '0.5rem',
                }}>
                    <div style={{ fontSize: '0.85rem', marginBottom: '0.5rem', opacity: 0.8 }}>Logged in as: <strong>{currentUser?.email}</strong></div>
                    <button onClick={handleLogout} style={{
                        background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white', padding: '0.6rem 1rem', borderRadius: '0.5rem',
                        display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem',
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                        <FaSignOutAlt /> Logout
                    </button>
                </div>
            )}

            <main style={{ flex: 1, padding: isMobile ? '1rem' : 'var(--space-4)', overflowX: 'hidden' }}>
                {!isMobile && (
                    <p style={{ marginBottom: 'var(--space-6)', textAlign: 'center', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        Logged in as: <strong>{currentUser?.email}</strong>
                    </p>
                )}
                <Outlet />
            </main>

            <footer style={{ textAlign: 'center', padding: isMobile ? '1rem' : 'var(--space-6)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                &copy; 2026 KuraLive Secure Systems
            </footer>
        </div>
    );
};

export default AgentLayout;
