-- CreateTable
CREATE TABLE "slideo_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "page_count" INTEGER,
    "published_slideo_id" INTEGER,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "slideo_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideo_sessions_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideo_sessions_published_slideo_id_fkey" FOREIGN KEY ("published_slideo_id") REFERENCES "slideos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "slideo_sessions_user_id_created_at_idx" ON "slideo_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "slideo_sessions_status_idx" ON "slideo_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_sessions_slide_id_key" ON "slideo_sessions"("slide_id");
