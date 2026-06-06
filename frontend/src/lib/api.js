const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const config = {
        ...options,
        headers,
        credentials: 'include',
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
        } catch (e) { }
        throw new Error(errorMsg);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }
    return response.text();
}

export const api = {
    login: (email, password, adminSecret) =>
        request('/auth/login', { method: 'POST', body: { email, password, admin_secret: adminSecret } }),

    signup: (email, password, role, name) =>
        request('/auth/signup', { method: 'POST', body: { email, password, role, name } }),

    logout: () =>
        request('/auth/logout', { method: 'POST' }),

    logoutAll: () =>
        request('/auth/logout-all', { method: 'POST' }),

    getMe: () =>
        request('/auth/me'),

    forgotPassword: (email) =>
        request('/auth/forgot-password', { method: 'POST', body: { email } }),

    resetPassword: (token, password) =>
        request('/auth/reset-password', { method: 'POST', body: { token, password } }),

    resetWithToken: (token, password) =>
        request('/auth/reset-password', { method: 'POST', body: { token, password } }),

    changePassword: (currentPassword, newPassword) =>
        request('/auth/change-password', { method: 'POST', body: { current_password: currentPassword, new_password: newPassword } }),

    getProfile: () =>
        request('/profile'),

    getElection: (managerId) => {
        const params = managerId ? `?manager_id=${managerId}` : '';
        return request(`/elections${params}`);
    },

    saveElection: (details, managerId) =>
        request('/elections', { method: 'POST', body: { details, manager_id: managerId } }),

    getStations: (managerId, limit = 1000, offset = 0) => {
        const params = new URLSearchParams({ limit, offset });
        if (managerId) params.append('manager_id', managerId);
        return request(`/stations?${params.toString()}`);
    },

    addStation: (station, managerId) =>
        request('/stations', { method: 'POST', body: { ...station, manager_id: managerId } }),

    deleteStation: (id) =>
        request(`/stations/${id}`, { method: 'DELETE' }),

    getAgents: (managerId, limit = 1000, offset = 0) => {
        const params = new URLSearchParams({ limit, offset });
        if (managerId) params.append('manager_id', managerId);
        return request(`/agents?${params.toString()}`);
    },

    addAgent: (agent, managerId) =>
        request('/agents', { method: 'POST', body: { ...agent, manager_id: managerId } }),

    updateAgent: (id, updates) =>
        request(`/agents/${id}`, { method: 'PUT', body: updates }),

    deleteAgent: (id) =>
        request(`/agents/${id}`, { method: 'DELETE' }),

    getResults: (managerId, limit = 1000, offset = 0) => {
        const params = new URLSearchParams({ limit, offset });
        if (managerId) params.append('manager_id', managerId);
        return request(`/results?${params.toString()}`);
    },

    submitResult: (result, managerId) =>
        request('/results', { method: 'POST', body: { ...result, manager_id: managerId } }),

    uploadProof: async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            headers: {},
            body: formData,
            credentials: 'include',
        });

        if (!response.ok) throw new Error('Upload failed');
        const data = await response.json();
        return data.url;
    },

    getSubscription: () =>
        request('/subscriptions'),

    upgradePlan: (planId, phoneNumber) =>
        request('/subscriptions/upgrade', { method: 'POST', body: { plan: planId, phoneNumber } }),

    activatePlan: () =>
        request('/subscriptions/activate', { method: 'POST' }),

    getPaymentHistory: () =>
        request('/payment-history'),

    initiateSTKPush: (payload) =>
        request('/daraja/stk-push', { method: 'POST', body: payload }),

    checkSTKStatus: (checkoutRequestID) =>
        request('/daraja/stk-status', { method: 'POST', body: { checkoutRequestID } }),

    sendAgentEmail: (payload) =>
        request('/daraja/send-email', { method: 'POST', body: payload }),

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
        request('/health'),

    getManagers: () =>
        request('/managers'),
};

export function setToken(token) { }

export function getTokenValue() {
    return null;
}

export default api;
