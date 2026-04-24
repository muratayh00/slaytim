-- Feed & tag-profile foundation (idempotent-safe DDL for production rollout)

-- tags: SEO/indexability signals
ALTER TABLE "tags"
  ADD COLUMN IF NOT EXISTS "is_indexable" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "quality_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_90d_activity" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "min_index_threshold" INTEGER NOT NULL DEFAULT 5;

CREATE TABLE IF NOT EXISTS "user_tag_profiles" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "tag_id" INTEGER NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "affinity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_tag_profiles_user_id_tag_id_key"
  ON "user_tag_profiles"("user_id","tag_id");
CREATE INDEX IF NOT EXISTS "user_tag_profiles_user_id_affinity_desc_idx"
  ON "user_tag_profiles"("user_id","affinity" DESC);
CREATE INDEX IF NOT EXISTS "user_tag_profiles_tag_id_idx"
  ON "user_tag_profiles"("tag_id");

CREATE TABLE IF NOT EXISTS "content_tag_profiles" (
  "id" SERIAL PRIMARY KEY,
  "content_type" TEXT NOT NULL,
  "content_id" INTEGER NOT NULL,
  "tag_id" INTEGER NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "source" TEXT NOT NULL DEFAULT 'manual',
  "quality" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "content_tag_profiles_content_type_content_id_tag_id_key"
  ON "content_tag_profiles"("content_type","content_id","tag_id");
CREATE INDEX IF NOT EXISTS "content_tag_profiles_tag_id_quality_desc_idx"
  ON "content_tag_profiles"("tag_id","quality" DESC);
CREATE INDEX IF NOT EXISTS "content_tag_profiles_content_type_content_id_idx"
  ON "content_tag_profiles"("content_type","content_id");

CREATE TABLE IF NOT EXISTS "user_content_events" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "session_id" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "content_id" INTEGER NOT NULL,
  "page_index" INTEGER NULL,
  "event_type" TEXT NOT NULL,
  "watch_ms" INTEGER NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "user_content_events_content_type_content_id_created_at_idx"
  ON "user_content_events"("content_type","content_id","created_at");
CREATE INDEX IF NOT EXISTS "user_content_events_user_id_created_at_idx"
  ON "user_content_events"("user_id","created_at");
CREATE INDEX IF NOT EXISTS "user_content_events_session_id_created_at_idx"
  ON "user_content_events"("session_id","created_at");

CREATE TABLE IF NOT EXISTS "tag_daily_stats" (
  "id" SERIAL PRIMARY KEY,
  "tag_id" INTEGER NOT NULL REFERENCES "tags"("id") ON DELETE CASCADE,
  "date" TIMESTAMP(3) NOT NULL,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "watches" INTEGER NOT NULL DEFAULT 0,
  "completions" INTEGER NOT NULL DEFAULT 0,
  "saves" INTEGER NOT NULL DEFAULT 0,
  "shares" INTEGER NOT NULL DEFAULT 0,
  "skips_fast" INTEGER NOT NULL DEFAULT 0,
  "reports" INTEGER NOT NULL DEFAULT 0,
  "avg_watch_ms" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "tag_daily_stats_tag_id_date_key"
  ON "tag_daily_stats"("tag_id","date");
CREATE INDEX IF NOT EXISTS "tag_daily_stats_date_idx"
  ON "tag_daily_stats"("date");

CREATE TABLE IF NOT EXISTS "feed_impression_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NULL REFERENCES "users"("id") ON DELETE SET NULL,
  "session_id" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "content_id" INTEGER NOT NULL,
  "rank" INTEGER NOT NULL,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "feed_impression_logs_user_id_created_at_idx"
  ON "feed_impression_logs"("user_id","created_at");
CREATE INDEX IF NOT EXISTS "feed_impression_logs_content_type_content_id_created_at_idx"
  ON "feed_impression_logs"("content_type","content_id","created_at");
