-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_slides" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "topic_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "file_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "pdf_url" TEXT,
    "conversion_status" TEXT NOT NULL DEFAULT 'pending',
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "saves_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "downloads_count" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "slides_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_slides" ("conversion_status", "created_at", "deleted_at", "description", "file_url", "id", "is_hidden", "likes_count", "pdf_url", "saves_count", "slug", "thumbnail_url", "title", "topic_id", "updated_at", "user_id", "views_count") SELECT "conversion_status", "created_at", "deleted_at", "description", "file_url", "id", "is_hidden", "likes_count", "pdf_url", "saves_count", "slug", "thumbnail_url", "title", "topic_id", "updated_at", "user_id", "views_count" FROM "slides";
DROP TABLE "slides";
ALTER TABLE "new_slides" RENAME TO "slides";
CREATE UNIQUE INDEX "slides_slug_key" ON "slides"("slug");
CREATE INDEX "slides_user_id_idx" ON "slides"("user_id");
CREATE INDEX "slides_topic_id_idx" ON "slides"("topic_id");
CREATE INDEX "slides_likes_count_idx" ON "slides"("likes_count");
CREATE INDEX "slides_is_hidden_idx" ON "slides"("is_hidden");
CREATE TABLE "new_topics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "pinned_slide_id" INTEGER,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "topics_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "topics_pinned_slide_id_fkey" FOREIGN KEY ("pinned_slide_id") REFERENCES "slides" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_topics" ("category_id", "created_at", "deleted_at", "description", "id", "is_hidden", "likes_count", "room_id", "slug", "title", "updated_at", "user_id", "views_count") SELECT "category_id", "created_at", "deleted_at", "description", "id", "is_hidden", "likes_count", "room_id", "slug", "title", "updated_at", "user_id", "views_count" FROM "topics";
DROP TABLE "topics";
ALTER TABLE "new_topics" RENAME TO "topics";
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");
CREATE INDEX "topics_user_id_idx" ON "topics"("user_id");
CREATE INDEX "topics_category_id_idx" ON "topics"("category_id");
CREATE INDEX "topics_room_id_idx" ON "topics"("room_id");
CREATE INDEX "topics_views_count_idx" ON "topics"("views_count");
CREATE INDEX "topics_is_hidden_idx" ON "topics"("is_hidden");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
