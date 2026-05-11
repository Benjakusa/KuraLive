import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { FaChartLine, FaShieldAlt, FaUsers, FaMobileAlt, FaCheck, FaLock, FaChartBar, FaServer, FaSun, FaMoon, FaBars, FaTimes } from 'react-icons/fa';

const LandingPage = () => {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { darkMode, toggleTheme } = useTheme();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => { document.body.style.overflow = 'auto'; };
    }, [mobileMenuOpen]);

    const scrollTo = (id) => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        setMobileMenuOpen(false);
    };

    const features = [
        { icon: <FaChartLine size={28} />, title: 'Live Results', desc: 'Watch results stream in real-time from every polling station across the country.' },
        { icon: <FaShieldAlt size={28} />, title: 'Secure & Verified', desc: 'Every submission is verified with photo proof and agent authentication.' },
        { icon: <FaUsers size={28} />, title: 'Agent Management', desc: 'Deploy, track, and manage field agents from a single dashboard.' },
        { icon: <FaMobileAlt size={28} />, title: 'Mobile Ready', desc: 'Agents submit results from any device, even with low connectivity.' },
        { icon: <FaServer size={28} />, title: 'Cloud Infrastructure', desc: 'Hosted on reliable cloud infrastructure for secure and scalable data handling.' },
        { icon: <FaChartBar size={28} />, title: 'Analytics', desc: 'Comprehensive reporting and analytics for post-election analysis.' },
    ];

    const steps = [
        { step: '01', title: 'Setup Your Election', desc: 'Create your election profile, define the geographic scope, and add candidates. Configure polling stations and assign agents.', color: 'var(--teal)' },
        { step: '02', title: 'Deploy Field Agents', desc: 'Register agents and assign them to specific polling stations. Credentials are auto-generated and securely distributed.', color: 'var(--teal)' },
        { step: '03', title: 'Monitor Live Results', desc: 'Watch results stream in real-time as agents submit from the field. Track progress, view proofs, and analyze outcomes.', color: 'var(--teal)' },
    ];

    const pricingPlans = [
        {
            name: 'Free Trial', price: 'Ksh. 0', period: '/ 14 days', features: ['Up to 10 polling stations', '5 field agents', 'Real-time results dashboard', 'Basic analytics', 'Email support'], cta: 'Start Free Trial', popular: false, outline: true,
        },
        {
            name: 'Professional', price: 'Ksh. 4,999', period: '/ month', features: ['Unlimited polling stations', 'Unlimited field agents', 'Real-time results dashboard', 'Advanced analytics & exports', 'Photo proof verification', 'Priority support', 'Custom branding'], cta: 'Get Started', popular: true, outline: false,
        },
        {
            name: 'Enterprise', price: 'Ksh. 11,999', period: '/ month', features: ['Up to 10 manager accounts', 'Everything in Professional', 'Dedicated infrastructure', 'SLA guarantees', 'API access', 'White-label solution', 'On-premise deployment option', '24/7 dedicated support'], cta: 'Contact Sales', popular: false, outline: true,
        },
    ];

    return (
        <div style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text-main)', background: 'var(--color-bg)', overflowX: 'hidden' }}>
            {/* NAV */}
            <nav style={{
                position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
                backgroundColor: scrolled || mobileMenuOpen ? 'var(--color-surface)' : 'transparent',
                borderBottom: scrolled || mobileMenuOpen ? '1px solid var(--color-border)' : 'none',
                transition: 'all 0.3s ease',
                backdropFilter: scrolled || mobileMenuOpen ? 'blur(12px)' : 'none',
                boxShadow: scrolled ? '0 2px 10px rgba(0,0,0,0.08)' : 'none',
                color: scrolled || mobileMenuOpen || darkMode ? 'var(--color-text-main)' : 'white'
            }}>
                <div style={{
                    maxWidth: '1200px', margin: '0 auto',
                    padding: '0.75rem 1rem',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FaChartBar style={{ color: 'var(--white)', fontSize: '1.2rem' }} />
                        </div>
                        <span style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', color: scrolled || mobileMenuOpen || darkMode ? 'inherit' : 'white' }}>KuraLive</span>
                    </div>

                    {/* Desktop Nav */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
                        <button onClick={() => scrollTo('home')} className="nav-btn">Home</button>
                        <button onClick={() => scrollTo('how-it-works')} className="nav-btn">How It Works</button>
                        <button onClick={() => scrollTo('pricing')} className="nav-btn">Pricing</button>
                        <Link to="/login" style={{ fontSize: '0.95rem', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--teal)', fontWeight: '600', padding: '6px 16px', border: '1.5px solid var(--teal)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', ...(scrolled || mobileMenuOpen || darkMode ? {} : { backgroundColor: 'var(--teal)', color: 'white' }) }}>Free Trial</Link>
                        <Link to="/admin-login" title="Admin Login" style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: scrolled || mobileMenuOpen || darkMode ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.1)', border: scrolled || mobileMenuOpen || darkMode ? 'none' : '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: scrolled || mobileMenuOpen || darkMode ? 'var(--teal)' : 'white', transition: 'all 0.2s' }}><FaLock /></Link>
                        <button onClick={toggleTheme} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'} style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', backgroundColor: scrolled || mobileMenuOpen || darkMode ? 'var(--color-primary-light)' : 'rgba(255,255,255,0.1)', border: scrolled || mobileMenuOpen || darkMode ? 'none' : '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: scrolled || mobileMenuOpen || darkMode ? 'var(--teal)' : 'white', transition: 'all 0.2s' }}>{darkMode ? <FaSun /> : <FaMoon />}</button>
                    </div>

                    {/* Mobile Hamburger */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{ display: 'none', background: 'none', border: 'none', color: scrolled || mobileMenuOpen || darkMode ? 'var(--color-text-main)' : 'white', fontSize: '1.5rem', cursor: 'pointer' }}
                        className="mobile-menu-btn"
                    >
                        {mobileMenuOpen ? <FaTimes /> : <FaBars />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div style={{ backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }} className="mobile-menu">
                        <button onClick={() => scrollTo('home')} style={{ ...navLinkStyle, textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>Home</button>
                        <button onClick={() => scrollTo('how-it-works')} style={{ ...navLinkStyle, textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>How It Works</button>
                        <button onClick={() => scrollTo('pricing')} style={{ ...navLinkStyle, textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>Pricing</button>
                        <Link to="/login" style={{ ...navLinkStyle, color: 'var(--teal)', fontWeight: '600', padding: '0.75rem 1rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid var(--teal)' }}>Free Trial</Link>
                        <Link to="/admin-login" style={{ ...navLinkStyle, padding: '0.75rem 1rem', borderRadius: '0.5rem', textAlign: 'center' }}>Admin Login</Link>
                        <button onClick={toggleTheme} style={{ ...navLinkStyle, padding: '0.75rem 1rem', borderRadius: '0.5rem', textAlign: 'left' }}>{darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
                    </div>
                )}
            </nav>

            {/* HERO */}
            <section id="home" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6rem 1rem 3rem', position: 'relative', backgroundImage: 'url(/src/assets/herospage.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1 }} />
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', width: '100%' }}>

                    <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: '800', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.5rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Real-time election results,<br /><span style={{ color: 'var(--teal-light)' }}>delivered instantly.</span></h1>
                    <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Monitor elections in real-time with field agents submitting results directly from polling stations. Built for transparency, speed, and accuracy.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/login" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.1rem' }}>Start Free Trial</Link>
                        <button onClick={() => scrollTo('how-it-works')} className="btn" style={{ padding: '0.875rem 2rem', fontSize: '1.1rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(4px)' }}>Learn More</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1.5rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <div><div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--teal-light)' }}>99.9%</div><div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Uptime</div></div>
                        <div><div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--teal-light)' }}>&lt;2s</div><div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Result Delivery</div></div>
                        <div><div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--teal-light)' }}>47</div><div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Counties Supported</div></div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section style={{ padding: '3rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem' }}>Built for Election Integrity</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(1rem, 2vw, 1.125rem)', maxWidth: '600px', margin: '0 auto' }}>Everything you need to run transparent, efficient election monitoring operations.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {features.map((feature, i) => (
                        <div key={i} className="card" style={{ padding: '1.5rem', transition: 'all 0.2s' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--teal-light)', color: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>{feature.icon}</div>
                            <h3 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>{feature.title}</h3>
                            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how-it-works" style={{ padding: '3rem 1rem', backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem' }}>How It Works</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}>Get up and running in three simple steps.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        {steps.map((item, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                                <div style={{ fontSize: '4rem', fontWeight: 800, color: item.color, opacity: 0.15, position: 'absolute', top: '-1rem', left: '-0.5rem' }}>{item.step}</div>
                                <div style={{ position: 'relative', zIndex: 1, paddingTop: '1.5rem' }}>
                                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1.25rem' }}>{item.title}</h3>
                                    <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* PRICING */}
            <section id="pricing" style={{ padding: '3rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem' }}>Simple, Transparent Pricing</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}>Start free. Scale when you're ready.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', maxWidth: '960px', margin: '0 auto' }}>
                    {pricingPlans.map((plan, i) => (
                        <div key={i} className="card" style={{ padding: '2rem 1.5rem', position: 'relative', border: plan.popular ? '2px solid var(--teal)' : '1px solid var(--color-border)', boxShadow: plan.popular ? 'var(--shadow-teal)' : 'none', ...(plan.popular ? { background: 'var(--color-surface-alt)' } : {}) }}>
                            {plan.popular && (
                                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: 'var(--teal)', color: 'var(--white)', padding: '4px 16px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Popular</div>
                            )}
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{plan.name}</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, marginBottom: '1rem' }}>{plan.price} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>{plan.period}</span></div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                                {plan.features.map((feat, j) => (
                                    <li key={j} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}><FaCheck style={{ color: 'var(--teal)', flexShrink: 0 }} /> {feat}</li>
                                ))}
                            </ul>
                            <Link to="/login" className={plan.outline ? 'btn btn-outline' : 'btn btn-primary'} style={{ width: '100%', padding: '0.75rem', textAlign: 'center', display: 'block', fontSize: '0.9rem' }}>{plan.cta}</Link>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: '3rem 1rem', textAlign: 'center', background: 'linear-gradient(135deg, var(--teal) 0%, #004D4D 100%)', color: 'var(--white)' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', color: 'var(--white)' }}>Ready to Transform Election Monitoring?</h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 'clamp(1rem, 2vw, 1.125rem)', marginBottom: '2rem' }}>Join organizations across Kenya using KuraLive for transparent, efficient election result collection.</p>
                    <Link to="/login" className="btn" style={{ padding: '0.875rem 2rem', fontSize: '1.1rem', backgroundColor: 'var(--white)', color: 'var(--teal)', fontWeight: 700, boxShadow: 'var(--shadow-lg)' }}>Start Your Free Trial</Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ padding: '2rem 1rem', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FaChartBar style={{ color: 'var(--white)', fontSize: '0.9rem' }} /></div>
                        <span style={{ fontWeight: 700 }}>KuraLive</span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>&copy; 2026 KuraLive. All rights reserved.</div>
                </div>
            </footer>

            {/* Mobile Styles */}
            <style>{`
                @media (max-width: 768px) {
                    .desktop-nav { display: none !important; }
                    .mobile-menu-btn { display: block !important; }
                }
                @media (min-width: 769px) {
                    .mobile-menu-btn { display: none !important; }
                    .mobile-menu { display: none !important; }
                }
                .nav-btn {
                    background: none; border: none; cursor: pointer;
                    font-size: 0.95rem; font-weight: 500; padding: 0; font-family: var(--font-sans);
                    color: inherit; transition: color 0.3s;
                }
                .nav-btn:hover { opacity: 0.8; }
            `}</style>
        </div>
    );
};

const navLinkStyle = {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: 500, padding: 0, fontFamily: 'var(--font-sans)',
};

export default LandingPage;
