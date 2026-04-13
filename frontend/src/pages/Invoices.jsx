import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';

/* ─── High-Security Payment Modal ───────────────────────── */
const PaymentModal = ({ invoice, method, onClose, onPaymentComplete }) => {
    const [stage, setStage] = useState('INFO'); // INFO, CONNECTING, OTP, FINALIZING, SUCCESS
    const [cardData, setCardData] = useState({ number: '', expiry: '', cvv: '' });
    const [upiId, setUpiId] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState(null);
    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    // Simulated "Bank Connection"
    const startBankHandshake = () => {
        // Basic Validation
        if (method === 'Card') {
            if (cardData.number.replace(/\s/g, '').length < 16) return setError('Invalid Card Number');
            if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) return setError('Invalid Expiry (MM/YY)');
            if (cardData.cvv.length < 3) return setError('Invalid CVV');
        } else {
            if (!upiId.includes('@')) return setError('Invalid UPI ID');
        }

        setError(null);
        setStage('CONNECTING');
        setTimeout(() => setStage('OTP'), 2000);
    };

    const handleOtpChange = (index, value) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);

        // Auto focus next
        if (value && index < 5) otpRefs[index + 1].current.focus();
    };

    const verifyOtp = () => {
        const entered = otp.join('');
        if (entered === '123456') {
            setStage('FINALIZING');
            onPaymentComplete(invoice.id, method);
        } else {
            setError('Invalid OTP. Please try 123456');
        }
    };

    // If onPaymentComplete finishes in Invoices.jsx, it will eventually call our success stage via props or we can handle it here
    useEffect(() => {
        if (stage === 'FINALIZING') {
            // Success transition usually happens when the parent's API call finishes
            // But we can simulate a brief "Finalizing" state
            // In reality, the parent will update the invoice status and we close the modal
        }
    }, [stage]);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>✕</button>
                
                {stage === 'INFO' && (
                    <>
                        <div className="bank-logo">💳 🛡️ <span>Secure Gateway</span></div>
                        <h2 className="modal-title">Payment Details</h2>
                        <p className="modal-sub">Invoice #{invoice.id} • Payable: <strong>${invoice.amount}</strong></p>
                        
                        {error && <div className="error-message">{error}</div>}

                        {method === 'Card' ? (
                            <div className="otp-container" style={{ alignItems: 'stretch' }}>
                                <div className="input-group">
                                    <label className="input-label">Card Number</label>
                                    <input type="text" className="form-input" placeholder="4242 4242 4242 4242" 
                                        maxLength="19" value={cardData.number}
                                        onChange={(e) => setCardData({...cardData, number: e.target.value.replace(/\d{4}(?=.)/g, '$& ')})} />
                                </div>
                                <div className="payment-card-grid">
                                    <div className="input-group">
                                        <label className="input-label">Expiry</label>
                                        <input type="text" className="form-input" placeholder="MM/YY" maxLength="5"
                                            value={cardData.expiry} onChange={(e) => setCardData({...cardData, expiry: e.target.value})} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">CVV</label>
                                        <input type="password" className="form-input" placeholder="***" maxLength="3"
                                            value={cardData.cvv} onChange={(e) => setCardData({...cardData, cvv: e.target.value})} />
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="otp-container" style={{ alignItems: 'center' }}>
                                <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=tenantvault@bank&am=${invoice.amount}`} alt="QR" />
                                </div>
                                <div className="input-group" style={{ width: '100%' }}>
                                    <label className="input-label">Your UPI ID</label>
                                    <input type="text" className="form-input" placeholder="user@bank" 
                                        value={upiId} onChange={(e) => setUpiId(e.target.value)} />
                                </div>
                            </div>
                        )}

                        <button onClick={startBankHandshake} className="btn btn-primary btn-block" style={{ marginTop: '1rem' }}>
                            Authorize Transaction
                        </button>
                    </>
                )}

                {stage === 'CONNECTING' && (
                    <div className="processing-status">
                        <div className="pulse-loader"></div>
                        <div className="processing-text">Connecting to Bank...</div>
                        <div className="processing-sub">Establishing a secure 256-bit encrypted handshake.</div>
                    </div>
                )}

                {stage === 'OTP' && (
                    <div className="otp-container">
                        <div className="bank-logo">🏛️ 🛡️ <span>Identity Verified</span></div>
                        <h2 className="modal-title" style={{ textAlign: 'center' }}>Enter OTP</h2>
                        <p className="modal-sub" style={{ textAlign: 'center' }}>We've sent a 6-digit verification code to your registered mobile ending in *4432.</p>
                        
                        {error && <div className="error-message" style={{ width: '100%' }}>{error}</div>}

                        <div className="otp-grid">
                            {otp.map((digit, i) => (
                                <input key={i} ref={otpRefs[i]} type="text" className="otp-box" value={digit}
                                    onChange={(e) => handleOtpChange(i, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Backspace' && !digit && i > 0) otpRefs[i-1].current.focus();
                                    }} />
                            ))}
                        </div>

                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hint: Use <strong>123456</strong> for testing</p>

                        <button onClick={verifyOtp} className="btn btn-primary btn-block">
                            Verify & Pay
                        </button>
                    </div>
                )}

                {stage === 'FINALIZING' && (
                    <div className="processing-status">
                        <span className="loader" style={{ width: '60px', height: '60px', marginBottom: '1.5rem' }}></span>
                        <div className="processing-text">Finalizing Transaction...</div>
                        <div className="processing-sub">Updating your subscription and ledger.</div>
                    </div>
                )}

                <div className="security-footer">
                    <div className="security-badge">🛡️ <span>PCI-DSS</span> Verified</div>
                    <div className="security-badge">🔒 <span>SSL</span> Secure</div>
                </div>
            </div>
        </div>
    );
};

/* ─── Main Invoices Page ────────────────────────────────── */
const Invoices = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [activeMethod, setActiveMethod] = useState(null);
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

    const handlePaymentComplete = async (invoiceId, method) => {
        setMessage(null);
        try {
            const response = await api.post('/billing/pay/', {
                invoice_id: invoiceId,
                payment_method: method
            });
            // Brief success delay so the user sees the "Finalizing" state
            setTimeout(() => {
                setMessage({ type: 'success', text: response.data.message });
                setActiveInvoice(null);
                setActiveMethod(null);
                fetchInvoices();
            }, 1500);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Payment failed' });
            setActiveInvoice(null);
            setActiveMethod(null);
        }
    };

    if (loading) return <div className="auth-container"><span className="loader"></span></div>;

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--brand-primary)', margin: 0 }}>TenantVault</h2>
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
                        <h1>Billing & Subscriptions</h1>
                        <p style={{ margin: 0 }}>Review and pay your enterprise invoices securely.</p>
                    </div>
                </header>

                {message && (
                    <div className="error-message" style={{
                        background: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderLeftColor: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-error)',
                        color: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-error)'
                    }}>
                        {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
                    </div>
                )}

                <div className="glass-panel" style={{ padding: '0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Invoice ID</th>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Issued Date</th>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Amount</th>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Status</th>
                                <th style={{ padding: '1.5rem', color: 'var(--text-secondary)' }}>Payment Action</th>
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
                                                <button onClick={() => { setActiveInvoice(inv); setActiveMethod('UPI'); }}
                                                    className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                                                    Pay UPI
                                                </button>
                                                <button onClick={() => { setActiveInvoice(inv); setActiveMethod('Card'); }}
                                                    className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'var(--brand-secondary)' }}>
                                                    Pay Card
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                                Confirmed via {inv.payment_method}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {invoices.length === 0 && (
                        <p style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            No outstanding invoices found for your workspace.
                        </p>
                    )}
                </div>
            </main>

            {/* Payment Modal Overlay */}
            {activeInvoice && (
                <PaymentModal 
                    invoice={activeInvoice} 
                    method={activeMethod} 
                    onClose={() => { setActiveInvoice(null); setActiveMethod(null); }}
                    onPaymentComplete={handlePaymentComplete}
                />
            )}
        </div>
    );
};

export default Invoices;
