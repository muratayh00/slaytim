-- AlterTable
ALTER TABLE "conversion_jobs" ADD COLUMN "next_attempt_at" DATETIME;

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN "access_password_hash" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "topics_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_topics" ("category_id", "created_at", "deleted_at", "description", "id", "is_hidden", "likes_count", "slug", "title", "updated_at", "user_id", "views_count") SELECT "category_id", "created_at", "deleted_at", "description", "id", "is_hidden", "likes_count", "slug", "title", "updated_at", "user_id", "views_count" FROM "topics";
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

-- CreateIndex
CREATE INDEX "conversion_jobs_next_attempt_at_idx" ON "conversion_jobs"("next_attempt_at");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");
