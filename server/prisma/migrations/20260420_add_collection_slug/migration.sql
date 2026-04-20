-- Add slug column to collections table
ALTER TABLE collections ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- Backfill: give every existing collection a stable 'col-{id}' slug
-- so the unique constraint can be applied without conflicts.
UPDATE collections SET slug = CONCAT('col-', CAST(id AS TEXT)) WHERE slug IS NULL;

-- Enforce uniqueness
ALTER TABLE collections ADD CONSTRAINT collections_slug_key UNIQUE (slug);
