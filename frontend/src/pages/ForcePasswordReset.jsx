import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FaLock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

const ForcePasswordReset = () => {
    const { currentUser } = useAuth();
    const { darkMode } = useTheme();
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleReset = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            await api.resetPassword(password);
            setSuccess('Password updated successfully! Redirecting...');
            setTimeout(() => {
                navigate('/agent');
            }, 1500);
        } catch (err) {
            console.error('Password reset failed', err);
            setError(err.message || 'Failed to update password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser || !currentUser.force_password_reset) {
        setTimeout(() => navigate('/'), 0);
        return null;
    }

    return (
        <div style={{
            display: 'flex', minHeight: '100vh',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--color-bg)', padding: 'var(--space-4)'
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '450px', padding: 'var(--space-8) var(--space-6)', textAlign: 'center' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: 'rgba(214,158,46,0.1)', color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', margin: '0 auto var(--space-4)' }}>
                    <FaLock />
                </div>

                <h2 style={{ marginBottom: 'var(--space-2)' }}>Action Required</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)', fontSize: '0.9rem' }}>
                    Welcome to KuraLive! For your security, you must set an initial, secure password before accessing your workspace.
                </p>

                {error && (
                    <div style={{ backgroundColor: 'rgba(229,62,62,0.1)', color: 'var(--danger)', padding: '10px', borderRadius: '4px', marginBottom: 'var(--space-4)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <FaExclamationTriangle /> {error}
                    </div>
                )}

                {success && (
                    <div style={{ backgroundColor: 'rgba(56,161,105,0.1)', color: 'var(--success)', padding: '10px', borderRadius: '4px', marginBottom: 'var(--space-4)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <FaCheckCircle /> {success}
                    </div>
                )}

                <form onSubmit={handleReset} style={{ textAlign: 'left' }}>
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-main)' }}>New Password</label>
                        <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 8 characters" required />
                    </div>
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '500', marginBottom: '8px', color: 'var(--color-text-main)' }}>Confirm Password</label>
                        <input type="password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter your password" required />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: 'var(--space-3)' }} disabled={loading || success}>
                        {loading ? 'Updating...' : 'Set Password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ForcePasswordReset;
