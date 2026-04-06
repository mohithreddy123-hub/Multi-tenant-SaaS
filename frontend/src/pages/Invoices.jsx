import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';

const Invoices = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(null); // ID of invoice being paid
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await api.get('/billing/');
            setInvoices(response.data);
        } catch (err) {
            console.error("Failed to fetch invoices", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async (invoiceId, method) => {
        setProcessing(invoiceId);
        setMessage(null);
        try {
            const response = await api.post('/billing/pay/', {
                invoice_id: invoiceId,
                payment_method: method
            });
            setMessage({ type: 'success', text: response.data.message });
            fetchInvoices(); // Refresh list
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Payment failed' });
        } finally {
            setProcessing(null);
        }
    };

    if (loading) return <div className="auth-container"><span className="loader"></span></div>;

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--brand-primary)', margin: 0 }}>Workspace</h2>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Billing & Invoices</p>
                </div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link to="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
                        📊 Dashboard
                    </Link>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(255,255,255,0.05)' }}>
                        💳 Billing
                    </button>
                    <Link to="/documents" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>
                        📄 Documents
                    </Link>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }} disabled>
                        ⚙️ Settings
                    </button>
                </nav>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <button onClick={() => { logout(); navigate('/login'); }} className="btn btn-secondary btn-block" style={{ borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
                        Log Out
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <div>
                        <h1>Billing</h1>
                        <p style={{ margin: 0 }}>Manage your subscription and pay monthly invoices.</p>
                    </div>
                </header>

                {message && (
                    <div className="error-message" style={{
                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderLeftColor: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-error)',
                        color: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-error)'
                    }}>
                        {message.text}
                    </div>
                )}

                <div className="glass-panel" style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Invoice ID</th>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Date</th>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Amount</th>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Status</th>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '1.5rem' }}>#{inv.id}</td>
                                    <td style={{ padding: '1.5rem' }}>{new Date(inv.issued_at).toLocaleDateString()}</td>
                                    <td style={{ padding: '1.5rem', fontWeight: 600 }}>${inv.amount}</td>
                                    <td style={{ padding: '1.5rem' }}>
                                        <span style={{
                                            padding: '0.2rem 0.6rem',
                                            borderRadius: '12px',
                                            fontSize: '0.8rem',
                                            background: inv.status === 'paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                            color: inv.status === 'paid' ? 'var(--accent-success)' : '#f59e0b'
                                        }}>
                                            {inv.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.5rem' }}>
                                        {inv.status === 'pending' ? (
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handlePay(inv.id, 'UPI')}
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                                                    disabled={processing === inv.id}
                                                >
                                                    UPI
                                                </button>
                                                <button
                                                    onClick={() => handlePay(inv.id, 'Card')}
                                                    className="btn btn-primary"
                                                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'var(--brand-secondary)' }}
                                                    disabled={processing === inv.id}
                                                >
                                                    Card
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                Paid via {inv.payment_method}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {invoices.length === 0 && (
                        <p style={{ padding: '2rem', textAlign: 'center' }}>No invoices found.</p>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Invoices;
