import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../contexts/AuthContext';

/* ════════════════════════════════════════════════════
   AMAZON-STYLE PAYMENT GATEWAY
   Stages: METHOD_SELECT → DETAILS → CONNECTING → PIN → FINALIZING
   Methods: UPI Apps | Credit Card | Debit Card | Net Banking | EMI
════════════════════════════════════════════════════ */

/* ── UPI Apps Config ─────────────────────────── */
const UPI_APPS = [
    { id: 'phonepe',  label: 'PhonePe',     icon: '💜', color: '#5f259f', deepLink: (amt) => `phonepe://pay?pa=tenantvault@ybl&pn=TenantVault&am=${amt}&cu=INR` },
    { id: 'gpay',     label: 'Google Pay',  icon: '🔵', color: '#4285f4', deepLink: (amt) => `tez://upi/pay?pa=tenantvault@okhdfcbank&pn=TenantVault&am=${amt}&cu=INR` },
    { id: 'paytm',    label: 'Paytm',       icon: '🔷', color: '#00B9F1', deepLink: (amt) => `paytmmp://pay?pa=tenantvault@paytm&pn=TenantVault&am=${amt}&cu=INR` },
    { id: 'bhim',     label: 'BHIM',        icon: '🇮🇳', color: '#ff6600', deepLink: (amt) => `upi://pay?pa=tenantvault@upi&pn=TenantVault&am=${amt}&cu=INR` },
    { id: 'other',    label: 'Other UPI',   icon: '📱', color: '#6366f1', deepLink: null },
];

/* ── Banks for Net Banking ───────────────────── */
const BANKS = [
    'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank',
    'Kotak Mahindra Bank', 'Punjab National Bank', 'Bank of Baroda',
    'Canara Bank', 'Yes Bank', 'IndusInd Bank',
];

/* ── Detect if user is on mobile ────────────────── */
const isMobile = () => /iPhone|iPad|Android/i.test(navigator.userAgent);

/* ═══════════════════════════════════════════════════
   PIN / OTP Input Component (6-digit grid)
════════════════════════════════════════════════════ */
const PinInput = ({ label, hint, onVerify, loading }) => {
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
            setError('Incorrect PIN. Use 123456 for testing.');
        }
    };

    return (
        <div className="otp-container">
            <p className="modal-sub" style={{ textAlign: 'center' }}>{label}</p>
            {error && <div className="error-message" style={{ width: '100%' }}>{error}</div>}
            <div className="otp-grid">
                {pin.map((d, i) => (
                    <input key={i} ref={refs[i]} type="password" className="otp-box"
                        value={d} onChange={e => handleChange(i, e.target.value)}
                        onKeyDown={e => handleKeyDown(i, e)} />
                ))}
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                🔐 Hint for testing: <strong>1 2 3 4 5 6</strong>
            </p>
            <button className="btn btn-primary btn-block" onClick={handleVerify} disabled={loading}>
                {loading ? 'Verifying...' : '✅ Confirm Payment'}
            </button>
        </div>
    );
};

