-- =====================================================
-- Uchaguzi360 - Production Migration
-- Additional indexes, constraints, and audit logging
-- =====================================================

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_contacts_manager ON sms_contacts(manager_id);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_phone ON sms_contacts(phone);
CREATE INDEX IF NOT EXISTS idx_sms_contacts_group ON sms_contacts(group_label);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_session ON poll_votes(poll_id, session_hash);
CREATE INDEX IF NOT EXISTS idx_results_timestamp ON results(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_lookup ON user_sessions(expires_at, token);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Unique constraint for station names per manager
CREATE UNIQUE INDEX IF NOT EXISTS idx_stations_name_manager ON stations(name, manager_id) WHERE name IS NOT NULL;

-- Audit logging table
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(64),
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
