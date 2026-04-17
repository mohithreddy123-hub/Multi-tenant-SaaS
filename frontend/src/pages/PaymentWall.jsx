import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import api from '../api';

/* ═══════════════════════════════════════════════════
   PIN INPUT — 6-digit grid
════════════════════════════════════════════════════ */
const PinInput = ({ onVerify }) => {
    const [pin, setPin] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState(null);
    const refs = Array.from({ length: 6 }, () => useRef());

    const handleChange = (i, val) => {
        if (!/^\d*$/.test(val)) return;
        const next = [...pin];
        next[i] = val.slice(-1);
        setPin(next);
        if (val && i < 5) refs[i + 1].current?.focus();
    };

    const handleKeyDown = (i, e) => {
        if (e.key === 'Backspace' && !pin[i] && i > 0) refs[i - 1].current?.focus();
    };

    const handleVerify = () => {
        const entered = pin.join('');
        if (entered.length < 6) return setError('Please enter all 6 digits.');
        if (entered === '123456') {
            setError(null);
            onVerify();
        } else {
            setError('Incorrect PIN. Use 123456 for demo.');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            {error && <div className="error-message" style={{ width: '100%' }}>{error}</div>}
            <div className="otp-grid">
                {pin.map((d, i) => (
                    <input key={i} ref={refs[i]} type="password" className="otp-box"
                        value={d} onChange={e => handleChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)} />
                ))}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                🔐 Demo PIN: <strong>1 2 3 4 5 6</strong>
            </p>
            <button className="btn btn-primary btn-block" onClick={handleVerify} style={{ marginTop: '0.5rem' }}>
                ✅ Confirm & Activate Workspace
            </button>
        </div>
    );
};

/* ═══════════════════════════════════════════════════
   UPI APP SELECTOR
════════════════════════════════════════════════════ */
const UPI_APPS = [
    { id: 'phonepe', label: 'PhonePe',    icon: '💜', color: '#5f259f' },
    { id: 'gpay',    label: 'Google Pay', icon: '🔵', color: '#4285f4' },
    { id: 'paytm',   label: 'Paytm',      icon: '🔷', color: '#00B9F1' },
    { id: 'bhim',    label: 'BHIM',       icon: '🇮🇳', color: '#ff6600' },
];

const PLAN_NAMES = { starter: 'Starter', growth: 'Growth', enterprise: 'Enterprise' };

