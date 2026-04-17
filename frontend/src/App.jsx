import React, { useContext, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import api from './api';

import Signup    from './pages/Signup';
import Login     from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices  from './pages/Invoices';
import Documents from './pages/Documents';
import Editor    from './pages/Editor';
import Settings  from './pages/Settings';
import PaymentWall from './pages/PaymentWall';

import './index.css';

/* ════════════════════════════════════════════════════
   PROTECTED ROUTE
   — Redirects to /login if not authenticated
   — Redirects to /activate if tenant is unpaid
════════════════════════════════════════════════════ */
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  const [checking, setChecking]   = useState(true);
  const [wallData, setWallData]   = useState(null); // invoice info if unpaid

  useEffect(() => {
    // Only run the payment check for real tenant users (not superadmins)
    if (!user || !user.tenant) {
      setChecking(false);
      return;
    }

    // If already known as paid, skip the API call
    if (user.tenant.payment_status === 'paid') {
      setChecking(false);
      return;
    }

    // Hit the dashboard endpoint — if 402, the tenant is unpaid
    api.get('/dashboard/')
      .then(() => setChecking(false))
      .catch(err => {
        if (err.response?.status === 402) {
          setWallData(err.response.data.invoice);
        }
        setChecking(false);
      });
  }, [user]);

  if (loading || checking) {
    return (
      <div className="auth-container">
        <span className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Show payment wall for unpaid tenants
  if (wallData !== undefined && user.tenant && user.tenant.payment_status !== 'paid') {
    return <PaymentWall invoice={wallData} />;
  }

  return children;
};

const AppContent = () => (
  <Routes>
    <Route path="/"         element={<Login />} />
    <Route path="/login"    element={<Login />} />
    <Route path="/register" element={<Signup />} />

    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/billing"   element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
    <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
    <Route path="/settings"  element={<ProtectedRoute><Settings /></ProtectedRoute>} />

    {/* Collaborative Editor */}
    <Route path="/editor/:docId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
