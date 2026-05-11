import { useState, useEffect, useRef } from 'react';
import { useSubscription, PLANS } from '../contexts/SubscriptionContext';
import { FaTimes, FaCheck, FaStar, FaRocket, FaPhone, FaSpinner, FaReceipt } from 'react-icons/fa';

const UpgradeModal = ({ onClose }) => {
    const { upgradePlan, pollPaymentStatus, activatePlan, currentPlan } = useSubscription();
    const [upgrading, setUpgrading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [paymentStep, setPaymentStep] = useState('select');
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [paymentStatus, setPaymentStatus] = useState('');
    const [mpesaReceipt, setMpesaReceipt] = useState('');
    const [pollingInterval, setPollingInterval] = useState(null);
    const pollRef = useRef(null);

    const stopPolling = () => {
        if (pollRef.current) {
            clearTimeout(pollRef.current);
            pollRef.current = null;
        }
    };

    useEffect(() => {
        return () => stopPolling();
    }, []);

    const handleUpgrade = async (planId) => {
        const plan = PLANS[planId];
        if (planId === 'free') {
            setUpgrading(true);
            try {
                await upgradePlan(planId);
                setSuccess(true);
                setTimeout(onClose, 2000);
            } catch (err) {
                console.error('Upgrade failed:', err);
            }
            setUpgrading(false);
        } else {
            setSelectedPlan(plan);
            setPaymentStep('payment');
        }
    };

    const handlePayment = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            setPaymentStatus('Please enter a valid phone number');
            return;
        }

        setUpgrading(true);
        setPaymentStep('processing');
        setPaymentStatus('');

        try {
            const result = await upgradePlan(selectedPlan.id, phoneNumber);
            setPaymentStatus('STK Push sent to your phone. Enter your M-Pesa PIN to complete payment.');
            setPaymentStep('waiting');

            pollRef.current = setTimeout(async () => {
                const statusResult = await pollPaymentStatus(result.CheckoutRequestID);
                if (statusResult.confirmed) {
                    stopPolling();
                    setMpesaReceipt(statusResult.mpesaReceipt);
                    setPaymentStep('confirmed');
                    setPaymentStatus('');
                } else if (statusResult.message) {
                    stopPolling();
                    setPaymentStep('payment');
                    setPaymentStatus(statusResult.message);
                }
            }, 5000);
        } catch (err) {
            console.error('Payment failed:', err);
            setPaymentStatus('Failed to initiate payment. Please try again.');
            setPaymentStep('payment');
        }
        setUpgrading(false);
    };

    const handleActivate = async () => {
        setUpgrading(true);
        try {
            await activatePlan();
            setPaymentStep('success');
            setSuccess(true);
            setTimeout(onClose, 3000);
        } catch (err) {
            console.error('Activation failed:', err);
            setPaymentStatus('Failed to activate plan. Please try again.');
        }
        setUpgrading(false);
    };

    const paidPlans = [PLANS.medium, PLANS.enterprise];

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
            backdropFilter: 'blur(4px)',
        }}>
            <div style={{
                background: 'var(--color-surface)',
                borderRadius: '1.25rem',
                border: '1px solid var(--color-border)',
                boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
                width: '100%', maxWidth: '680px',
                maxHeight: '90vh', overflowY: 'auto',
                padding: '2rem',
                position: 'relative',
            }}>
                <button onClick={onClose} style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-muted)', fontSize: '1.25rem', lineHeight: 1,
                }}>
                    <FaTimes />
                </button>

                {paymentStep === 'success' ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: 'rgba(0,128,128,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                        }}>
                            <FaCheck style={{ fontSize: '2rem', color: 'var(--teal)' }} />
                        </div>
                        <h2 style={{ color: 'var(--teal)', margin: '0 0 0.5rem' }}>Plan Updated!</h2>
                        <p style={{ color: 'var(--color-text-muted)' }}>
                            Your account has been upgraded to <strong>{selectedPlan?.name}</strong>. All features are now available.
                        </p>
                    </div>
                ) : paymentStep === 'confirmed' ? (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: 'rgba(0,128,128,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1rem',
                            }}>
                                <FaCheck style={{ fontSize: '1.5rem', color: 'var(--teal)' }} />
                            </div>
                            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Payment Confirmed</h2>
                            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                                Your payment of KSh {selectedPlan?.price?.toLocaleString()} was received successfully.
                            </p>
                        </div>

                        <div style={{
                            padding: '1.5rem',
                            background: 'rgba(0,128,128,0.06)',
                            borderRadius: '1rem',
                            border: '1px solid rgba(0,128,128,0.2)',
                            marginBottom: '1.5rem',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <FaReceipt style={{ color: 'var(--teal)', fontSize: '1.1rem' }} />
                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Transaction Details</span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Receipt Number</span>
                                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>{mpesaReceipt}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Amount Paid</span>
                                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>KSh {selectedPlan?.price?.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Package</span>
                                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--teal)' }}>{selectedPlan?.name}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Paid From</span>
                                    <span style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>{phoneNumber}</span>
                                </div>
                            </div>
                        </div>

                        <div style={{
                            padding: '1rem',
                            background: 'rgba(0,255,127,0.06)',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(0,255,127,0.15)',
                            marginBottom: '1.5rem',
                        }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--success)' }}>
                                Click "Update Package" below to activate your {selectedPlan?.name} plan and unlock all features.
                            </p>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button
                                onClick={onClose}
                                style={{
                                    flex: 1,
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: '1px solid var(--color-border)',
                                    background: 'transparent',
                                    color: 'var(--color-text-main)',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Later
                            </button>
                            <button
                                onClick={handleActivate}
                                disabled={upgrading}
                                style={{
                                    flex: 2,
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    border: 'none',
                                    background: 'linear-gradient(135deg, var(--teal), #004D4D)',
                                    color: 'white',
                                    cursor: upgrading ? 'not-allowed' : 'pointer',
                                    fontWeight: '700',
                                    fontSize: '0.9rem',
                                    fontFamily: 'inherit',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                }}
                            >
                                {upgrading ? (
                                    <><FaSpinner className="spin" /> Updating...</>
                                ) : (
                                    <><FaRocket /> Update Package</>
                                )}
                            </button>
                        </div>
                    </>
                ) : paymentStep === 'waiting' ? (
                    <>
                        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '50%',
                                background: 'rgba(0,128,128,0.1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 1.5rem',
                            }}>
                                <FaPhone style={{ fontSize: '1.5rem', color: 'var(--teal)' }} />
                            </div>
                            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.3rem' }}>Waiting for Payment</h2>
                            <p style={{ color: 'var(--color-text-muted)', margin: '0 0 1.5rem', fontSize: '0.9rem' }}>
                                Enter your M-Pesa PIN on your phone ({phoneNumber}) to complete the payment.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <FaSpinner style={{ fontSize: '1.5rem', color: 'var(--teal)', animation: 'spin 1.5s linear infinite' }} />
                            </div>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginTop: '1rem' }}>
                                This may take a few seconds...
                            </p>
                        </div>
                    </>
                ) : paymentStep === 'payment' ? (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Complete Payment</h2>
                            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                                Pay KSh {selectedPlan?.price?.toLocaleString()} for {selectedPlan?.name} package
                            </p>
                        </div>

                        <div style={{ padding: '1.5rem', background: 'var(--color-surface)', borderRadius: '1rem', border: '1px solid var(--color-border)' }}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                    <FaPhone style={{ marginRight: '0.5rem' }} />
                                    M-Pesa Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                    placeholder="e.g., 0712345678"
                                    style={{
                                        width: '100%',
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--color-border)',
                                        background: 'var(--color-bg)',
                                        color: 'var(--color-text-main)',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        outline: 'none',
                                    }}
                                />
                            </div>

                            {paymentStatus && (
                                <div style={{
                                    padding: '0.75rem',
                                    borderRadius: '0.5rem',
                                    background: paymentStatus.includes('Failed') || paymentStatus.includes('failed') ? 'rgba(255,68,68,0.1)' : 'rgba(0,255,127,0.1)',
                                    border: `1px solid ${paymentStatus.includes('Failed') || paymentStatus.includes('failed') ? 'rgba(255,68,68,0.3)' : 'rgba(0,255,127,0.3)'}`,
                                    color: paymentStatus.includes('Failed') || paymentStatus.includes('failed') ? 'var(--danger)' : 'var(--success)',
                                    fontSize: '0.85rem',
                                    marginBottom: '1rem',
                                }}>
                                    {paymentStatus}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => { setPaymentStep('select'); setPaymentStatus(''); }}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: '1px solid var(--color-border)',
                                        background: 'transparent',
                                        color: 'var(--color-text-main)',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handlePayment}
                                    disabled={upgrading}
                                    style={{
                                        flex: 1,
                                        padding: '0.75rem',
                                        borderRadius: '0.5rem',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, var(--teal), #004D4D)',
                                        color: 'white',
                                        cursor: upgrading ? 'not-allowed' : 'pointer',
                                        fontWeight: '700',
                                        fontSize: '0.9rem',
                                        fontFamily: 'inherit',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.4rem',
                                    }}
                                >
                                    {upgrading ? 'Processing...' : <><FaPhone /> Pay via M-Pesa</>}
                                </button>
                            </div>
                        </div>
                    </>
                ) : paymentStep === 'processing' ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                        <FaSpinner style={{ fontSize: '2rem', color: 'var(--teal)', animation: 'spin 1.5s linear infinite' }} />
                        <h2 style={{ margin: '1rem 0 0.5rem', fontSize: '1.2rem' }}>Initiating Payment</h2>
                        <p style={{ color: 'var(--color-text-muted)' }}>Sending STK Push to your phone...</p>
                    </div>
                ) : (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                            <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.5rem' }}>Upgrade Your Plan</h2>
                            <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>
                                {currentPlan()?.id === 'free' ? 'Your free trial has expired. Choose a plan to continue.' : 'Choose a plan that fits your needs.'}
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '1rem' }}>
                            {paidPlans.map((plan) => {
                                const isEnterprise = plan.id === 'enterprise';
                                return (
                                    <div key={plan.id} style={{
                                        border: isEnterprise ? '2px solid var(--teal)' : '1px solid var(--color-border)',
                                        borderRadius: '1rem',
                                        padding: '1.5rem',
                                        position: 'relative',
                                        background: isEnterprise ? 'rgba(0,128,128,0.06)' : 'var(--color-surface)',
                                    }}>
                                        {isEnterprise && (
                                            <div style={{
                                                position: 'absolute', top: '-12px', left: '50%',
                                                transform: 'translateX(-50%)',
                                                background: 'var(--teal)', color: 'white',
                                                fontSize: '0.65rem', fontWeight: '700',
                                                padding: '3px 12px', borderRadius: '999px',
                                                letterSpacing: '0.08em', textTransform: 'uppercase',
                                                display: 'flex', alignItems: 'center', gap: '4px',
                                            }}>
                                                <FaStar style={{ fontSize: '0.6rem' }} /> Most Popular
                                            </div>
                                        )}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>
                                                {plan.name}
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                                                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{plan.currency}</span>
                                                <span style={{ fontSize: '2rem', fontWeight: '800', color: 'var(--color-text-main)' }}>
                                                    {plan.price.toLocaleString()}
                                                </span>
                                                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{plan.period}</span>
                                            </div>
                                        </div>

                                        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {plan.features.map(f => (
                                                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                                    <FaCheck style={{ color: 'var(--teal)', flexShrink: 0 }} /> {f}
                                                </li>
                                            ))}
                                        </ul>

                                        <button
                                            onClick={() => handleUpgrade(plan.id)}
                                            disabled={upgrading}
                                            style={{
                                                width: '100%',
                                                padding: '0.75rem',
                                                borderRadius: '0.625rem',
                                                cursor: upgrading ? 'not-allowed' : 'pointer',
                                                fontWeight: '700',
                                                fontSize: '0.9rem',
                                                fontFamily: 'inherit',
                                                background: isEnterprise
                                                    ? 'linear-gradient(135deg, var(--teal), #004D4D)'
                                                    : 'var(--color-surface-alt)',
                                                color: isEnterprise ? 'white' : 'var(--color-text-main)',
                                                border: isEnterprise ? 'none' : '1px solid var(--color-border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            {upgrading ? 'Processing...' : <><FaRocket /> Select {plan.name}</>}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', marginTop: '1.25rem', marginBottom: 0 }}>
                            Payment processed securely via M-Pesa Daraja API
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default UpgradeModal;
