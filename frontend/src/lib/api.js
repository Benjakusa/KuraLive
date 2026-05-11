const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
    return localStorage.getItem('kuralive_token');
}

async function request(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
    };

    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (!response.ok) {
        let errorMsg = `Request failed with status ${response.status}`;
        try {
            const errData = await response.json();
            errorMsg = errData.error || errData.message || errorMsg;
        } catch (e) {}
        throw new Error(errorMsg);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return response.text();
}

export const api = {
    // Auth
    login: (email, password) =>
        request('/auth/login', { method: 'POST', body: { email, password } }),

    signup: (email, password, role, name) =>
        request('/auth/signup', { method: 'POST', body: { email, password, role, name } }),

    logout: () =>
        request('/auth/logout', { method: 'POST' }),

    getMe: () =>
        request('/auth/me'),

    forgotPassword: (email) =>
        request('/auth/forgot-password', { method: 'POST', body: { email } }),

    resetWithToken: (resetToken, password) =>
        request('/auth/reset-with-token', { method: 'POST', body: { reset_token: resetToken, password } }),

    resetPassword: (password) =>
        request('/auth/reset-password', { method: 'POST', body: { password } }),

    // Profile
    getProfile: () =>
        request('/profile'),

    // Elections
    getElection: (managerId) => {
        const params = managerId ? `?manager_id=${managerId}` : '';
        return request(`/elections${params}`);
    },

    saveElection: (details, managerId) =>
        request('/elections', { method: 'POST', body: { details, manager_id: managerId } }),

    // Stations
    getStations: (managerId, currentUser) => {
        const params = managerId ? `?manager_id=${managerId}` : '';
        return request(`/stations${params}`);
    },

    addStation: (station, managerId) =>
        request('/stations', { method: 'POST', body: { ...station, manager_id: managerId } }),

    deleteStation: (id) =>
        request(`/stations/${id}`, { method: 'DELETE' }),

    // Agents
    getAgents: (managerId, currentUser) => {
        const params = managerId ? `?manager_id=${managerId}` : '';
        return request(`/agents${params}`);
    },

    addAgent: (agent, managerId) =>
        request('/agents', { method: 'POST', body: { ...agent, manager_id: managerId } }),

    updateAgent: (id, updates) =>
        request(`/agents/${id}`, { method: 'PUT', body: updates }),

    deleteAgent: (id) =>
        request(`/agents/${id}`, { method: 'DELETE' }),

    // Results
    getResults: (managerId) => {
        const params = managerId ? `?manager_id=${managerId}` : '';
        return request(`/results${params}`);
    },

    submitResult: (result, managerId) =>
        request('/results', { method: 'POST', body: { ...result, manager_id: managerId } }),

    // Upload
    uploadProof: async (file, agentId) => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
            body: formData,
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.url;
    },

    // Subscriptions
    getSubscription: () =>
        request('/subscriptions'),

    upgradePlan: (planId, phoneNumber) =>
        request('/subscriptions/upgrade', { method: 'POST', body: { plan: planId, phoneNumber } }),

    activatePlan: () =>
        request('/subscriptions/activate', { method: 'POST' }),

    getPaymentHistory: () =>
        request('/payment-history'),

    // Daraja
    initiateSTKPush: (payload) =>
        request('/daraja/stk-push', { method: 'POST', body: payload }),

    checkSTKStatus: (checkoutRequestID) =>
        request('/daraja/stk-status', { method: 'POST', body: { checkoutRequestID } }),

    sendAgentEmail: (payload) =>
        request('/daraja/send-email', { method: 'POST', body: payload }),

    // Admin
    getAdminStats: () =>
        request('/admin/stats'),

    getAdminClients: () =>
        request('/admin/clients'),

    updateAdminClient: (id, data) =>
        request(`/admin/clients/${id}`, { method: 'PUT', body: data }),

    deleteAdminClient: (id) =>
        request(`/admin/clients/${id}`, { method: 'DELETE' }),

    toggleClientStatus: (id, status) =>
        request(`/admin/clients/${id}/status`, { method: 'PUT', body: { status } }),

    getAllProfiles: () =>
        request('/admin/all-profiles'),

    getAdminBilling: () =>
        request('/admin/billing'),

    markPaymentPaid: (id) =>
        request(`/admin/billing/${id}/mark-paid`, { method: 'POST' }),

    getAdminAnalytics: () =>
        request('/admin/analytics'),

    getTableData: (tableName) =>
        request(`/admin/table/${tableName}`),

    getTableCounts: () =>
        request('/admin/table-counts'),

    checkHealth: () =>
        request('/admin/health'),

    getManagers: () =>
        request('/managers'),
};

export function setToken(token) {
    if (token) {
        localStorage.setItem('kuralive_token', token);
    } else {
        localStorage.removeItem('kuralive_token');
    }
}

export function getTokenValue() {
    return getToken();
}

export default api;