/* ═══════════════════════════════════════════════════
   PAYMENT WALL — Full Page
════════════════════════════════════════════════════ */
const PaymentWall = ({ invoice }) => {
    const { user, login, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [payMethod, setPayMethod] = useState(null);
    const [upiApp, setUpiApp] = useState(null);
    const [cardData, setCardData] = useState({ name: '', number: '', expiry: '', cvv: '' });
    const [stage, setStage] = useState('SELECT'); // SELECT | DETAILS | CONNECTING | PIN | SUCCESS
    const [error, setError] = useState(null);

    const planName = PLAN_NAMES[invoice?.plan] || 'Starter';
    const amount = invoice?.amount || '99.00';
    const invoiceId = invoice?.id;

    const formatCard = (v) => v.replace(/\D/g, '').substring(0, 16).replace(/(.{4})/g, '$1 ').trim();
    const formatExpiry = (v) => {
        const c = v.replace(/\D/g, '').substring(0, 4);
        return c.length >= 3 ? `${c.slice(0, 2)}/${c.slice(2)}` : c;
    };

    const validate = () => {
        setError(null);
        if (payMethod === 'upi') {
            if (!upiApp) return setError('Please select a UPI app.');
        } else if (payMethod === 'card') {
            if (cardData.number.replace(/\s/g, '').length < 16) return setError('Enter a valid 16-digit card number.');
            if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) return setError('Expiry must be MM/YY.');
            if (cardData.cvv.length < 3) return setError('Enter a valid CVV.');
            if (!cardData.name.trim()) return setError('Enter the name on card.');
        }
        setStage('CONNECTING');
        setTimeout(() => setStage('PIN'), 2000);
    };

    const handlePaymentConfirmed = async () => {
        setStage('CONNECTING');
        try {
            const methodLabel = payMethod === 'upi'
                ? UPI_APPS.find(a => a.id === upiApp)?.label || 'UPI'
                : 'Credit/Debit Card';

            const res = await api.post('/billing/pay/', {
                invoice_id: invoiceId,
                payment_method: methodLabel,
            });

            if (res.data.workspace_activated) {
                // Refresh the user object from backend so payment_status updates
                const meRes = await api.get('/auth/me/');
                const tokens = {
                    access: localStorage.getItem('access_token'),
                    refresh: localStorage.getItem('refresh_token'),
                };
                login(tokens.access, tokens.refresh, meRes.data);
                setStage('SUCCESS');
            }
        } catch (err) {
            setError(err.response?.data?.detail || 'Payment failed. Please try again.');
            setStage('DETAILS');
        }
    };

    if (stage === 'SUCCESS') {
        return (
            <div className="auth-container">
                <div className="glass-panel auth-card" style={{ textAlign: 'center' }}>
                    <div className="success-check">✓</div>
                    <h2 style={{ margin: '0 0 0.5rem' }}>Workspace Activated!</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                        Your <strong>{planName}</strong> plan is now active. Welcome to TenantVault.
                    </p>
                    <button className="btn btn-primary btn-block" onClick={() => navigate('/dashboard')}>
                        🚀 Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h2 style={{ color: 'var(--brand-primary)', margin: '0 0 0.25rem' }}>TenantVault</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0 }}>
                    One-time workspace activation required
                </p>
            </div>

            <div className="modal-card" style={{ maxWidth: '520px', padding: '0', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                    <div className="bank-logo">🛡️ <span>Secure Workspace Activation</span></div>
                    <p style={{ margin: '0.35rem 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        <strong style={{ color: 'var(--text-primary)' }}>{user?.username}'s</strong> workspace ·
                        Plan: <strong style={{ color: 'var(--brand-primary)' }}>{planName}</strong> ·
                        Amount: <strong style={{ color: 'var(--text-primary)' }}>₹{amount}</strong>
                    </p>
                </div>

                <div style={{ display: 'flex', minHeight: '380px' }}>

                    {/* LEFT: Method Selector */}
                    <div style={{ width: '180px', flexShrink: 0, borderRight: '1px solid var(--border-light)', padding: '0.5rem 0' }}>
                        {[
                            { id: 'upi',  icon: '📱', label: 'UPI',       sub: 'PhonePe, GPay, Paytm' },
                            { id: 'card', icon: '💳', label: 'Card',      sub: 'Credit / Debit' },
                        ].map(m => (
                            <button key={m.id}
                                onClick={() => { setPayMethod(m.id); setStage('DETAILS'); setError(null); }}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                                    width: '100%', padding: '0.85rem 1rem', border: 'none', cursor: 'pointer',
                                    background: payMethod === m.id ? 'rgba(99,102,241,0.12)' : 'transparent',
                                    borderLeft: payMethod === m.id ? '3px solid var(--brand-primary)' : '3px solid transparent',
                                    textAlign: 'left', transition: 'all 0.15s',
                                }}>
                                <span style={{ fontSize: '1.1rem', marginTop: '2px' }}>{m.icon}</span>
                                <div>
                                    <p style={{ margin: 0, fontWeight: payMethod === m.id ? 600 : 400, fontSize: '0.88rem', color: 'var(--text-primary)' }}>{m.label}</p>
                                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{m.sub}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* RIGHT: Details Panel */}
                    <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                        {stage === 'SELECT' && (
                            <div style={{ textAlign: 'center', paddingTop: '3rem', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👈</div>
                                <p style={{ fontSize: '0.88rem' }}>Choose a payment method to activate your workspace.</p>
                            </div>
                        )}

                        {/* UPI */}
                        {stage === 'DETAILS' && payMethod === 'upi' && (
                            <div>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>Pay via UPI App</h3>
                                {error && <div className="error-message">{error}</div>}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    {UPI_APPS.map(app => (
                                        <button key={app.id} onClick={() => setUpiApp(app.id)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
                                                border: `2px solid ${upiApp === app.id ? app.color : 'var(--border-light)'}`,
                                                background: upiApp === app.id ? `${app.color}20` : 'transparent',
                                                transition: 'all 0.15s',
                                            }}>
                                            <span style={{ fontSize: '1.4rem' }}>{app.icon}</span>
                                            <span style={{ fontSize: '0.82rem', fontWeight: upiApp === app.id ? 600 : 400, color: 'var(--text-primary)' }}>{app.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Card */}
                        {stage === 'DETAILS' && payMethod === 'card' && (
                            <div>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>💳 Card Details</h3>
                                {error && <div className="error-message">{error}</div>}
                                <div className="input-group">
                                    <label className="input-label">Name on Card</label>
                                    <input type="text" className="form-input" placeholder="John Doe"
                                        value={cardData.name} onChange={e => setCardData({ ...cardData, name: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Card Number</label>
                                    <input type="text" className="form-input" placeholder="4242 4242 4242 4242"
                                        value={cardData.number}
                                        onChange={e => setCardData({ ...cardData, number: formatCard(e.target.value) })}
                                        maxLength={19} />
                                </div>
                                <div className="payment-card-grid">
                                    <div className="input-group">
                                        <label className="input-label">Expiry</label>
                                        <input type="text" className="form-input" placeholder="MM/YY"
                                            value={cardData.expiry}
                                            onChange={e => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                                            maxLength={5} />
                                    </div>
                                    <div className="input-group">
                                        <label className="input-label">CVV</label>
                                        <input type="password" className="form-input" placeholder="•••"
                                            value={cardData.cvv}
                                            onChange={e => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '').substring(0, 3) })}
                                            maxLength={3} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Connecting */}
                        {stage === 'CONNECTING' && (
                            <div className="processing-status">
                                <div className="pulse-loader" />
                                <div className="processing-text">Connecting to Payment Gateway...</div>
                                <div className="processing-sub">Establishing a 256-bit encrypted secure channel.</div>
                            </div>
                        )}

                        {/* PIN */}
                        {stage === 'PIN' && (
                            <PinInput onVerify={handlePaymentConfirmed} />
                        )}

                        {/* Proceed button */}
                        {stage === 'DETAILS' && (
                            <button className="btn btn-primary btn-block"
                                onClick={validate}
                                style={{ fontSize: '0.9rem', padding: '0.85rem', marginTop: '1rem' }}>
                                🔒 Proceed to Pay ₹{amount}
                            </button>
                        )}
                    </div>
                </div>

                {/* Security Footer */}
                <div className="security-footer" style={{ padding: '0.75rem 1.5rem' }}>
                    <div className="security-badge">🛡️ <span>PCI-DSS</span> Secured</div>
                    <div className="security-badge">🔒 <span>256-bit</span> SSL</div>
                    <div className="security-badge">✅ <span>RBI</span> Compliant</div>
                </div>
            </div>

            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Wrong account?{' '}
                <button onClick={() => { logout(); }} style={{ background: 'none', border: 'none', color: 'var(--brand-primary)', cursor: 'pointer', padding: 0 }}>
                    Sign out
                </button>
            </p>
        </div>
    );
};

export default PaymentWall;
