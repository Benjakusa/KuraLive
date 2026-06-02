import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { FaChartLine, FaBullhorn, FaPollH, FaVoteYea, FaChartBar, FaUsers, FaLayerGroup, FaCheck, FaLock, FaSun, FaMoon, FaBars, FaTimes, FaRocket, FaStar, FaHandshake, FaClipboardList, FaEnvelope, FaPhone, FaGlobeAfrica, FaUserTie } from 'react-icons/fa';
import logolight from '../assets/logo1.png';
import logodark from '../assets/logo3.png';

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
        { icon: <FaClipboardList size={28} />, title: 'Campaign Planning', bullets: ['Define campaign strategy and goals', 'Create detailed timelines and budgets', 'Assign tasks and track progress', 'Centralized campaign dashboard'] },
        { icon: <FaBullhorn size={28} />, title: 'Bulk SMS', bullets: ['Send targeted SMS campaigns', 'Personalized message templates', 'Schedule and automate broadcasts', 'Track delivery and engagement'] },
        { icon: <FaPollH size={28} />, title: 'Polling & Surveys', bullets: ['Create opinion polls and surveys', 'Collect real-time voter feedback', 'Geographic response breakdown', 'Anonymous data collection'] },
        { icon: <FaVoteYea size={28} />, title: 'Election & Voting Management', bullets: ['Manage election logistics and timelines', 'Secure online and offline voting', 'Voter registration and verification', 'Ballot and candidate management'] },
        { icon: <FaChartBar size={28} />, title: 'Results Management', bullets: ['Real-time result collection from the field', 'Photo proof verification', 'Multi-level result aggregation', 'Export reports (Excel, PDF)'] },
        { icon: <FaUsers size={28} />, title: 'Team & Volunteer Management', bullets: ['Register and deploy field agents', 'Assign roles and permissions', 'Track team performance', 'Automated credential distribution'] },
    ];

    const steps = [
        { step: '01', title: 'Set Up Your Campaign', desc: 'Create your campaign profile, define your strategy, set up elections or polls, and configure your team.', color: '#e5de00' },
        { step: '02', title: 'Deploy & Engage', desc: 'Register team members, send bulk SMS campaigns, launch opinion polls, and collect voter feedback in real-time.', color: '#e5de00' },
        { step: '03', title: 'Monitor & Win', desc: 'Track results as they come in, analyze voter sentiment, generate reports, and make data-driven decisions.', color: '#e5de00' },
    ];

    const pricingPlans = [
        {
            name: 'Free Trial', price: '$0', period: '/ 14 days', features: ['Up to 10 polling stations', '5 field agents', 'Basic campaign dashboard', 'Email support', 'Single election management'], cta: 'Start 14-Day Free Trial', popular: false, outline: true,
        },
        {
            name: 'Professional', price: '$199', period: '/ year', features: ['Unlimited polling stations', 'Unlimited field agents', 'Bulk SMS integration', 'Advanced analytics & exports', 'Photo proof verification', 'Priority support', 'Custom branding'], cta: 'Get Started', popular: true, outline: false,
        },
        {
            name: 'Enterprise', price: '$499', period: '/ year', features: ['Everything in Professional', 'Multi-election management', 'Dedicated infrastructure', 'SLA guarantees', 'API access', 'White-label solution', 'On-premise deployment option', '24/7 dedicated support'], cta: 'Contact Sales', popular: false, outline: true,
        },
    ];

    const targetUsers = [
        { icon: <FaUserTie size={32} />, title: 'Political Candidates', desc: 'Manage your campaign from announcement to victory with comprehensive tools.' },
        { icon: <FaUsers size={32} />, title: 'Political Parties', desc: 'Coordinate multiple candidates and campaigns under one unified platform.' },
        { icon: <FaHandshake size={32} />, title: 'Campaign Managers', desc: 'Oversee operations, track progress, and keep your team aligned.' },
        { icon: <FaBullhorn size={32} />, title: 'Communications Teams', desc: 'Craft and broadcast your message across SMS, social media, and more.' },
        { icon: <FaChartLine size={32} />, title: 'Data Analysts', desc: 'Turn voter data and polling results into actionable campaign insights.' },
        { icon: <FaGlobeAfrica size={32} />, title: 'Election Observers', desc: 'Monitor electoral processes with transparency and real-time reporting.' },
    ];

    const benefits = [
        'Centralized campaign operations from a single dashboard',
        'Real-time data collection and result aggregation',
        'Multi-channel voter engagement (SMS, polls, social media)',
        'Secure, role-based access for team members',
        'Scalable infrastructure that grows with your campaign',
        'Comprehensive analytics and exportable reports',
        'Dedicated support and onboarding assistance',
        'Proven reliability with 99.9% uptime guarantee',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <img src={darkMode ? logodark : logolight} alt="" style={{ height: '36px', width: 'auto' }} />
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: scrolled || mobileMenuOpen || darkMode ? 'var(--color-text-main)' : 'white' }}>Uchaguzi</span><span style={{ fontWeight: 700, fontSize: '1.1rem', color: '#e5de00' }}>360</span>
                    </div>

                    {/* Desktop Nav */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="desktop-nav">
                        <button onClick={() => scrollTo('home')} className="nav-btn">Home</button>
                        <button onClick={() => scrollTo('features')} className="nav-btn">Features</button>
                        <button onClick={() => scrollTo('how-it-works')} className="nav-btn">How It Works</button>
                        <button onClick={() => scrollTo('pricing')} className="nav-btn">Pricing</button>
                        <Link to="/login" style={{ fontSize: '0.95rem', background: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)', color: 'var(--teal)', fontWeight: '600', padding: '6px 16px', border: '1.5px solid var(--teal)', borderRadius: 'var(--radius-md)', transition: 'all 0.2s', ...(scrolled || mobileMenuOpen || darkMode ? {} : { backgroundColor: 'var(--teal)', color: 'white' }) }}>Start Free Trial</Link>
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
                        <button onClick={() => scrollTo('features')} style={{ ...navLinkStyle, textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>Features</button>
                        <button onClick={() => scrollTo('how-it-works')} style={{ ...navLinkStyle, textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>How It Works</button>
                        <button onClick={() => scrollTo('pricing')} style={{ ...navLinkStyle, textAlign: 'left', padding: '0.75rem 1rem', borderRadius: '0.5rem' }}>Pricing</button>
                        <Link to="/login" style={{ ...navLinkStyle, color: 'var(--teal)', fontWeight: '600', padding: '0.75rem 1rem', borderRadius: '0.5rem', textAlign: 'center', border: '1px solid var(--teal)' }}>Start Free Trial</Link>
                        <Link to="/admin-login" style={{ ...navLinkStyle, padding: '0.75rem 1rem', borderRadius: '0.5rem', textAlign: 'center' }}>Admin Login</Link>
                        <button onClick={toggleTheme} style={{ ...navLinkStyle, padding: '0.75rem 1rem', borderRadius: '0.5rem', textAlign: 'left' }}>{darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}</button>
                    </div>
                )}
            </nav>

            {/* HERO */}
            <section id="home" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '6rem 1rem 3rem', position: 'relative', backgroundImage: 'url(/src/assets/herospage.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1 }} />
                <div style={{ position: 'relative', zIndex: 2, maxWidth: '800px', width: '100%' }}>

                    <h1 style={{ fontSize: 'clamp(2rem, 6vw, 4rem)', fontWeight: '800', lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: '1.5rem', color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>Manage Winning Political Campaigns<br /><span style={{ color: '#e5de00' }}>from One Platform</span></h1>
                    <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', color: 'rgba(255, 255, 255, 0.9)', lineHeight: 1.6, marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>Uchaguzi360 is a comprehensive political campaign management platform that helps you plan, execute, and monitor winning campaigns with tools for SMS broadcasting, polling, results management, and team coordination.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/login" className="btn btn-primary" style={{ padding: '0.875rem 2rem', fontSize: '1.1rem' }}>Start 14-Day Free Trial</Link>
                        <button onClick={() => scrollTo('features')} className="btn" style={{ padding: '0.875rem 2rem', fontSize: '1.1rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white', border: '1px solid rgba(255, 255, 255, 0.3)', backdropFilter: 'blur(4px)' }}>Book a Demo</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '1.5rem', marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#e5de00' }}>99.9%</div><div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Uptime</div></div>
                        <div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#e5de00' }}>14 Days</div><div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Free Trial</div></div>
                        <div><div style={{ fontSize: '2rem', fontWeight: 800, color: '#e5de00' }}>47</div><div style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.7)' }}>Counties Supported</div></div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section id="features" style={{ padding: '3rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem' }}>Everything You Need to Win</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(1rem, 2vw, 1.125rem)', maxWidth: '600px', margin: '0 auto' }}>A complete toolkit for modern political campaign management, from voter outreach to results analysis.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {features.map((feature, i) => (
                        <div key={i} className="card" style={{ padding: '1.5rem', transition: 'all 0.2s', boxShadow: '0 4px 20px rgba(229, 222, 0, 0.15)' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--teal-light)', color: darkMode ? '#e5de00' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>{feature.icon}</div>
                            <h3 style={{ marginBottom: '0.75rem', fontSize: '1.125rem' }}>{feature.title}</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {feature.bullets.map((bullet, j) => (
                                    <li key={j} style={{ padding: '0.25rem 0', color: 'var(--color-text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <FaCheck style={{ color: darkMode ? '#e5de00' : 'var(--teal)', fontSize: '0.75rem', flexShrink: 0 }} /> {bullet}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </section>

            {/* TARGET USERS */}
            <section style={{ padding: '3rem 1rem', backgroundColor: 'var(--color-surface)', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem' }}>Who Uses Uchaguzi<span style={{ color: '#e5de00' }}>360</span>?</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}>Built for campaign professionals at every level.</p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        {targetUsers.map((item, i) => (
                            <div key={i} style={{ textAlign: 'center', padding: '1.5rem', boxShadow: '0 4px 20px rgba(229, 222, 0, 0.1)', borderRadius: 'var(--radius-md)' }}>
                                <div style={{ color: darkMode ? '#e5de00' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '2.5rem' }}>{item.icon}</div>
                                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>{item.title}</h3>
                                <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* BENEFITS */}
            <section style={{ padding: '3rem 1rem', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem' }}>Why Choose Uchaguzi<span style={{ color: '#e5de00' }}>360</span>?</h2>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 'clamp(1rem, 2vw, 1.125rem)' }}>Built for transparency, speed, and accuracy in political campaign management.</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                    {benefits.map((benefit, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: '0 2px 12px rgba(229, 222, 0, 0.1)' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--teal-light)', color: darkMode ? '#e5de00' : 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FaCheck /></div>
                            <span style={{ fontSize: '0.95rem' }}>{benefit}</span>
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
                        <div key={i} className="card" style={{ padding: '2rem 1.5rem', position: 'relative', border: plan.popular ? '2px solid var(--teal)' : '1px solid var(--color-border)', boxShadow: plan.popular ? '0 8px 30px rgba(229, 222, 0, 0.3)' : '0 4px 20px rgba(229, 222, 0, 0.08)', ...(plan.popular ? { background: 'var(--color-surface-alt)' } : {}) }}>
                            {plan.popular && (
                                <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#e5de00', color: '#1a1a1a', padding: '4px 16px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Most Popular</div>
                            )}
                            <h3 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{plan.name}</h3>
                            <div style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1, marginBottom: '1rem' }}>{plan.price} <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>{plan.period}</span></div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem' }}>
                                {plan.features.map((feat, j) => (
                                    <li key={j} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}><FaCheck style={{ color: darkMode ? '#e5de00' : 'var(--teal)', flexShrink: 0 }} /> {feat}</li>
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
                    <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: '1rem', color: 'var(--white)' }}>Ready to Transform Your Campaign?</h2>
                    <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 'clamp(1rem, 2vw, 1.125rem)', marginBottom: '2rem' }}>Join political organizations across Africa using Uchaguzi360 to run winning campaigns with confidence.</p>
                    <Link to="/login" className="btn" style={{ padding: '0.875rem 2rem', fontSize: '1.1rem', backgroundColor: 'var(--white)', color: 'var(--teal)', fontWeight: 700, boxShadow: 'var(--shadow-lg)' }}>Start Your Free Trial</Link>
                </div>
            </section>

            {/* FOOTER */}
            <footer style={{ padding: '2rem 1rem', borderTop: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <img src={logolight} alt="Uchaguzi360" style={{ height: '28px', width: 'auto' }} />
                        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Powered by <a href="https://wa.me/254722839617" target="_blank" rel="noopener noreferrer" style={{ color: '#e5de00', textDecoration: 'none', fontWeight: 600 }}>Opendesk</a></span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>&copy; 2026 Uchaguzi360. All Rights Reserved.</div>
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
