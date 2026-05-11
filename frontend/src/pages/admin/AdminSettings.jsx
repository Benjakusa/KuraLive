import { useState } from 'react';
import { FaCog, FaMoon, FaSun, FaBell, FaShieldAlt, FaPalette, FaEye, FaKey, FaDownload, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';

const AdminSettings = () => {
    const { currentUser } = useAuth();
    const { darkMode, toggleTheme } = useTheme();
    const [notifications, setNotifications] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [refreshInterval, setRefreshInterval] = useState('30');
    const [showApiKey, setShowApiKey] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const [saveStatus, setSaveStatus] = useState('');

    const applyTheme = (newTheme) => {
        if ((newTheme === 'dark') !== darkMode) {
            toggleTheme();
        }
    };

    const handleSaveSettings = () => {
        setSaveStatus('saving');
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(''), 2000);
        }, 800);
    };

    const handleClearCache = () => {
        setConfirmDialog({
            title: 'Clear Local Cache',
            message: 'This will clear all locally cached data and refresh connections. You will need to reload data manually.',
            action: () => {
                localStorage.clear();
                sessionStorage.clear();
                setConfirmDialog(null);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(''), 2000);
            }
        });
    };

    const handleResetSettings = () => {
        setConfirmDialog({
            title: 'Reset Settings',
            message: 'This will reset all admin settings to their defaults. This cannot be undone.',
            action: () => {
                if (darkMode) toggleTheme();
                setNotifications(true);
                setAutoRefresh(false);
                setRefreshInterval('30');
                localStorage.removeItem('admin-theme');
                setConfirmDialog(null);
                setSaveStatus('saved');
                setTimeout(() => setSaveStatus(''), 2000);
            }
        });
    };

    const handleSignOutAll = async () => {
        setConfirmDialog({
            title: 'Sign Out All Devices',
            message: 'This will sign out the current session from all devices. You will need to log in again.',
            action: async () => {
                try {
                    const { default: api } = await import('../../lib/api');
                    await api.logout();
                } catch (e) {}
                sessionStorage.removeItem('admin_session');
                window.location.href = '/admin-login';
            }
        });
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
                <div>
                    <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Admin Settings</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', margin: 'var(--space-1) 0 0' }}>Configure your admin console preferences</p>
                </div>
                {saveStatus && (
                    <div style={{ padding: 'var(--space-2) var(--space-4)', backgroundColor: saveStatus === 'saved' ? 'rgba(0, 255, 127, 0.1)' : 'rgba(0, 230, 230, 0.1)', border: `1px solid ${saveStatus === 'saved' ? 'rgba(0, 255, 127, 0.3)' : 'rgba(0, 230, 230, 0.3)'}`, borderRadius: 'var(--radius-md)', color: saveStatus === 'saved' ? 'var(--success)' : 'var(--turquoise-bright)', fontSize: '0.8rem' }}>
                        {saveStatus === 'saved' ? 'Settings saved' : 'Saving...'}
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 'var(--space-6)' }}>
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FaPalette /> Appearance</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)' }}>Theme</label>
                            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                <button onClick={() => applyTheme('dark')} style={{
                                    flex: 1, padding: 'var(--space-3)', backgroundColor: darkMode ? 'rgba(0, 230, 230, 0.1)' : 'var(--color-surface)', border: `2px solid ${darkMode ? 'var(--turquoise-bright)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', color: darkMode ? 'var(--turquoise-bright)' : 'var(--color-text-main)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', fontSize: '0.85rem'
                                }}><FaMoon /> Dark</button>
                                <button onClick={() => applyTheme('light')} style={{
                                    flex: 1, padding: 'var(--space-3)', backgroundColor: !darkMode ? 'rgba(0, 230, 230, 0.1)' : 'var(--color-surface)', border: `2px solid ${!darkMode ? 'var(--turquoise-bright)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', color: !darkMode ? 'var(--turquoise-bright)' : 'var(--color-text-main)', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', fontSize: '0.85rem'
                                }}><FaSun /> Light</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FaBell /> Notifications</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <ToggleSetting label="Real-time Notifications" description="Get notified when new results are submitted" checked={notifications} onChange={setNotifications} />
                        <ToggleSetting label="Auto-refresh Data" description="Automatically refresh dashboard data" checked={autoRefresh} onChange={setAutoRefresh} />
                        {autoRefresh && (
                            <div style={{ paddingLeft: 'var(--space-4)' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)', display: 'block' }}>Refresh Interval (seconds)</label>
                                <select value={refreshInterval} onChange={(e) => setRefreshInterval(e.target.value)} style={{ padding: 'var(--space-2) var(--space-3)', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-main)', fontSize: '0.85rem', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
                                    <option value="10">10 seconds</option>
                                    <option value="30">30 seconds</option>
                                    <option value="60">1 minute</option>
                                    <option value="300">5 minutes</option>
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FaShieldAlt /> Security</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Logged in as</div>
                            <div style={{ fontSize: '0.9rem', fontWeight: '500' }}>{currentUser?.email || 'Unknown'}</div>
                        </div>
                        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>User ID</div>
                            <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', wordBreak: 'break-all', color: 'var(--color-text-main)' }}>
                                {showApiKey ? currentUser?.uid : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                            </div>
                            <button onClick={() => setShowApiKey(!showApiKey)} style={{ marginTop: 'var(--space-2)', background: 'none', border: 'none', color: 'var(--turquoise-bright)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-1)', padding: 0 }}>
                                <FaEye /> {showApiKey ? 'Hide' : 'Show'} ID
                            </button>
                        </div>
                        <button onClick={handleSignOutAll} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}><FaKey style={{ marginRight: 'var(--space-2)' }} /> Sign Out All Devices</button>
                    </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><FaCog /> Data Management</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        <button onClick={handleClearCache} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}><FaDownload style={{ marginRight: 'var(--space-2)' }} /> Clear Local Cache</button>
                    </div>
                </div>

                <div className="card" style={{ padding: 'var(--space-6)', border: '1px solid rgba(255, 68, 68, 0.2)', gridColumn: '1 / -1' }}>
                    <h3 style={{ fontSize: '1rem', margin: '0 0 var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--danger)' }}><FaExclamationTriangle /> Danger Zone</h3>
                    <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                        <button onClick={handleResetSettings} style={{ padding: 'var(--space-3) var(--space-4)', backgroundColor: 'rgba(255, 68, 68, 0.08)', border: '1px solid rgba(255, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', transition: 'all 0.2s ease' }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255, 68, 68, 0.15)'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255, 68, 68, 0.08)'}
                        ><FaCog /> Reset Settings</button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 'var(--space-3) 0 0' }}>These actions are irreversible. Proceed with caution.</p>
                </div>
            </div>

            <div style={{ marginTop: 'var(--space-6)', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" onClick={handleSaveSettings}>Save Settings</button>
            </div>

            {confirmDialog && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 'var(--space-4)' }} onClick={() => setConfirmDialog(null)}>
                    <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-6)' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                            <FaExclamationTriangle style={{ color: 'var(--warning)', fontSize: '1.25rem' }} />
                            <h3 style={{ fontSize: '1.125rem', margin: 0 }}>{confirmDialog.title}</h3>
                        </div>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', margin: '0 0 var(--space-6)' }}>{confirmDialog.message}</p>
                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setConfirmDialog(null)}>Cancel</button>
                            <button className="btn" style={{ flex: 1, backgroundColor: 'var(--danger)', color: 'white', border: 'none' }} onClick={confirmDialog.action}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ToggleSetting = ({ label, description, checked, onChange }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-3)', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
        <div>
            <div style={{ fontSize: '0.85rem', fontWeight: '500' }}>{label}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{description}</div>
        </div>
        <button onClick={() => onChange(!checked)} style={{ width: '44px', height: '24px', borderRadius: '12px', backgroundColor: checked ? 'var(--turquoise-bright)' : 'var(--color-border)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background-color 0.2s ease', padding: 0 }}>
            <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: '3px', left: checked ? '23px' : '3px', transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
        </button>
    </div>
);

export default AdminSettings;
