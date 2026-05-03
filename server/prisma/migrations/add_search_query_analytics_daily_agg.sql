-- Migration: add search_queries + analytics_daily_agg
-- Run on the production server:
--   cd server && npx prisma migrate dev --name add_search_query_analytics_daily_agg
-- OR apply this SQL directly via psql / Supabase SQL editor.

-- ── search_queries ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "search_queries" (
  "id"           SERIAL       PRIMARY KEY,
  "query"        VARCHAR(500) NOT NULL,
  "query_norm"   VARCHAR(500),
  "user_id"      INTEGER,
  "session_id"   VARCHAR(128),
  "result_count" INTEGER      NOT NULL DEFAULT 0,
  "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "search_queries_created_at_idx"  ON "search_queries" ("created_at");
CREATE INDEX IF NOT EXISTS "search_queries_query_idx"       ON "search_queries" ("query");
CREATE INDEX IF NOT EXISTS "search_queries_query_norm_idx"  ON "search_queries" ("query_norm");

-- ── analytics_daily_agg ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "analytics_daily_agg" (
  "id"         SERIAL       PRIMARY KEY,
  "date"       DATE         NOT NULL,
  "metric"     VARCHAR(100) NOT NULL,
  "value"      INTEGER      NOT NULL DEFAULT 0,
  "metadata"   JSONB,
  "updated_at" TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE ("date", "metric")
);

CREATE INDEX IF NOT EXISTS "analytics_daily_agg_date_idx" ON "analytics_daily_agg" ("date");
