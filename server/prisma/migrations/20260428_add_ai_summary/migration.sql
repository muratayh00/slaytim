-- AI summary / BLUF: machine-readable 4-section summary per slide.
-- Generated post-conversion (and via backfill script for existing slides) by
-- aiSummary.service.js → stored as JSONB so the schema stays flexible.
ALTER TABLE slides ADD COLUMN IF NOT EXISTS ai_summary JSONB;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS ai_summary_generated_at TIMESTAMPTZ;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS ai_summary_status TEXT;
-- ai_summary_status values: NULL (not requested) | 'queued' | 'processing' |
-- 'done' | 'failed' | 'skipped' (e.g. unsupported file, no text extracted).

-- Partial index lets the backfill script efficiently find slides that still
-- need a summary without scanning the whole table.
CREATE INDEX IF NOT EXISTS slides_ai_summary_pending_idx
  ON slides (id)
  WHERE ai_summary IS NULL AND conversion_status = 'done';
