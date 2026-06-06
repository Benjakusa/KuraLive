-- =====================================================
-- Uchaguzi360 - Full PostgreSQL Schema (Render.com ready)
-- Run this in your Render PostgreSQL shell / psql
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- UUIDv7 Generator for Hyperscale Index Clustering
-- =====================================================
CREATE OR REPLACE FUNCTION uuid_generate_v7()
RETURNS uuid
AS $$
DECLARE
  v_time timestamp with time zone := null;
  v_secs bigint := null;
  v_msec bigint := null;
  v_usec bigint := null;

  v_unix_t bigint := null;
  v_unix_m bigint := null;
  v_unix_b bytea := null;
  
  v_rand_a bytea := null;
  v_rand_b bytea := null;
  
  v_uuid bytea := null;
BEGIN
  v_time := clock_timestamp();
  v_secs := EXTRACT(EPOCH FROM v_time);
  v_msec := mod(EXTRACT(MILLISECONDS FROM v_time)::numeric, 1000::numeric);
  v_usec := mod(EXTRACT(MICROSECONDS FROM v_time)::numeric, 1000::numeric);

  v_unix_t := (v_secs * 1000) + v_msec;
  v_unix_b := convert_to(lpad(to_hex(v_unix_t), 12, '0'), 'utf8');
  v_unix_b := decode(convert_from(v_unix_b, 'utf8'), 'hex');

  v_rand_a := gen_random_bytes(2);
  v_rand_b := gen_random_bytes(8);

  -- time_hi_and_version
  v_rand_a := set_byte(v_rand_a, 0, (get_byte(v_rand_a, 0) & 15) | 112); -- version 7
  -- clock_seq_hi_and_reserved
  v_rand_b := set_byte(v_rand_b, 0, (get_byte(v_rand_b, 0) & 63) | 128); -- variant 10

  v_uuid := v_unix_b || v_rand_a || v_rand_b;

  RETURN encode(v_uuid, 'hex')::uuid;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- =====================================================
-- USERS (replaces Supabase profiles + auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
    details JSONB,
    manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STATIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
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
    id UUID DEFAULT uuid_generate_v7(),
    station_id UUID NOT NULL REFERENCES stations(id),
    agent_id UUID NOT NULL REFERENCES users(id),
    manager_id UUID REFERENCES users(id) ON DELETE CASCADE,
    station_name VARCHAR(150),
    agent_name VARCHAR(100),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    results_data JSONB NOT NULL,
    stats JSONB NOT NULL,
    proof_image TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Generate partitions for optimal query performance
CREATE TABLE IF NOT EXISTS results_y2025_q3 PARTITION OF results FOR VALUES FROM ('2025-07-01') TO ('2025-10-01');
CREATE TABLE IF NOT EXISTS results_y2025_q4 PARTITION OF results FOR VALUES FROM ('2025-10-01') TO ('2026-01-01');
CREATE TABLE IF NOT EXISTS results_y2026_q1 PARTITION OF results FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
CREATE TABLE IF NOT EXISTS results_y2026_q2 PARTITION OF results FOR VALUES FROM ('2026-04-01') TO ('2026-07-01');
CREATE TABLE IF NOT EXISTS results_y2026_q3 PARTITION OF results FOR VALUES FROM ('2026-07-01') TO ('2026-10-01');
CREATE TABLE IF NOT EXISTS results_y2026_q4 PARTITION OF results FOR VALUES FROM ('2026-10-01') TO ('2027-01-01');

-- =====================================================
-- SUBSCRIPTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
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
    id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
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

-- 10/10 Scalability Composite Indexes
CREATE INDEX IF NOT EXISTS idx_stations_manager_id_id ON stations(manager_id, id);
CREATE INDEX IF NOT EXISTS idx_users_manager_id_id_agent ON users(manager_id, id) WHERE role = 'agent';
CREATE INDEX IF NOT EXISTS idx_results_manager_ts ON results(manager_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_manager ON sms_campaigns(manager_id, created_at DESC);

-- =====================================================
-- PASSWORD RESET TOKENS (separate from auth sessions)
-- =====================================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);

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
--     uuid_generate_v7(),
--     'admin@uchaguzi360.com',
--     'pbkdf2:sha256:600000$...',  -- Replace with generated hash
--     'Admin',
--     'admin',
--     '1234',
--     false
-- );
