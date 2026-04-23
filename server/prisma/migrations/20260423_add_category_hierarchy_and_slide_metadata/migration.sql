-- Category hierarchy + slide metadata foundations
ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "parent_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "is_main" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "topics"
  ADD COLUMN IF NOT EXISTS "subcategory_id" INTEGER;

CREATE TABLE IF NOT EXISTS "tags" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "usage_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "tags_name_key" ON "tags"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "tags_slug_key" ON "tags"("slug");
CREATE INDEX IF NOT EXISTS "tags_usage_count_idx" ON "tags"("usage_count");

CREATE TABLE IF NOT EXISTS "slide_tags" (
  "id" SERIAL PRIMARY KEY,
  "slide_id" INTEGER NOT NULL,
  "tag_id" INTEGER NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'user',
  "confidence" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "slide_tags_slide_id_tag_id_key" ON "slide_tags"("slide_id", "tag_id");
CREATE INDEX IF NOT EXISTS "slide_tags_tag_id_idx" ON "slide_tags"("tag_id");
CREATE INDEX IF NOT EXISTS "slide_tags_slide_id_source_idx" ON "slide_tags"("slide_id", "source");

CREATE TABLE IF NOT EXISTS "slide_seo_meta" (
  "id" SERIAL PRIMARY KEY,
  "slide_id" INTEGER NOT NULL,
  "seo_title" TEXT,
  "seo_description" TEXT,
  "keyword_summary" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3)
);

CREATE UNIQUE INDEX IF NOT EXISTS "slide_seo_meta_slide_id_key" ON "slide_seo_meta"("slide_id");

ALTER TABLE "categories"
  DROP CONSTRAINT IF EXISTS "categories_parent_id_fkey",
  ADD CONSTRAINT "categories_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "topics"
  DROP CONSTRAINT IF EXISTS "topics_subcategory_id_fkey",
  ADD CONSTRAINT "topics_subcategory_id_fkey"
    FOREIGN KEY ("subcategory_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "slide_tags"
  DROP CONSTRAINT IF EXISTS "slide_tags_slide_id_fkey",
  ADD CONSTRAINT "slide_tags_slide_id_fkey"
    FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slide_tags"
  DROP CONSTRAINT IF EXISTS "slide_tags_tag_id_fkey",
  ADD CONSTRAINT "slide_tags_tag_id_fkey"
    FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "slide_seo_meta"
  DROP CONSTRAINT IF EXISTS "slide_seo_meta_slide_id_fkey",
  ADD CONSTRAINT "slide_seo_meta_slide_id_fkey"
    FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "categories_parent_id_idx" ON "categories"("parent_id");
CREATE INDEX IF NOT EXISTS "categories_is_main_is_active_sort_order_idx" ON "categories"("is_main", "is_active", "sort_order");
CREATE INDEX IF NOT EXISTS "topics_subcategory_id_idx" ON "topics"("subcategory_id");
