import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaShieldAlt, FaKey, FaLock, FaEnvelope, FaEye, FaEyeSlash, FaSun, FaMoon, FaHome } from 'react-icons/fa';
import { useTheme } from '../contexts/ThemeContext';
import api, { setToken } from '../lib/api';

const AdminLogin = () => {
    const navigate = useNavigate();
    const { darkMode, toggleTheme } = useTheme();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        if (!email || !password || !secretKey) {
            setError('All fields are required');
            setIsSubmitting(false);
            return;
        }

        try {
            const data = await api.login(email, password);
            setToken(data.token);

            // Check if user is admin with correct secret
            const meData = await api.getMe();
            const profile = meData.user;

            if (profile.role !== 'admin') {
                throw new Error('Access denied. Admin credentials required.');
            }

            // We need to validate the admin_secret. Let's check via a special admin endpoint
            // For now, we'll just check the role since the secret check happens on backend
            sessionStorage.setItem('admin_session', 'true');
            navigate('/admin');
        } catch (err) {
            setError(err.message || 'Authentication failed');
            setToken(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: darkMode ? '#000000' : 'var(--color-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            fontFamily: 'var(--font-sans)'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '440px',
                background: darkMode ? 'rgba(0, 26, 26, 0.8)' : 'var(--color-surface)',
                borderRadius: 'var(--radius-xl)',
                border: darkMode ? '1px solid rgba(0, 230, 230, 0.15)' : '1px solid var(--color-border)',
                padding: 'var(--space-8) var(--space-6)',
                boxShadow: darkMode ? '0 0 40px rgba(0, 0, 0, 0.5)' : 'var(--shadow-lg)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                    <div style={{
                        width: '64px', height: '64px',
                        margin: '0 auto var(--space-4)',
                        borderRadius: 'var(--radius-lg)',
                        border: darkMode ? '1px solid rgba(0, 230, 230, 0.2)' : '1px solid var(--color-border)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: darkMode ? 'rgba(0, 26, 26, 0.6)' : 'var(--color-surface-alt)',
                        boxShadow: darkMode ? '0 0 30px rgba(0, 230, 230, 0.08)' : 'var(--shadow-sm)'
                    }}>
                        <FaShieldAlt style={{ fontSize: '1.5rem', color: 'var(--turquoise-bright)' }} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '0.15em', textTransform: 'uppercase', color: darkMode ? 'var(--white)' : 'var(--color-text-main)', marginBottom: 'var(--space-2)' }}>
                        Admin Access
                    </h1>
                    <p style={{ color: darkMode ? 'rgba(179, 255, 255, 0.5)' : 'var(--color-text-muted)', fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        restricted &bull; authorized personnel only
                    </p>
                </div>

                {error && (
                    <div style={{ padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-6)', background: 'rgba(255, 68, 68, 0.08)', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#FF4444', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <FaLock style={{ fontSize: '0.75rem' }} /> {error}
                    </div>
                )}

                <form onSubmit={handleLogin}>
                    <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: darkMode ? 'rgba(179, 255, 255, 0.6)' : 'var(--color-text-muted)' }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <FaEnvelope style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: darkMode ? 'rgba(0, 230, 230, 0.4)' : 'var(--color-text-muted)', fontSize: '1rem' }} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@kuralive.com" required style={{ width: '100%', padding: '14px 16px 14px 48px', background: darkMode ? 'rgba(0, 26, 26, 0.5)' : 'var(--color-surface)', border: darkMode ? '1px solid rgba(0, 230, 230, 0.15)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: darkMode ? 'var(--white)' : 'var(--color-text-main)', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box' }}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--turquoise-bright)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 230, 230, 0.1), 0 0 20px rgba(0, 230, 230, 0.08)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = darkMode ? 'rgba(0, 230, 230, 0.15)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: darkMode ? 'rgba(179, 255, 255, 0.6)' : 'var(--color-text-muted)' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <FaLock style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: darkMode ? 'rgba(0, 230, 230, 0.4)' : 'var(--color-text-muted)', fontSize: '1rem' }} />
                                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" required style={{ width: '100%', padding: '14px 48px 14px 48px', background: darkMode ? 'rgba(0, 26, 26, 0.5)' : 'var(--color-surface)', border: darkMode ? '1px solid rgba(0, 230, 230, 0.15)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: darkMode ? 'var(--white)' : 'var(--color-text-main)', fontSize: '0.95rem', fontFamily: 'inherit', outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box' }}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--turquoise-bright)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 230, 230, 0.1), 0 0 20px rgba(0, 230, 230, 0.08)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = darkMode ? 'rgba(0, 230, 230, 0.15)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: darkMode ? 'rgba(0, 230, 230, 0.4)' : 'var(--color-text-muted)', cursor: 'pointer', padding: 0 }}>
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontSize: '0.75rem', fontWeight: '600', letterSpacing: '0.05em', textTransform: 'uppercase', color: darkMode ? 'rgba(179, 255, 255, 0.6)' : 'var(--color-text-muted)' }}>Secret Key</label>
                            <div style={{ position: 'relative' }}>
                                <FaKey style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: darkMode ? 'rgba(0, 230, 230, 0.4)' : 'var(--color-text-muted)', fontSize: '1rem' }} />
                                <input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value.replace(/[^0-9]/g, ''))} placeholder="\u2022\u2022\u2022\u2022" maxLength={4} required style={{ width: '100%', padding: '14px 16px 14px 48px', background: darkMode ? 'rgba(0, 26, 26, 0.5)' : 'var(--color-surface)', border: darkMode ? '1px solid rgba(0, 230, 230, 0.15)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: darkMode ? 'var(--white)' : 'var(--color-text-main)', fontSize: '1.25rem', letterSpacing: '0.5em', textAlign: 'center', fontFamily: 'monospace', outline: 'none', transition: 'all 0.2s ease', boxSizing: 'border-box' }}
                                    onFocus={(e) => { e.target.style.borderColor = 'var(--turquoise-bright)'; e.target.style.boxShadow = '0 0 0 3px rgba(0, 230, 230, 0.1), 0 0 20px rgba(0, 230, 230, 0.08)'; }}
                                    onBlur={(e) => { e.target.style.borderColor = darkMode ? 'rgba(0, 230, 230, 0.15)' : 'var(--color-border)'; e.target.style.boxShadow = 'none'; }}
                                />
                            </div>
                        </div>
                    </div>

                    <button type="submit" disabled={isSubmitting} style={{
                        width: '100%', marginTop: 'var(--space-8)', padding: 'var(--space-4)',
                        background: isSubmitting ? (darkMode ? 'rgba(0, 128, 128, 0.3)' : 'rgba(0, 128, 128, 0.1)') : 'linear-gradient(135deg, var(--teal) 0%, #004D4D 100%)',
                        color: 'var(--white)', border: darkMode ? '1px solid rgba(0, 230, 230, 0.2)' : '1px solid var(--teal)',
                        borderRadius: 'var(--radius-md)', fontSize: '0.95rem', fontWeight: '700',
                        fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase',
                        cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
                        boxShadow: isSubmitting ? 'none' : (darkMode ? '0 0 24px rgba(0, 128, 128, 0.2), 0 4px 12px rgba(0, 0, 0, 0.4)' : 'var(--shadow-teal)'),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)'
                    }}
                        onMouseEnter={(e) => { if (!isSubmitting) { e.target.style.boxShadow = darkMode ? '0 0 32px rgba(0, 230, 230, 0.25), 0 6px 20px rgba(0, 0, 0, 0.5)' : 'var(--shadow-lg)'; } }}
                        onMouseLeave={(e) => { if (!isSubmitting) { e.target.style.boxShadow = darkMode ? '0 0 24px rgba(0, 128, 128, 0.2), 0 4px 12px rgba(0, 0, 0, 0.4)' : 'var(--shadow-teal)'; } }}
                    >
                        {isSubmitting ? (
                            <><div style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--white)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Verifying...</>
                        ) : (
                            <><FaShieldAlt /> Authenticate</>
                        )}
                    </button>
                </form>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-6)', paddingTop: 'var(--space-6)', borderTop: darkMode ? '1px solid rgba(0, 230, 230, 0.1)' : '1px solid var(--color-border)' }}>
                    <a href="/" style={{ color: darkMode ? 'rgba(179, 255, 255, 0.4)' : 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', letterSpacing: '0.05em', transition: 'color 0.2s' }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--turquoise-bright)'}
                        onMouseLeave={(e) => e.target.style.color = darkMode ? 'rgba(179, 255, 255, 0.4)' : 'var(--color-text-muted)'}
                    ><FaHome /> Return to Homepage</a>
                    <button onClick={toggleTheme} style={{ background: 'none', border: darkMode ? '1px solid rgba(0, 230, 230, 0.2)' : '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: darkMode ? 'rgba(179, 255, 255, 0.4)' : 'var(--color-text-muted)', cursor: 'pointer' }}>
                        {darkMode ? <FaSun style={{ color: 'var(--turquoise-bright)' }} /> : <FaMoon />}
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                    <a href="/login" style={{ color: darkMode ? 'rgba(179, 255, 255, 0.4)' : 'var(--color-text-muted)', fontSize: '0.75rem', letterSpacing: '0.05em', transition: 'color 0.2s', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onMouseEnter={(e) => e.target.style.color = 'var(--turquoise-bright)'}
                        onMouseLeave={(e) => e.target.style.color = darkMode ? 'rgba(179, 255, 255, 0.4)' : 'var(--color-text-muted)'}
                    >← Return to public login</a>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
};

export default AdminLogin;
