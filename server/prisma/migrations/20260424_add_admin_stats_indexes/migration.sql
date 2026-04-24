-- Add missing indexes for admin stats and home page endpoint performance.
-- These queries were doing full table scans causing >10s timeouts.

-- User: createdAt ranges (new users today/week/month) + banned/muted counts
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_created_at_idx" ON "users"("created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_is_banned_idx" ON "users"("is_banned");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_is_muted_idx" ON "users"("is_muted");

-- Topic: createdAt range (new topics today)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "topics_created_at_idx" ON "topics"("created_at");

-- Slide: createdAt range (new slides today) + conversionStatus filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS "slides_created_at_idx" ON "slides"("created_at");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "slides_conversion_status_idx" ON "slides"("conversion_status");

-- Comment: createdAt range (new comments today)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "comments_created_at_idx" ON "comments"("created_at");

-- Report: composite index for status+priority query
CREATE INDEX CONCURRENTLY IF NOT EXISTS "reports_status_priority_idx" ON "reports"("status", "priority");

-- SlideoFeedEvent: createdAt filter for groupBy experiment stats
CREATE INDEX CONCURRENTLY IF NOT EXISTS "slideo_feed_events_created_at_idx" ON "slideo_feed_events"("created_at");

-- Slide: savesCount for popular slides ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS "slides_saves_count_idx" ON "slides"("saves_count");
