-- CreateTable
CREATE TABLE "slideo_feed_assignments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject_key" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "slideo_feed_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subject_key" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "page" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "event_type" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slideo_feed_events_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "slideo_feed_assignments_subject_key_key" ON "slideo_feed_assignments"("subject_key");

-- CreateIndex
CREATE INDEX "slideo_feed_assignments_variant_idx" ON "slideo_feed_assignments"("variant");

-- CreateIndex
CREATE INDEX "slideo_feed_events_subject_key_created_at_idx" ON "slideo_feed_events"("subject_key", "created_at");

-- CreateIndex
CREATE INDEX "slideo_feed_events_variant_event_type_created_at_idx" ON "slideo_feed_events"("variant", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "slideo_feed_events_slideo_id_created_at_idx" ON "slideo_feed_events"("slideo_id", "created_at");

