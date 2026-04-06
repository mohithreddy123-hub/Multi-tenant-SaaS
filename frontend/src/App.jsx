import React, { useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './contexts/AuthContext';
import Signup from './pages/Signup';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Documents from './pages/Documents';
import Editor from './pages/Editor';

import './index.css';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="auth-container"><span className="loader" style={{ width: '40px', height: '40px', borderWidth: '4px' }}></span></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppContent = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/register" element={<Signup />} />
    <Route path="/login" element={<Login />} />

    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/billing"   element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
    <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />

    {/* Collaborative Editor — :docId = 0 for scratch pad, or a real doc id */}
    <Route path="/editor/:docId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/login" replace />} />
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
