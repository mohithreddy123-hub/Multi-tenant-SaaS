import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Show success message if redirected from Signup
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMsg(location.state.message);
      window.history.replaceState({}, document.title); // Clear state
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg('');

    try {
      const { data } = await api.post('/auth/login/', formData);
      // login(accessToken, refreshToken, userData)
      login(data.access, data.refresh, data.user);
      navigate('/dashboard');
    } catch (err) {
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          setError(err.response.data);
        } else if (err.response.data.detail) {
          setError(err.response.data.detail);
        } else {
          const errMessages = Object.values(err.response.data).flat();
          setError(errMessages[0] || 'Invalid credentials.');
        }
      } else {
        setError('Unable to connect to the server.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <h1>Welcome Back</h1>
        <p>Log in to access your company's secure workspace.</p>

        {successMsg && (
          <div className="error-message" style={{ background: 'rgba(16, 185, 129, 0.1)', borderLeftColor: 'var(--accent-success)', color: 'var(--accent-success)' }}>
            {successMsg}
          </div>
        )}
        
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter your username"
              required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="loader"></span> : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', marginBottom: 0 }}>
          Company not registered? <Link to="/register" className="text-link">Create a tenant</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
