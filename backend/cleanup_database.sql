-- =====================================================
-- Uchaguzi360 / KuraLive — Full Database Cleanup
-- =====================================================
-- PURPOSE  : Delete all application data and reset sequences
--            while PRESERVING any user with role = 'admin'.
-- SAFE     : Wrapped in a transaction — ROLLBACK if anything fails.
-- NO DROPS : No tables, columns, indexes, or constraints are touched.
-- HOW TO   : Run in the Supabase SQL Editor (or psql) as a superuser.
-- REVIEW   : Read the "WHAT IS PRESERVED / DELETED" section below
--            before executing.
-- =====================================================

-- =====================================================
-- WHAT IS PRESERVED
-- =====================================================
-- • users        → rows where role = 'admin'
-- • user_sessions→ sessions that BELONG to a preserved admin
--
-- =====================================================
-- WHAT IS DELETED (in dependency order)
-- =====================================================
-- Leaf / child tables (no children depending on them):
--   1.  poll_votes           — individual poll submissions
--   2.  social_mentions      — scraped social-media mentions
--   3.  social_metrics       — daily social metric snapshots
--   4.  scheduled_posts      — queued/posted social posts
--   5.  social_keywords      — monitored keywords per manager
--   6.  social_competitors   — tracked competitor accounts
--   7.  social_accounts      — connected social-media accounts
--   8.  campaign_tasks       — tasks attached to events
--   9.  campaign_events      — rally/meeting/campaign events
--  10.  sms_templates        — reusable SMS message templates
--  11.  sms_campaigns        — sent / scheduled SMS campaigns
--  12.  polls                — opinion-poll definitions
--  13.  results              — election results submitted by agents
--  14.  stations             — polling stations
--  15.  elections            — election configurations
--  16.  subscriptions        — manager subscription records
--  17.  payment_history      — M-Pesa payment records
-- Mid-level:
--  18.  user_sessions        — non-admin active sessions
-- Root:
--  19.  users (non-admin)    — agents, managers, all non-admin roles
-- =====================================================

BEGIN;

-- ───────────────────────────────────────────────────
-- STEP 1: Temporarily capture admin IDs so we can
--         keep their sessions while clearing everything else.
-- ───────────────────────────────────────────────────
CREATE TEMP TABLE _admin_ids AS
    SELECT id FROM users WHERE role = 'admin';

-- ───────────────────────────────────────────────────
-- STEP 2: Delete LEAF tables — nothing references them.
-- ───────────────────────────────────────────────────

-- 1. poll_votes — child of polls
DELETE FROM poll_votes;

-- 2. social_mentions — standalone per manager
DELETE FROM social_mentions;

-- 3. social_metrics — daily snapshots, standalone per manager
DELETE FROM social_metrics;

-- 4. scheduled_posts — standalone per manager
DELETE FROM scheduled_posts;

-- 5. social_keywords — standalone per manager
DELETE FROM social_keywords;

-- 6. social_competitors — standalone per manager
DELETE FROM social_competitors;

-- 7. social_accounts — standalone per manager
DELETE FROM social_accounts;

-- 8. campaign_tasks — child of campaign_events (via ON DELETE SET NULL)
--    Delete fully; event_id will be gone once events are deleted.
DELETE FROM campaign_tasks;

-- 9. campaign_events — standalone per manager
DELETE FROM campaign_events;

-- 10. sms_templates — standalone per manager
DELETE FROM sms_templates;

-- 11. sms_campaigns — standalone per manager
DELETE FROM sms_campaigns;

-- 12. polls (and poll_votes already gone)
DELETE FROM polls;

-- 13. results — child of stations + users; delete before stations
DELETE FROM results;

-- 14. stations — child of users (agent_id, manager_id)
DELETE FROM stations;

-- 15. elections — child of users (manager_id)
DELETE FROM elections;

-- 16. subscriptions — child of users (manager_id)
DELETE FROM subscriptions;

-- 17. payment_history — child of users (manager_id)
DELETE FROM payment_history;

-- ───────────────────────────────────────────────────
-- STEP 3: Clean up sessions — keep admin sessions, drop the rest.
-- ───────────────────────────────────────────────────

-- 18. user_sessions — keep only sessions belonging to an admin
DELETE FROM user_sessions
WHERE user_id NOT IN (SELECT id FROM _admin_ids);

-- ───────────────────────────────────────────────────
-- STEP 4: Delete all non-admin users.
-- ───────────────────────────────────────────────────

-- 19. users — keep role = 'admin', remove everyone else
DELETE FROM users
WHERE role <> 'admin';

-- ───────────────────────────────────────────────────
-- STEP 5: Reset all UUID-based sequences.
-- PostgreSQL UUID primary keys (uuid_generate_v4()) have no
-- sequence to reset — UUIDs are generated independently.
-- However, if you ever added any SERIAL / BIGSERIAL columns,
-- the block below will reset them.  It is safe to run even
-- when no serial sequences exist.
-- ───────────────────────────────────────────────────
DO $$
DECLARE
    seq RECORD;
BEGIN
    FOR seq IN
        SELECT sequence_schema, sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public'
    LOOP
        EXECUTE format(
            'ALTER SEQUENCE %I.%I RESTART WITH 1',
            seq.sequence_schema,
            seq.sequence_name
        );
    END LOOP;
END;
$$;

-- ───────────────────────────────────────────────────
-- STEP 6: Clean up the temp table.
-- ───────────────────────────────────────────────────
DROP TABLE _admin_ids;

-- ───────────────────────────────────────────────────
-- STEP 7: Quick sanity-check — shows what is preserved.
--         Review the output before committing.
-- ───────────────────────────────────────────────────
SELECT
    'ADMIN USERS PRESERVED' AS check_label,
    id,
    email,
    name,
    role,
    status
FROM users
WHERE role = 'admin';

-- Commit only if everything above succeeded.
COMMIT;

-- =====================================================
-- END OF CLEANUP SCRIPT
-- HOW TO ROLLBACK: Replace COMMIT with ROLLBACK above
--                  or run:  ROLLBACK;
--                  before the connection closes.
-- =====================================================
