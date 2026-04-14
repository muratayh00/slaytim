-- CreateTable
CREATE TABLE "flashcard_sets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slide_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'four',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME,
    CONSTRAINT "flashcard_sets_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "flashcard_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "flashcard_questions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "set_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT,
    "option_d" TEXT,
    "correct_option" INTEGER NOT NULL,
    "explanation" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flashcard_questions_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "flashcard_sets" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "flashcard_attempts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "set_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "session_key" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "flashcard_attempts_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "flashcard_sets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "flashcard_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "flashcard_sets_slide_id_is_published_idx" ON "flashcard_sets"("slide_id", "is_published");

-- CreateIndex
CREATE INDEX "flashcard_sets_user_id_idx" ON "flashcard_sets"("user_id");

-- CreateIndex
CREATE INDEX "flashcard_questions_set_id_order_index_idx" ON "flashcard_questions"("set_id", "order_index");

-- CreateIndex
CREATE INDEX "flashcard_attempts_set_id_created_at_idx" ON "flashcard_attempts"("set_id", "created_at");

-- CreateIndex
CREATE INDEX "flashcard_attempts_user_id_idx" ON "flashcard_attempts"("user_id");