/* ═══════════════════════════════════════════════════
   MAIN PAYMENT GATEWAY MODAL
════════════════════════════════════════════════════ */
const PaymentGateway = ({ invoice, onClose, onPaymentComplete }) => {
    const [stage, setStage]         = useState('METHOD_SELECT'); // METHOD_SELECT | DETAILS | CONNECTING | PIN | FINALIZING
    const [payMethod, setPayMethod] = useState(null);            // 'upi' | 'credit' | 'debit' | 'netbanking' | 'emi'
    const [upiApp, setUpiApp]       = useState(null);
    const [upiId, setUpiId]         = useState('');
    const [cardData, setCardData]   = useState({ name: '', number: '', expiry: '', cvv: '', saveCard: false });
    const [bank, setBank]           = useState('');
    const [emiMonths, setEmiMonths] = useState(3);
    const [error, setError]         = useState(null);
    const [mobileDetected]          = useState(isMobile());

    /* ── Validate & proceed to connection ── */
    const validateAndConnect = () => {
        setError(null);
        if (payMethod === 'upi') {
            if (upiApp === 'other' && !upiId.includes('@'))
                return setError('Enter a valid UPI ID (e.g. name@bank)');
            if (!upiApp) return setError('Please select a UPI app.');

            // Mobile: deep-link into the UPI app
            if (mobileDetected && upiApp !== 'other') {
                const app = UPI_APPS.find(a => a.id === upiApp);
                window.location.href = app.deepLink(invoice.amount);
                // After deep-link, we still show PIN (user comes back after paying)
            }
            setStage('CONNECTING');
            setTimeout(() => setStage('PIN'), 2000);
        } else if (payMethod === 'credit' || payMethod === 'debit') {
            const num = cardData.number.replace(/\s/g, '');
            if (num.length < 16) return setError('Enter a valid 16-digit card number.');
            if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) return setError('Expiry must be MM/YY.');
            if (cardData.cvv.length < 3) return setError('Enter a valid CVV.');
            if (!cardData.name.trim()) return setError('Enter the name on card.');
            setStage('CONNECTING');
            setTimeout(() => setStage('PIN'), 2500);
        } else if (payMethod === 'netbanking') {
            if (!bank) return setError('Please select your bank.');
            setStage('CONNECTING');
            setTimeout(() => setStage('PIN'), 1800);
        } else if (payMethod === 'emi') {
            const num = cardData.number.replace(/\s/g, '');
            if (num.length < 16) return setError('Enter a valid card number for EMI.');
            setStage('CONNECTING');
            setTimeout(() => setStage('PIN'), 2000);
        }
    };

    /* ── Format card number with spaces ── */
    const formatCard = (val) => val.replace(/\D/g, '').substring(0, 16).replace(/(.{4})/g, '$1 ').trim();

    /* ── Format expiry ── */
    const formatExpiry = (val) => {
        const cleaned = val.replace(/\D/g, '').substring(0, 4);
        return cleaned.length >= 3 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned;
    };

    /* ── Detect card type from number ── */
    const getCardType = (num) => {
        const n = num.replace(/\s/g, '');
        if (/^4/.test(n)) return { label: 'VISA', color: '#1a1f71' };
        if (/^5[1-5]/.test(n)) return { label: 'Mastercard', color: '#eb001b' };
        if (/^3[47]/.test(n)) return { label: 'Amex', color: '#007bc1' };
        if (/^6/.test(n)) return { label: 'RuPay', color: '#f36f21' };
        return null;
    };

    const cardType = getCardType(cardData.number);
    const emiAmount = (invoice.amount / emiMonths).toFixed(2);

    /* ── Payment methods list ── */
    const methods = [
        { id: 'upi',        icon: '📱', label: 'UPI',          sub: 'PhonePe, Google Pay, Paytm, BHIM' },
        { id: 'credit',     icon: '💳', label: 'Credit Card',  sub: 'Visa, Mastercard, Amex, RuPay' },
        { id: 'debit',      icon: '🏧', label: 'Debit Card',   sub: 'All major bank debit cards' },
        { id: 'netbanking', icon: '🏦', label: 'Net Banking',  sub: '10+ banks supported' },
        { id: 'emi',        icon: '📅', label: 'EMI',          sub: `3 / 6 / 12 months • 0% interest` },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ maxWidth: '520px', padding: '0' }} onClick={e => e.stopPropagation()}>

                {/* ── Header ── */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div className="bank-logo" style={{ marginBottom: '0.2rem' }}>🛡️ <span>TenantVault Checkout</span></div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                            Invoice #{invoice.id} &nbsp;•&nbsp; <strong style={{ color: 'var(--text-primary)' }}>₹{invoice.amount}</strong>
                        </p>
                    </div>
                    <button className="modal-close" style={{ position: 'static' }} onClick={onClose}>✕</button>
                </div>

                <div style={{ display: 'flex', minHeight: '420px' }}>

                    {/* ── Left: Method List (always visible) ── */}
                    <div style={{ width: '190px', flexShrink: 0, borderRight: '1px solid var(--border-light)', padding: '0.75rem 0' }}>
                        {methods.map(m => (
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

                    {/* ── Right: Details Panel ── */}
                    <div style={{ flex: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

                        {/* ── Default Prompt ── */}
                        {stage === 'METHOD_SELECT' && (
                            <div style={{ textAlign: 'center', paddingTop: '3rem', color: 'var(--text-secondary)' }}>
                                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>👈</div>
                                <p>Select a payment method to continue.</p>
                            </div>
                        )}

                        {/* ════ UPI DETAILS ════ */}
                        {stage === 'DETAILS' && payMethod === 'upi' && (
                            <div>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>Pay via UPI App</h3>
                                {error && <div className="error-message">{error}</div>}

                                {/* App Grid */}
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

                                {/* QR code on desktop */}
                                {!mobileDetected && upiApp && upiApp !== 'other' && (
                                    <div style={{ marginBottom: '1rem', background: 'white', padding: '0.75rem', borderRadius: '10px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <img src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=upi://pay?pa=tenantvault@ybl&am=${invoice.amount}`}
                                            alt="QR" style={{ borderRadius: '6px' }} />
                                        <div>
                                            <p style={{ margin: '0 0 0.25rem', fontSize: '0.82rem', fontWeight: 600, color: '#333' }}>Scan with {UPI_APPS.find(a => a.id === upiApp)?.label}</p>
                                            <p style={{ margin: 0, fontSize: '0.72rem', color: '#666' }}>Open your UPI app → Scan QR → Enter PIN to pay</p>
                                        </div>
                                    </div>
                                )}

                                {/* Other UPI ID input */}
                                {upiApp === 'other' && (
                                    <div className="input-group">
                                        <label className="input-label">Your UPI ID</label>
                                        <input type="text" className="form-input" placeholder="yourname@bank"
                                            value={upiId} onChange={e => setUpiId(e.target.value)} />
                                    </div>
                                )}

                                {mobileDetected && upiApp && upiApp !== 'other' && (
                                    <p style={{ fontSize: '0.78rem', color: 'var(--accent-success)', marginBottom: '0.75rem' }}>
                                        📱 Clicking below will open <strong>{UPI_APPS.find(a => a.id === upiApp)?.label}</strong> on your phone.
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ════ CREDIT / DEBIT CARD ════ */}
                        {stage === 'DETAILS' && (payMethod === 'credit' || payMethod === 'debit') && (
                            <div>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>
                                    {payMethod === 'credit' ? '💳 Credit Card' : '🏧 Debit Card'} Details
                                </h3>
                                {error && <div className="error-message">{error}</div>}

                                {/* Card Preview */}
                                <div style={{
                                    background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                                    borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', color: 'white',
                                    fontFamily: 'monospace', position: 'relative', overflow: 'hidden',
                                }}>
                                    <div style={{ position: 'absolute', top: '-15px', right: '-15px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', opacity: 0.7 }}>
                                        {payMethod === 'credit' ? 'CREDIT CARD' : 'DEBIT CARD'}
                                    </p>
                                    <p style={{ margin: '0 0 0.75rem', fontSize: '1rem', letterSpacing: '2px' }}>
                                        {cardData.number || '•••• •••• •••• ••••'}
                                    </p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                                        <span>{cardData.name || 'CARD HOLDER'}</span>
                                        <span>{cardData.expiry || 'MM/YY'}</span>
                                    </div>
                                    {cardType && (
                                        <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: cardType.color, color: 'white', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                            {cardType.label}
                                        </div>
                                    )}
                                </div>

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
                                        <label className="input-label">Expiry (MM/YY)</label>
                                        <input type="text" className="form-input" placeholder="12/28"
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
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', marginTop: '0.25rem' }}>
                                    <input type="checkbox" checked={cardData.saveCard}
                                        onChange={e => setCardData({ ...cardData, saveCard: e.target.checked })} />
                                    Save this card for future payments
                                </label>
                            </div>
                        )}

                        {/* ════ NET BANKING ════ */}
                        {stage === 'DETAILS' && payMethod === 'netbanking' && (
                            <div>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>🏦 Net Banking</h3>
                                {error && <div className="error-message">{error}</div>}
                                <div className="input-group">
                                    <label className="input-label">Select Your Bank</label>
                                    <select className="form-input" value={bank} onChange={e => setBank(e.target.value)}
                                        style={{ cursor: 'pointer' }}>
                                        <option value="">-- Choose Bank --</option>
                                        {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                    </select>
                                </div>
                                {bank && (
                                    <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: '10px', padding: '0.85rem', marginTop: '0.75rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                        🔒 You will be securely redirected to <strong style={{ color: 'var(--text-primary)' }}>{bank}</strong>'s portal to complete the payment.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ════ EMI ════ */}
                        {stage === 'DETAILS' && payMethod === 'emi' && (
                            <div>
                                <h3 style={{ margin: '0 0 1rem', fontSize: '0.95rem' }}>📅 Pay in Easy Instalments (0% Interest)</h3>
                                {error && <div className="error-message">{error}</div>}

                                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                    {[3, 6, 12].map(m => (
                                        <button key={m} onClick={() => setEmiMonths(m)}
                                            style={{
                                                flex: 1, padding: '0.85rem 0.5rem', borderRadius: '10px', cursor: 'pointer',
                                                border: `2px solid ${emiMonths === m ? 'var(--brand-primary)' : 'var(--border-light)'}`,
                                                background: emiMonths === m ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                textAlign: 'center', transition: 'all 0.15s',
                                            }}>
                                            <p style={{ margin: '0 0 0.2rem', fontWeight: 700, fontSize: '1rem', color: 'var(--brand-primary)' }}>{m}</p>
                                            <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>months</p>
                                            <p style={{ margin: '0.3rem 0 0', fontWeight: 600, fontSize: '0.85rem' }}>₹{emiAmount}/mo</p>
                                        </button>
                                    ))}
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Card Number for EMI</label>
                                    <input type="text" className="form-input" placeholder="4242 4242 4242 4242"
                                        value={cardData.number}
                                        onChange={e => setCardData({ ...cardData, number: formatCard(e.target.value) })}
                                        maxLength={19} />
                                </div>
                                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                                    Total: ₹{invoice.amount} · {emiMonths} × ₹{emiAmount} · 0% interest
                                </p>
                            </div>
                        )}

                        {/* ════ CONNECTING ════ */}
                        {stage === 'CONNECTING' && (
                            <div className="processing-status">
                                <div className="pulse-loader" />
                                <div className="processing-text">Connecting to Bank...</div>
                                <div className="processing-sub">Establishing a 256-bit encrypted secure channel.</div>
                            </div>
                        )}

                        {/* ════ PIN ENTRY ════ */}
                        {stage === 'PIN' && (
                            <PinInput
                                label={
                                    payMethod === 'upi'
                                        ? `Enter your ${UPI_APPS.find(a => a.id === upiApp)?.label || 'UPI'} PIN`
                                        : payMethod === 'netbanking'
                                        ? `Enter your ${bank} internet banking password`
                                        : 'Enter your card 3D Secure PIN'
                                }
                                onVerify={() => {
                                    setStage('FINALIZING');
                                    onPaymentComplete(invoice.id, payMethod === 'upi' ? (UPI_APPS.find(a => a.id === upiApp)?.label || 'UPI') : payMethod === 'credit' ? 'Credit Card' : payMethod === 'debit' ? 'Debit Card' : payMethod === 'netbanking' ? `Net Banking (${bank})` : `EMI (${emiMonths}m)`);
                                }}
                                loading={stage === 'FINALIZING'}
                            />
                        )}

                        {/* ════ FINALIZING ════ */}
                        {stage === 'FINALIZING' && (
                            <div className="processing-status">
                                <span className="loader" style={{ width: '50px', height: '50px', marginBottom: '1.5rem' }} />
                                <div className="processing-text">Finalizing Payment...</div>
                                <div className="processing-sub">Updating your invoice and subscription status.</div>
                            </div>
                        )}

                        {/* ── Proceed Button (shown only during DETAILS stage) ── */}
                        {stage === 'DETAILS' && (
                            <div style={{ marginTop: '1.5rem' }}>
                                <button className="btn btn-primary btn-block" onClick={validateAndConnect}
                                    style={{ fontSize: '0.9rem', padding: '0.85rem' }}>
                                    {payMethod === 'upi' && mobileDetected
                                        ? `📱 Open ${UPI_APPS.find(a => a.id === upiApp)?.label || 'UPI App'}`
                                        : `🔒 Proceed to Pay ₹${invoice.amount}`}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Security Footer ── */}
                <div className="security-footer" style={{ padding: '0.75rem 1.5rem' }}>
                    <div className="security-badge">🛡️ <span>PCI-DSS</span> Secured</div>
                    <div className="security-badge">🔒 <span>256-bit</span> SSL</div>
                    <div className="security-badge">✅ <span>RBI</span> Compliant</div>
                </div>
            </div>
        </div>
    );
};


/* ═══════════════════════════════════════════════════
   TRANSACTION RECEIPT MODAL
════════════════════════════════════════════════════ */
const TransactionReceipt = ({ invoice, onClose }) => {
    const txnId = `TXN${Date.now().toString().slice(-10)}`;
    const paidAt = new Date().toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card" style={{ maxWidth: '420px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                {/* Success Icon */}
                <div className="success-check">✓</div>
                <h2 style={{ margin: '0 0 0.4rem' }}>Payment Successful!</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0 0 1.5rem' }}>
                    Your payment has been verified and processed.
                </p>

                {/* Receipt Block */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '1.25rem', textAlign: 'left', marginBottom: '1.5rem' }}>
                    {[
                        ['Transaction ID', txnId],
                        ['Invoice #', invoice.id],
                        ['Amount Paid', `₹${invoice.amount}`],
                        ['Paid Via', invoice.payment_method],
                        ['Date & Time', paidAt],
                        ['Status', '✅ PAID'],
                    ].map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-light)' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{label}</span>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: label === 'Status' ? 'var(--accent-success)' : 'var(--text-primary)' }}>{value}</span>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => window.print()}>
                        🖨️ Print Receipt
                    </button>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};


/* ═══════════════════════════════════════════════════
   MAIN INVOICES PAGE
════════════════════════════════════════════════════ */
const Invoices = () => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [invoices, setInvoices]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [activeInvoice, setActiveInvoice] = useState(null);
    const [paidInvoice, setPaidInvoice]   = useState(null); // for receipt
    const [message, setMessage]           = useState(null);

    useEffect(() => { fetchInvoices(); }, []);

    const fetchInvoices = async () => {
        try {
            const res = await api.get('/billing/');
            setInvoices(res.data);
        } catch (err) {
            console.error('Failed to fetch invoices', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentComplete = async (invoiceId, method) => {
        try {
            const res = await api.post('/billing/pay/', { invoice_id: invoiceId, payment_method: method });
            setTimeout(() => {
                setActiveInvoice(null);
                fetchInvoices().then(() => {
                    // Find the just-paid invoice from fresh data or construct minimal object
                    setPaidInvoice({ id: invoiceId, amount: activeInvoice?.amount, payment_method: method });
                });
                setMessage({ type: 'success', text: res.data.message });
            }, 1500);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.detail || 'Payment failed.' });
            setActiveInvoice(null);
        }
    };

    if (loading) return <div className="auth-container"><span className="loader" /></div>;

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div style={{ marginBottom: '2rem' }}>
                    <h2 style={{ color: 'var(--brand-primary)', margin: 0 }}>TenantVault</h2>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Billing & Invoices</p>
                </div>
                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <Link to="/dashboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>📊 Dashboard</Link>
                    <button className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none', background: 'rgba(255,255,255,0.05)' }}>💳 Billing</button>
                    <Link to="/documents" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>📄 Documents</Link>
                    <Link to="/editor/0"  className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>✏️ Collab Editor</Link>
                    <Link to="/settings"  className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: 'none' }}>⚙️ Settings</Link>
                </nav>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                    <button onClick={() => { logout(); navigate('/login'); }}
                        className="btn btn-secondary btn-block"
                        style={{ borderColor: 'var(--accent-error)', color: 'var(--accent-error)' }}>
                        Log Out
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <div>
                        <h1>Billing & Subscriptions</h1>
                        <p style={{ margin: 0 }}>Pay invoices securely using UPI, Cards, Net Banking, or EMI.</p>
                    </div>
                </header>

                {message && (
                    <div className="error-message" style={{
                        background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        borderLeftColor: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-error)',
                        color: message.type === 'success' ? 'var(--accent-success)' : 'var(--accent-error)',
                    }}>
                        {message.type === 'success' ? '✅ ' : '❌ '}{message.text}
                    </div>
                )}

                <div className="glass-panel" style={{ padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                                {['Invoice #', 'Issued Date', 'Amount', 'Status', 'Payment Action'].map(h => (
                                    <th key={h} style={{ padding: '1.25rem 1.5rem', color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 600 }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {invoices.map(inv => (
                                <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                                    <td style={{ padding: '1.25rem 1.5rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>#{inv.id}</td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontSize: '0.88rem' }}>{new Date(inv.issued_at).toLocaleDateString('en-IN')}</td>
                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700 }}>₹{inv.amount}</td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.7rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                                            background: inv.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: inv.status === 'paid' ? 'var(--accent-success)' : '#f59e0b',
                                        }}>
                                            {inv.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                        {inv.status === 'pending' ? (
                                            <button onClick={() => setActiveInvoice(inv)}
                                                className="btn btn-primary"
                                                style={{ padding: '0.5rem 1.25rem', fontSize: '0.82rem' }}>
                                                💳 Pay Now
                                            </button>
                                        ) : (
                                            <span style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                                                Paid via {inv.payment_method}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {invoices.length === 0 && (
                        <p style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No invoices found.</p>
                    )}
                </div>
            </main>

            {/* Payment Gateway Modal */}
            {activeInvoice && !paidInvoice && (
                <PaymentGateway
                    invoice={activeInvoice}
                    onClose={() => setActiveInvoice(null)}
                    onPaymentComplete={handlePaymentComplete}
                />
            )}

            {/* Transaction Receipt Modal */}
            {paidInvoice && (
                <TransactionReceipt
                    invoice={paidInvoice}
                    onClose={() => setPaidInvoice(null)}
                />
            )}
        </div>
    );
};

export default Invoices;
