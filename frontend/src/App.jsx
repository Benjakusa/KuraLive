import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { DataProvider } from './contexts/DataContext';

// Eager load only critical entry points
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import ForcePasswordReset from './pages/ForcePasswordReset';
import VotingPage from "./pages/public/VotingPage";

// Lazy load all heavy dashboard layouts and pages
const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminClients = lazy(() => import('./pages/admin/AdminClients'));
const AdminAnalytics = lazy(() => import('./pages/admin/AdminAnalytics'));
const AdminBilling = lazy(() => import('./pages/admin/AdminBilling'));
const AdminDatabase = lazy(() => import('./pages/admin/AdminDatabase'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const ManagerLayout = lazy(() => import('./layouts/ManagerLayout'));
const ManagerDashboardHome = lazy(() => import('./pages/manager/ManagerDashboardHome'));
const ElectionSetup = lazy(() => import('./pages/manager/ElectionSetup'));
const PollingStations = lazy(() => import('./pages/manager/PollingStations'));
const ResultsOverview = lazy(() => import('./pages/manager/ResultsOverview'));
const AgentManagement = lazy(() => import('./pages/manager/AgentManagement'));
const ManagerBilling = lazy(() => import('./pages/manager/ManagerBilling'));
const AgentLayout = lazy(() => import('./layouts/AgentLayout'));
const AgentDashboard = lazy(() => import('./pages/AgentDashboard'));
const NotFound = lazy(() => import('./pages/NotFound'));

// New Manager Pages
const SMSBroadcast = lazy(() => import('./pages/manager/SMSBroadcast'));
const SocialMedia = lazy(() => import('./pages/manager/SocialMedia'));
const PollManager = lazy(() => import('./pages/manager/PollManager'));
const PollResults = lazy(() => import('./pages/manager/PollResults'));

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>Loading...</div>;

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to={userRole === 'manager' ? '/manager' : userRole === 'admin' ? '/admin' : '/agent'} replace />;
  }

  return children;
};

// Admin Protected Route - relies strictly on backend HttpOnly cookie auth
const AdminProtectedRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>Loading...</div>;

  if (!currentUser || userRole !== 'admin') {
    return <Navigate to="/admin-login" replace />;
  }

  return children;
};

const RootRedirect = () => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) return null;

  if (!currentUser) return <Navigate to="/login" replace />;
  if (userRole === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to={userRole === 'manager' ? '/manager' : '/agent'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <DataProvider>
          <Router>
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem', fontSize: '1.2rem', color: '#666' }}>Loading Interface...</div>}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/admin-login" element={<AdminLogin />} />
                <Route path="/app" element={<RootRedirect />} />

                {/* Admin Routes */}
                <Route
                  path="/admin"
                  element={
                    <AdminProtectedRoute>
                      <AdminLayout />
                    </AdminProtectedRoute>
                  }
                >
                  <Route index element={<AdminDashboard />} />
                  <Route path="clients" element={<AdminClients />} />
                  <Route path="billing" element={<AdminBilling />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="database" element={<AdminDatabase />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>

                {/* Public API - Polling Endpoint */}
                <Route path="/vote/:token" element={<VotingPage />} />

                {/* Manager Routes */}
                <Route
                  path="/manager"
                  element={
                    <ProtectedRoute allowedRoles={['manager']}>
                      <ManagerLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<ManagerDashboardHome />} />
                  <Route path="elections" element={<ElectionSetup />} />
                  <Route path="stations" element={<PollingStations />} />
                  <Route path="agents" element={<AgentManagement />} />
                  <Route path="results" element={<ResultsOverview />} />
                  <Route path="sms" element={<SMSBroadcast />} />

                  <Route path="social" element={<SocialMedia />} />
                  <Route path="polls" element={<PollManager />} />
                  <Route path="polls/:id" element={<PollResults />} />
                  <Route path="billing" element={<ManagerBilling />} />
                </Route>

                {/* Agent Routes */}
                <Route
                  path="/agent"
                  element={
                    <ProtectedRoute allowedRoles={['agent']}>
                      <AgentLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<AgentDashboard />} />
                </Route>

                {/* Common Routes */}
                <Route path="/reset-password" element={<ForcePasswordReset />} />

                {/* Catch all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </DataProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
