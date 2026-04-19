-- Add composite index on (preview_status, conversion_status) for fast preview ops queries.
-- Used by: admin preview-ops panel, backfill script, monitor cron.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slides_preview_conversion
  ON slides (preview_status, conversion_status)
  WHERE deleted_at IS NULL;

-- Index for finding stuck processing slides efficiently.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_slides_preview_processing_updated
  ON slides (updated_at)
  WHERE preview_status = 'processing' AND deleted_at IS NULL;
