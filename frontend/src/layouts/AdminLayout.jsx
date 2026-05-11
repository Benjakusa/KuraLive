import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaUsers, FaChartLine, FaSignOutAlt, FaDatabase, FaCog, FaSun, FaMoon, FaBars, FaTimes, FaFileInvoiceDollar } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

const AdminLayout = () => {
    const { logout } = useAuth();
    const { darkMode, toggleTheme } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => { setSidebarOpen(false); }, [location]);

    const handleLogout = () => {
        sessionStorage.removeItem('admin_session');
        logout();
        navigate('/admin-login');
    };

    const navItems = [
        { path: '/admin', label: 'Overview', icon: <FaShieldAlt /> },
        { path: '/admin/clients', label: 'Clients', icon: <FaUsers /> },
        { path: '/admin/billing', label: 'Billing', icon: <FaFileInvoiceDollar /> },
        { path: '/admin/analytics', label: 'Analytics', icon: <FaChartLine /> },
        { path: '/admin/database', label: 'Database', icon: <FaDatabase /> },
        { path: '/admin/settings', label: 'Settings', icon: <FaCog /> },
    ];

    const sidebarBg = darkMode ? '#000' : '#ffffff';
    const sidebarBorder = darkMode ? '#004D4D' : '#e2e8f0';
    const logoTextColor = darkMode ? '#ffffff' : '#1a202c';
    const logoSubColor = darkMode ? 'rgba(179,255,255,0.4)' : '#718096';
    const navActiveColor = darkMode ? 'var(--turquoise-bright)' : 'var(--teal)';
    const navActiveBg = darkMode ? 'rgba(0,230,230,0.08)' : 'rgba(0,128,128,0.08)';
    const navInactiveColor = darkMode ? 'rgba(179,255,255,0.5)' : '#4a5568';
    const topbarBorder = darkMode ? 'rgba(0,230,230,0.1)' : '#e2e8f0';
    const mainBg = darkMode ? '#0a0f0f' : '#f7f9fb';

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: mainBg, color: 'var(--color-text-main)', fontFamily: 'var(--font-sans)' }}>
            {/* Mobile Header */}
            {isMobile && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                    backgroundColor: sidebarBg, borderBottom: `1px solid ${sidebarBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: logoTextColor, fontSize: '1.5rem', cursor: 'pointer', padding: '4px' }}>
                        {sidebarOpen ? <FaTimes /> : <FaBars />}
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--teal), #004D4D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaShieldAlt style={{ color: '#fff', fontSize: '0.8rem' }} />
                        </div>
                        <span style={{ fontSize: '1rem', fontWeight: 800, color: logoTextColor }}>KuraLive</span>
                    </div>
                    <div style={{ width: '24px' }} />
                </div>
            )}

            {/* Mobile Overlay */}
            {isMobile && sidebarOpen && (
                <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.5)' }} />
            )}

            {/* Sidebar */}
            <aside style={{
                width: isMobile ? '280px' : '260px',
                backgroundColor: sidebarBg,
                borderRight: `1px solid ${sidebarBorder}`,
                display: 'flex', flexDirection: 'column',
                position: isMobile ? 'fixed' : 'fixed',
                height: '100vh', left: isMobile && !sidebarOpen ? '-280px' : 0, top: 0,
                zIndex: isMobile ? 1000 : 'auto',
                transition: 'left 0.3s ease',
                boxShadow: isMobile ? '2px 0 12px rgba(0,0,0,0.15)' : (darkMode ? 'none' : '2px 0 12px rgba(0,0,0,0.06)'),
                overflowY: 'auto', paddingTop: isMobile ? '56px' : 0,
            }}>
                {!isMobile && (
                    <div style={{ padding: '1.5rem', borderBottom: `1px solid ${darkMode ? 'rgba(0,230,230,0.1)' : '#e2e8f0'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--teal), #004D4D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0,128,128,0.3)' }}>
                                <FaShieldAlt style={{ color: '#fff', fontSize: '1rem' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: logoTextColor, letterSpacing: '0.03em' }}>KuraLive</div>
                                <div style={{ fontSize: '0.65rem', color: logoSubColor, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Admin Console</div>
                            </div>
                        </div>
                    </div>
                )}

                {isMobile && (
                    <div style={{ padding: '1rem', borderBottom: `1px solid ${darkMode ? 'rgba(0,230,230,0.1)' : '#e2e8f0'}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--teal), #004D4D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FaShieldAlt style={{ color: '#fff', fontSize: '0.8rem' }} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: logoTextColor }}>KuraLive</div>
                                <div style={{ fontSize: '0.6rem', color: logoSubColor, textTransform: 'uppercase' }}>Admin Console</div>
                            </div>
                        </div>
                    </div>
                )}

                <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <li key={item.path}>
                                    <Link to={item.path} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                                        padding: '0.7rem 1rem', borderRadius: '0.625rem',
                                        textDecoration: 'none', transition: 'all 0.2s ease',
                                        background: isActive ? navActiveBg : 'transparent',
                                        borderLeft: isActive ? `3px solid ${navActiveColor}` : '3px solid transparent',
                                        color: isActive ? navActiveColor : navInactiveColor,
                                        fontWeight: isActive ? 600 : 400, fontSize: isMobile ? '1rem' : '0.875rem',
                                    }}>
                                        <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div style={{ padding: '1rem 0.75rem', borderTop: `1px solid ${darkMode ? 'rgba(0,230,230,0.1)' : '#e2e8f0'}`, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={toggleTheme} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        width: '100%', padding: '0.7rem 1rem', borderRadius: '0.625rem',
                        background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                        border: `1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                        color: darkMode ? 'rgba(255,255,255,0.6)' : '#4a5568',
                        cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'inherit', transition: 'all 0.2s',
                    }}>
                        {darkMode ? <FaSun style={{ color: '#f6c90e' }} /> : <FaMoon />}
                        {darkMode ? 'Light Mode' : 'Dark Mode'}
                    </button>
                    <button onClick={handleLogout} style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        width: '100%', padding: '0.7rem 1rem', borderRadius: '0.625rem',
                        background: 'transparent', border: '1px solid rgba(255,68,68,0.25)',
                        color: 'rgba(255,68,68,0.85)', cursor: 'pointer',
                        fontSize: '0.875rem', fontFamily: 'inherit', transition: 'all 0.2s',
                    }}>
                        <FaSignOutAlt /> Sign Out
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main style={{
                marginLeft: isMobile ? 0 : '260px', flex: 1,
                padding: isMobile ? 'calc(56px + 1rem) 1rem 1rem' : '2rem',
                background: mainBg, minHeight: '100vh', width: isMobile ? '100%' : 'auto',
                overflowX: 'hidden',
            }}>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    marginBottom: '2rem', paddingBottom: '1rem',
                    borderBottom: `1px solid ${topbarBorder}`,
                    flexWrap: 'wrap', gap: '0.5rem',
                }}>
                    <div>
                        <h1 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', margin: 0, color: darkMode ? '#fff' : '#1a202c' }}>Admin Dashboard</h1>
                        <p style={{ color: darkMode ? 'rgba(179,255,255,0.5)' : '#718096', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Monitor and manage all client accounts</p>
                    </div>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 0.9rem', background: darkMode ? 'rgba(0,179,179,0.08)' : 'rgba(0,128,128,0.08)',
                        borderRadius: '999px', border: `1px solid ${darkMode ? 'rgba(0,179,179,0.2)' : 'rgba(0,128,128,0.2)'}`,
                    }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#00B3B3', boxShadow: '0 0 8px rgba(0,179,179,0.6)' }} />
                        <span style={{ fontSize: '0.75rem', color: darkMode ? 'rgba(179,255,255,0.6)' : 'var(--teal)' }}>Admin Online</span>
                    </div>
                </div>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
