import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    company_name: '',
    plan: 'starter',
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/register/', formData);
      // Registration successful, push to login
      navigate('/login', { state: { message: 'Company registered successfully! Please log in.' } });
    } catch (err) {
      if (err.response && err.response.data) {
        if (typeof err.response.data === 'string') {
          setError(err.response.data);
        } else if (err.response.data.detail) {
          setError(err.response.data.detail);
        } else {
          const errMessages = Object.values(err.response.data).flat();
          setError(errMessages[0] || 'Registration failed.');
        }
      } else {
        setError('A network error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-panel auth-card">
        <h1>Create your Workspace</h1>
        <p>Start your company's isolated SaaS environment instantly.</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Company Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Acme Corp"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({...formData, company_name: e.target.value})}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Subscription Plan</label>
            <select
              className="form-input form-select"
              value={formData.plan}
              onChange={(e) => setFormData({...formData, plan: e.target.value})}
            >
              <option value="starter">Starter (5 Users, 50GB)</option>
              <option value="growth">Growth (20 Users, 500GB)</option>
              <option value="enterprise">Enterprise (100 Users, 2TB)</option>
            </select>
          </div>

          <hr style={{ borderColor: 'var(--border-light)', margin: '1.5rem 0' }} />

          <div className="input-group">
            <label className="input-label">Admin Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="admin"
              required
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Admin Email</label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@company.com"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              required
              minLength="6"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <span className="loader"></span> : 'Launch Workspace'}
          </button>
        </form>

        <p style={{ marginTop: '1.5rem', textAlign: 'center', marginBottom: 0 }}>
          Already registered? <Link to="/login" className="text-link">Log in here</Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
