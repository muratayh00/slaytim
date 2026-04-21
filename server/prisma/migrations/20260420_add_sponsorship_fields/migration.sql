ALTER TABLE "topics"
  ADD COLUMN "is_sponsored" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sponsor_name" TEXT,
  ADD COLUMN "sponsor_url" TEXT,
  ADD COLUMN "sponsor_disclosure" TEXT,
  ADD COLUMN "sponsor_campaign_id" TEXT,
  ADD COLUMN "sponsored_from" TIMESTAMP(3),
  ADD COLUMN "sponsored_to" TIMESTAMP(3);

ALTER TABLE "slides"
  ADD COLUMN "is_sponsored" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "sponsor_name" TEXT,
  ADD COLUMN "sponsor_url" TEXT,
  ADD COLUMN "sponsor_disclosure" TEXT,
  ADD COLUMN "sponsor_campaign_id" TEXT,
  ADD COLUMN "sponsored_from" TIMESTAMP(3),
  ADD COLUMN "sponsored_to" TIMESTAMP(3);

CREATE INDEX "topics_is_sponsored_idx" ON "topics"("is_sponsored");
CREATE INDEX "slides_is_sponsored_idx" ON "slides"("is_sponsored");
