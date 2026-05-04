-- Cold-start distribution system for Slideo feed
-- Adds three fields used to guarantee initial exposure for new content.

ALTER TABLE "slideos"
  ADD COLUMN "cold_start_boost"        DOUBLE PRECISION NOT NULL DEFAULT 50,
  ADD COLUMN "cold_start_impressions"  INTEGER          NOT NULL DEFAULT 0,
  ADD COLUMN "cold_start_active"       BOOLEAN          NOT NULL DEFAULT true;

-- Backfill: all slideos that existed BEFORE this migration have already been
-- served organically.  Mark them as graduated so they are not re-entered
-- into the cold-start pool.
UPDATE "slideos"
  SET "cold_start_active" = false,
      "cold_start_boost"  = 0;

-- Index for fast cold-start pool queries (active items, least-seen first).
CREATE INDEX "slideos_cold_start_active_impressions_idx"
  ON "slideos" ("cold_start_active", "cold_start_impressions");
