-- Production Optimization & Data Integrity Migrations

-- 1. Accelerate session validations
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_expires 
ON user_sessions (token, expires_at);

-- 2. Ensure deterministic bulk SMS contacts
CREATE INDEX IF NOT EXISTS idx_sms_contacts_manager_group 
ON sms_contacts (manager_id, group_label);

-- 3. Strictly disallow duplicate voting sessions per poll
ALTER TABLE poll_votes 
ADD CONSTRAINT uniq_poll_session UNIQUE (poll_id, session_hash);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id_session_hash 
ON poll_votes (poll_id, session_hash);

-- 4. Guard critical ENUM/Status columns
ALTER TABLE users 
ADD CONSTRAINT check_user_role 
CHECK (role IN ('superadmin', 'admin', 'manager', 'agent'));

ALTER TABLE users 
ADD CONSTRAINT check_user_status 
CHECK (status IN ('Active', 'Suspended', 'Pending', 'Inactive'));

ALTER TABLE subscriptions
ADD CONSTRAINT check_subscription_plan
CHECK (plan IN ('free', 'basic', 'premium', 'enterprise'));

ALTER TABLE subscriptions
ADD CONSTRAINT check_subscription_status
CHECK (status IN ('trial', 'active', 'expired', 'suspended'));
