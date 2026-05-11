import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { DataProvider } from './contexts/DataContext';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './layouts/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminClients from './pages/admin/AdminClients';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminBilling from './pages/admin/AdminBilling';
import AdminDatabase from './pages/admin/AdminDatabase';
import AdminSettings from './pages/admin/AdminSettings';
import ManagerLayout from './layouts/ManagerLayout';
import ManagerDashboardHome from './pages/manager/ManagerDashboardHome';
import ElectionSetup from './pages/manager/ElectionSetup';
import PollingStations from './pages/manager/PollingStations';
import ResultsOverview from './pages/manager/ResultsOverview';
import AgentManagement from './pages/manager/AgentManagement';
import ManagerBilling from './pages/manager/ManagerBilling';
import AgentLayout from './layouts/AgentLayout';
import AgentDashboard from './pages/AgentDashboard';
import ForcePasswordReset from './pages/ForcePasswordReset';
import NotFound from './pages/NotFound';

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

// Admin Protected Route - uses session storage + backend auth
const AdminProtectedRoute = ({ children }) => {
  const { currentUser, userRole, loading } = useAuth();
  const adminSession = sessionStorage.getItem('admin_session');

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>Loading...</div>;

  if (!adminSession || !currentUser || userRole !== 'admin') {
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
          </Router>
        </DataProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

export default App;
