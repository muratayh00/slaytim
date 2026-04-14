-- CreateTable
CREATE TABLE "slideos" (
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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slideos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideos_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "slideo_likes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slideo_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideo_likes_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "slideo_saves" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "slideo_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "slideo_saves_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "slideos_user_id_idx" ON "slideos"("user_id");

-- CreateIndex
CREATE INDEX "slideos_created_at_idx" ON "slideos"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_likes_user_id_slideo_id_key" ON "slideo_likes"("user_id", "slideo_id");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_saves_user_id_slideo_id_key" ON "slideo_saves"("user_id", "slideo_id");
