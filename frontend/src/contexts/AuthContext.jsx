import { createContext, useContext, useState, useEffect } from 'react';
import api, { setToken, getTokenValue } from '../lib/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuthStatus = async () => {
        const token = getTokenValue();
        if (!token) {
            setCurrentUser(null);
            setUserRole(null);
            setLoading(false);
            return;
        }

        try {
            const data = await api.getMe();
            const user = data.user;
            setCurrentUser({
                uid: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                status: user.status,
                station_id: user.station_id,
                permissions: user.permissions,
                submission_status: user.submission_status,
                manager_id: user.manager_id,
                force_password_reset: user.force_password_reset,
                createdAt: user.created_at,
            });
            setUserRole(user.role);
        } catch (error) {
            console.error('Auth check failed', error);
            setToken(null);
            setCurrentUser(null);
            setUserRole(null);
        }
        setLoading(false);
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    const signup = async (email, password, role, name) => {
        const data = await api.signup(email, password, role, name);
        setToken(data.token);
        const user = data.user;
        const userObj = {
            uid: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            station_id: null,
            permissions: 'edit',
            submission_status: 'Pending',
            manager_id: null,
            force_password_reset: false,
            createdAt: user.created_at,
        };
        setCurrentUser(userObj);
        setUserRole(user.role);
        return userObj;
    };

    const login = async (email, password) => {
        const data = await api.login(email, password);
        setToken(data.token);
        const user = data.user;
        const userObj = {
            uid: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            status: user.status,
            station_id: user.station_id,
            permissions: user.permissions,
            submission_status: user.submission_status,
            manager_id: user.manager_id,
            force_password_reset: user.force_password_reset,
            createdAt: user.created_at,
        };
        setCurrentUser(userObj);
        setUserRole(user.role);
        return userObj;
    };

    const googleLogin = async () => {
        throw new Error('Google login not available with self-hosted backend');
    };

    const facebookLogin = async () => {
        throw new Error('Facebook login not available with self-hosted backend');
    };

    const logout = async () => {
        try { await api.logout(); } catch (e) {}
        setToken(null);
        setCurrentUser(null);
        setUserRole(null);
    };

    const value = {
        currentUser,
        userRole,
        signup,
        login,
        googleLogin,
        facebookLogin,
        logout,
        loading,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
