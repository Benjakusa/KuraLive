import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../lib/api';
import { FaUserShield, FaUserTie, FaEnvelope, FaLock, FaUser, FaSun, FaMoon, FaHome, FaArrowLeft, FaCheckCircle } from 'react-icons/fa';

const Login = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState('agent');
    const { darkMode, toggleTheme } = useTheme();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login, signup } = useAuth();
    const navigate = useNavigate();

    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [resetStep, setResetStep] = useState('email');
    const [resetSuccess, setResetSuccess] = useState('');

    const getRedirectPath = (userRole, userObj) => {
        if (userObj?.force_password_reset) return '/reset-password';
        if (userRole === 'admin') return '/admin';
        if (userRole === 'manager') return '/manager';
        return '/agent';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');

        try {
            let user;
            if (isLogin) {
                user = await login(email, password);
            } else {
                user = await signup(email, password, role, name);
            }
            navigate(getRedirectPath(user?.role || role, user));
        } catch (err) {
            console.error(err);
            setError(err.message || 'An error occurred');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        try {
            const data = await api.forgotPassword(resetEmail);
            setResetToken(data.reset_token);
            setResetStep('password');
        } catch (err) {
            setError(err.message || 'Failed to send reset code');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetWithToken = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await api.resetWithToken(resetToken, newPassword);
            setResetSuccess('Password reset successfully! You can now log in.');
            setTimeout(() => {
                setShowForgotPassword(false);
                setResetStep('email');
                setResetEmail('');
                setResetToken('');
                setNewPassword('');
                setConfirmPassword('');
                setResetSuccess('');
            }, 2000);
        } catch (err) {
            setError(err.message || 'Failed to reset password');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-bg)',
            padding: 'var(--space-4)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '420px', padding: 'var(--space-8) var(--space-6)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                    <Link to="/" style={{ color: 'var(--color-text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                        <FaHome /> Return to Homepage
                    </Link>
                    <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                        {darkMode ? <FaSun /> : <FaMoon />}
                    </button>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-2)', background: 'linear-gradient(135deg, var(--teal) 0%, var(--aqua) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        KuraLive
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)' }}>Secure Election Management</p>
                </div>

                {!showForgotPassword && (
                    <>
                        <div style={{
                            display: 'flex',
                            backgroundColor: 'var(--color-bg)',
                            padding: '4px',
                            borderRadius: 'var(--radius-lg)',
                            marginBottom: 'var(--space-6)',
                            border: '1px solid var(--color-border)'
                        }}>
                            <button
                                type="button"
                                onClick={() => setRole('agent')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: 'none',
                                    backgroundColor: role === 'agent' ? 'var(--color-surface)' : 'transparent',
                                    color: role === 'agent' ? 'var(--teal)' : 'var(--color-text-muted)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: role === 'agent' ? 'var(--shadow-sm)' : 'none',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                <FaUserShield /> Agent
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('manager')}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    border: 'none',
                                    backgroundColor: role === 'manager' ? 'var(--color-surface)' : 'transparent',
                                    color: role === 'manager' ? 'var(--teal)' : 'var(--color-text-muted)',
                                    borderRadius: 'var(--radius-md)',
                                    boxShadow: role === 'manager' ? 'var(--shadow-sm)' : 'none',
                                    fontWeight: '600',
                                    transition: 'all 0.2s',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                }}
                            >
                                <FaUserTie /> Manager
                            </button>
                        </div>

                        {error && (
                            <div style={{
                                backgroundColor: 'var(--danger-light)', color: 'var(--danger)',
                                padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                                marginBottom: 'var(--space-6)', fontSize: '0.9rem',
                                border: '1px solid var(--danger-light)'
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            {!isLogin && (
                                <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                                    <FaUser style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="input"
                                        style={{ paddingLeft: '3rem' }}
                                        required
                                    />
                                </div>
                            )}

                            <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                                <FaEnvelope style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="email"
                                    placeholder="Email Address"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input"
                                    style={{ paddingLeft: '3rem' }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: 'var(--space-2)', position: 'relative' }}>
                                <FaLock style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input"
                                    style={{ paddingLeft: '3rem' }}
                                    required
                                />
                            </div>

                            {isLogin && (
                                <div style={{ textAlign: 'right', marginBottom: 'var(--space-6)' }}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowForgotPassword(true); setResetEmail(email); }}
                                        style={{
                                            background: 'none', border: 'none',
                                            color: 'var(--teal)', fontSize: '0.85rem',
                                            cursor: 'pointer', fontWeight: '500'
                                        }}
                                    >
                                        Forgot Password?
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                className="btn btn-primary"
                                style={{ width: '100%', padding: 'var(--space-3)', fontSize: '1rem' }}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                            </button>
                        </form>
                    </>
                )}

                {showForgotPassword && (
                    <>
                        <div style={{ marginBottom: 'var(--space-6)' }}>
                            <button
                                type="button"
                                onClick={() => { setShowForgotPassword(false); setResetStep('email'); setError(''); setResetSuccess(''); }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: 'var(--color-text-muted)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    fontSize: '0.85rem', padding: 0
                                }}
                            >
                                <FaArrowLeft /> Back to Login
                            </button>
                        </div>

                        {resetSuccess ? (
                            <div style={{
                                backgroundColor: 'rgba(56,161,105,0.1)', color: 'var(--success)',
                                padding: 'var(--space-4)', borderRadius: 'var(--radius-md)',
                                textAlign: 'center', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                            }}>
                                <FaCheckCircle /> {resetSuccess}
                            </div>
                        ) : (
                            <>
                                <h2 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>Reset Password</h2>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: 'var(--space-6)' }}>
                                    {resetStep === 'email' ? 'Enter your email to receive a reset code.' : 'Enter your new password.'}
                                </p>

                                {error && (
                                    <div style={{
                                        backgroundColor: 'var(--danger-light)', color: 'var(--danger)',
                                        padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--space-4)', fontSize: '0.85rem',
                                        border: '1px solid var(--danger-light)'
                                    }}>
                                        {error}
                                    </div>
                                )}

                                {resetStep === 'email' ? (
                                    <form onSubmit={handleForgotPassword}>
                                        <div style={{ marginBottom: 'var(--space-4)', position: 'relative' }}>
                                            <FaEnvelope style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                            <input
                                                type="email"
                                                placeholder="Email Address"
                                                value={resetEmail}
                                                onChange={(e) => setResetEmail(e.target.value)}
                                                className="input"
                                                style={{ paddingLeft: '3rem' }}
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ width: '100%', padding: 'var(--space-3)' }}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Sending...' : 'Send Reset Code'}
                                        </button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleResetWithToken}>
                                        <div style={{ marginBottom: 'var(--space-4)' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-main)' }}>New Password</label>
                                            <input
                                                type="password"
                                                className="input"
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="Minimum 8 characters"
                                                required
                                            />
                                        </div>
                                        <div style={{ marginBottom: 'var(--space-6)' }}>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-main)' }}>Confirm Password</label>
                                            <input
                                                type="password"
                                                className="input"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Re-enter your password"
                                                required
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            style={{ width: '100%', padding: 'var(--space-3)' }}
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? 'Resetting...' : 'Reset Password'}
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </>
                )}

                {!showForgotPassword && (
                    <div style={{ marginTop: 'var(--space-8)', textAlign: 'center', fontSize: '0.9rem' }}>
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            style={{
                                background: 'none', border: 'none',
                                color: 'var(--teal)', fontWeight: '600',
                                cursor: 'pointer', textDecoration: 'underline'
                            }}
                        >
                            {isLogin ? 'Register' : 'Log In'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Login;
