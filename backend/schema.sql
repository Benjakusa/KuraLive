-- =====================================================
-- KuraLive - Full PostgreSQL Schema (Render.com ready)
-- Run this in your Render PostgreSQL shell / psql
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS (replaces Supabase profiles + auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'agent',
    status VARCHAR(20) DEFAULT 'Active',
    station_id UUID,
    permissions VARCHAR(20) DEFAULT 'edit',
    submission_status VARCHAR(20) DEFAULT 'Pending',
    manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
    admin_secret VARCHAR(10),
    force_password_reset BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USER SESSIONS (replaces Supabase auth sessions)
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
    token VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- =====================================================
-- ELECTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS elections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    details JSONB,
    manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(150) NOT NULL,
    county VARCHAR(100),
    constituency VARCHAR(100),
    ward VARCHAR(100),
    code VARCHAR(50),
    registered_voters INTEGER DEFAULT 0,
    location VARCHAR(150),
    agent_id UUID REFERENCES users(id),
    manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RESULTS
-- =====================================================
CREATE TABLE IF NOT EXISTS results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id UUID NOT NULL REFERENCES stations(id),
    agent_id UUID NOT NULL REFERENCES users(id),
    manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
    station_name VARCHAR(150),
    agent_name VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    results_data JSONB NOT NULL,
    stats JSONB NOT NULL,
    proof_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(20) NOT NULL DEFAULT 'free',
    status VARCHAR(20) NOT NULL DEFAULT 'trial',
    trial_started_at TIMESTAMPTZ DEFAULT NOW(),
    trial_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    pending_payment BOOLEAN DEFAULT FALSE,
    pending_plan VARCHAR(20),
    checkout_request_id VARCHAR(255),
    payment_phone VARCHAR(20),
    payment_confirmed BOOLEAN DEFAULT FALSE,
    mpesa_receipt VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PAYMENT HISTORY
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    plan VARCHAR(20),
    payment_method VARCHAR(50) DEFAULT 'M-Pesa',
    mpesa_receipt VARCHAR(255),
    phone VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_stations_agent_id ON stations(agent_id);
CREATE INDEX IF NOT EXISTS idx_stations_manager_id ON stations(manager_id);
CREATE INDEX IF NOT EXISTS idx_results_station_id ON results(station_id);
CREATE INDEX IF NOT EXISTS idx_results_agent_id ON results(agent_id);
CREATE INDEX IF NOT EXISTS idx_results_manager_id ON results(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_elections_manager_id ON elections(manager_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_manager_id ON subscriptions(manager_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_manager_id ON payment_history(manager_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- =====================================================
-- AUTO-UPDATE updated_at TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED ADMIN USER (password: admin123)
-- Run AFTER creating the tables
-- =====================================================
-- INSERT INTO users (id, email, password_hash, name, role, admin_secret, force_password_reset)
-- VALUES (
--     uuid_generate_v4(),
--     'admin@kuralive.com',
--     'pbkdf2:sha256:600000$...',  -- Replace with generated hash
--     'Admin',
--     'admin',
--     '1234',
--     false
-- );
