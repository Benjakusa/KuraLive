-- =====================================================
-- Uchaguzi360 - Module Extensions Migration (UUID)
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- MODULE 1: SMS CAMPAIGNS
-- =====================================================
CREATE TABLE IF NOT EXISTS sms_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    recipient_count INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed')),
    recipient_numbers JSONB DEFAULT '[]',
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MODULE 2: CAMPAIGN PLANNER
-- =====================================================
CREATE TABLE IF NOT EXISTS campaign_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    type VARCHAR(20) DEFAULT 'other' CHECK (type IN ('rally', 'canvassing', 'media', 'meeting', 'other')),
    location VARCHAR(300),
    start_datetime TIMESTAMPTZ NOT NULL,
    end_datetime TIMESTAMPTZ NOT NULL,
    budget NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    assignees JSONB DEFAULT '[]',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES campaign_events(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignee_name VARCHAR(100),
    due_date DATE,
    status VARCHAR(20) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MODULE 3: SOCIAL MEDIA MANAGEMENT
-- =====================================================
CREATE TABLE IF NOT EXISTS social_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('facebook', 'twitter', 'instagram', 'tiktok')),
    handle VARCHAR(200),
    page_id VARCHAR(200),
    follower_count INTEGER DEFAULT 0,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    last_sync TIMESTAMPTZ,
    connected BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, platform)
);

CREATE TABLE IF NOT EXISTS scheduled_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platforms JSONB DEFAULT '[]',
    content_text TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]',
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'posted', 'failed')),
    posted_at TIMESTAMPTZ,
    post_ids JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,
    date DATE NOT NULL,
    followers INTEGER DEFAULT 0,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    sentiment_score NUMERIC(4, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, platform, date)
);

CREATE TABLE IF NOT EXISTS social_mentions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,
    keyword VARCHAR(200),
    text TEXT,
    author VARCHAR(200),
    sentiment VARCHAR(20) DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    mention_at TIMESTAMPTZ DEFAULT NOW(),
    raw JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS social_keywords (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    keyword VARCHAR(200) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(manager_id, keyword)
);

CREATE TABLE IF NOT EXISTS social_competitors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform VARCHAR(30) NOT NULL,
    handle VARCHAR(200) NOT NULL,
    follower_count INTEGER DEFAULT 0,
    engagement_rate NUMERIC(6, 3) DEFAULT 0,
    posts_last_30d INTEGER DEFAULT 0,
    last_checked TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MODULE 4: OPINION POLLS
-- =====================================================
CREATE TABLE IF NOT EXISTS polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    election_id UUID REFERENCES elections(id) ON DELETE SET NULL,
    title VARCHAR(300) NOT NULL,
    description TEXT,
    questions JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    share_token VARCHAR(64) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{"allow_unregistered": true, "require_location": false, "max_location_level": "national"}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    session_hash VARCHAR(64) NOT NULL,
    answers JSONB NOT NULL DEFAULT '{}',
    voter_status VARCHAR(20) DEFAULT 'unregistered' CHECK (voter_status IN ('registered', 'unregistered')),
    location JSONB DEFAULT '{}',
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(poll_id, session_hash)
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_sms_campaigns_manager ON sms_campaigns(manager_id);
CREATE INDEX IF NOT EXISTS idx_campaign_events_manager ON campaign_events(manager_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tasks_manager ON campaign_tasks(manager_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tasks_event ON campaign_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_social_accounts_manager ON social_accounts(manager_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_posts_manager ON scheduled_posts(manager_id);
CREATE INDEX IF NOT EXISTS idx_social_metrics_manager_date ON social_metrics(manager_id, date);
CREATE INDEX IF NOT EXISTS idx_social_mentions_manager ON social_mentions(manager_id);
CREATE INDEX IF NOT EXISTS idx_polls_manager ON polls(manager_id);
CREATE INDEX IF NOT EXISTS idx_polls_share_token ON polls(share_token);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
