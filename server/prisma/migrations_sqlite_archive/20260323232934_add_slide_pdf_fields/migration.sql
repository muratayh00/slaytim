-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_slides" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topic_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "pdf_url" TEXT,
    "conversion_status" TEXT NOT NULL DEFAULT 'pending',
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "saves_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slides_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_slides" ("created_at", "description", "file_url", "id", "likes_count", "saves_count", "thumbnail_url", "title", "topic_id", "user_id", "views_count") SELECT "created_at", "description", "file_url", "id", "likes_count", "saves_count", "thumbnail_url", "title", "topic_id", "user_id", "views_count" FROM "slides";
DROP TABLE "slides";
ALTER TABLE "new_slides" RENAME TO "slides";
CREATE INDEX "slides_user_id_idx" ON "slides"("user_id");
CREATE INDEX "slides_topic_id_idx" ON "slides"("topic_id");
CREATE INDEX "slides_likes_count_idx" ON "slides"("likes_count");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
