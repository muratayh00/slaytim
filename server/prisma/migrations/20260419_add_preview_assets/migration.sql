-- Migration: Add image preview asset support to slides
-- Adds previewStatus lifecycle tracking and per-page WebP image asset table

-- Add preview tracking columns to slides
ALTER TABLE slides ADD COLUMN IF NOT EXISTS preview_status TEXT NOT NULL DEFAULT 'none';
ALTER TABLE slides ADD COLUMN IF NOT EXISTS preview_page_count INTEGER;
ALTER TABLE slides ADD COLUMN IF NOT EXISTS preview_generated_at TIMESTAMP;

-- Per-page image asset records (one row per page per slide)
CREATE TABLE IF NOT EXISTS slide_preview_assets (
  id              SERIAL PRIMARY KEY,
  slide_id        INTEGER NOT NULL REFERENCES slides(id) ON DELETE CASCADE,
  page_number     INTEGER NOT NULL,
  url             TEXT NOT NULL,
  width           INTEGER NOT NULL,
  height          INTEGER NOT NULL,
  file_size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (slide_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_slide_preview_assets_slide_id ON slide_preview_assets(slide_id);
