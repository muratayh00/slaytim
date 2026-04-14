/*
  Warnings:

  - You are about to alter the column `hidden_at` on the `slideos` table. The data in that column could be lost. The data in that column will be cast from `Unsupported("timestamp(3)")` to `DateTime`.

*/
-- CreateTable
CREATE TABLE "slideo_series" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slideo_series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "slideo_completions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "completed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slideo_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideo_completions_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "slideo_shares" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slideo_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideo_shares_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "admin_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" INTEGER,
    "meta" TEXT,
    "ip" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_reports" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "note" TEXT,
    "resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_reports" ("created_at", "details", "id", "reason", "status", "target_id", "target_type", "user_id") SELECT "created_at", "details", "id", "reason", "status", "target_id", "target_type", "user_id" FROM "reports";
DROP TABLE "reports";
ALTER TABLE "new_reports" RENAME TO "reports";
CREATE INDEX "reports_status_idx" ON "reports"("status");
CREATE INDEX "reports_priority_idx" ON "reports"("priority");
CREATE TABLE "new_slideos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "page_indices" TEXT NOT NULL,
    "cover_page" INTEGER NOT NULL DEFAULT 1,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "saves_count" INTEGER NOT NULL DEFAULT 0,
    "share_count" INTEGER NOT NULL DEFAULT 0,
    "series_id" INTEGER,
    "series_order" INTEGER,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "hidden_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slideos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideos_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideos_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "slideo_series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_slideos" ("cover_page", "created_at", "description", "hidden_at", "id", "is_hidden", "likes_count", "page_indices", "saves_count", "slide_id", "title", "user_id", "views_count") SELECT "cover_page", "created_at", "description", "hidden_at", "id", "is_hidden", "likes_count", "page_indices", "saves_count", "slide_id", "title", "user_id", "views_count" FROM "slideos";
DROP TABLE "slideos";
ALTER TABLE "new_slideos" RENAME TO "slideos";
CREATE INDEX "slideos_user_id_idx" ON "slideos"("user_id");
CREATE INDEX "slideos_created_at_idx" ON "slideos"("created_at");
CREATE INDEX "slideos_is_hidden_idx" ON "slideos"("is_hidden");
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
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "slides_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_slides" ("conversion_status", "created_at", "description", "file_url", "id", "likes_count", "pdf_url", "saves_count", "thumbnail_url", "title", "topic_id", "user_id", "views_count") SELECT "conversion_status", "created_at", "description", "file_url", "id", "likes_count", "pdf_url", "saves_count", "thumbnail_url", "title", "topic_id", "user_id", "views_count" FROM "slides";
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
    CONSTRAINT "topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_topics" ("category_id", "created_at", "description", "id", "likes_count", "title", "user_id", "views_count") SELECT "category_id", "created_at", "description", "id", "likes_count", "title", "user_id", "views_count" FROM "topics";
DROP TABLE "topics";
ALTER TABLE "new_topics" RENAME TO "topics";
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");
CREATE INDEX "topics_user_id_idx" ON "topics"("user_id");
CREATE INDEX "topics_category_id_idx" ON "topics"("category_id");
CREATE INDEX "topics_views_count_idx" ON "topics"("views_count");
CREATE INDEX "topics_is_hidden_idx" ON "topics"("is_hidden");
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("avatar_url", "bio", "created_at", "email", "id", "is_admin", "is_banned", "is_muted", "password_hash", "username") SELECT "avatar_url", "bio", "created_at", "email", "id", "is_admin", "is_banned", "is_muted", "password_hash", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "slideo_series_user_id_idx" ON "slideo_series"("user_id");

-- CreateIndex
CREATE INDEX "slideo_completions_completed_at_idx" ON "slideo_completions"("completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_completions_user_id_slideo_id_key" ON "slideo_completions"("user_id", "slideo_id");

-- CreateIndex
CREATE INDEX "slideo_shares_created_at_idx" ON "slideo_shares"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_shares_user_id_slideo_id_key" ON "slideo_shares"("user_id", "slideo_id");

-- CreateIndex
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_logs_action_idx" ON "admin_logs"("action");

-- CreateIndex
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs"("created_at");
