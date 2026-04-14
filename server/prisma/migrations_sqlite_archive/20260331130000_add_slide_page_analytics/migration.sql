-- Slide page analytics and creator insight tables
CREATE TABLE "slide_page_stats" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slide_id" INTEGER NOT NULL,
  "page_number" INTEGER NOT NULL,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "unique_view_count" INTEGER NOT NULL DEFAULT 0,
  "total_read_ms" INTEGER NOT NULL DEFAULT 0,
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "save_count" INTEGER NOT NULL DEFAULT 0,
  "share_count" INTEGER NOT NULL DEFAULT 0,
  "confused_count" INTEGER NOT NULL DEFAULT 0,
  "summary_count" INTEGER NOT NULL DEFAULT 0,
  "exam_count" INTEGER NOT NULL DEFAULT 0,
  "emoji_count" INTEGER NOT NULL DEFAULT 0,
  "comment_count" INTEGER NOT NULL DEFAULT 0,
  "drop_count" INTEGER NOT NULL DEFAULT 0,
  "profile_visit_count" INTEGER NOT NULL DEFAULT 0,
  "follow_conversion_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME,
  CONSTRAINT "slide_page_stats_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "slide_view_sessions" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slide_id" INTEGER NOT NULL,
  "user_id" INTEGER,
  "session_key" TEXT NOT NULL,
  "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "max_page" INTEGER NOT NULL DEFAULT 1,
  "total_read_ms" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "profile_visited" BOOLEAN NOT NULL DEFAULT false,
  "follow_converted" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "slide_view_sessions_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "slide_view_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "slide_page_reactions" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slide_id" INTEGER NOT NULL,
  "page_number" INTEGER NOT NULL,
  "user_id" INTEGER,
  "actor_key" TEXT NOT NULL,
  "reaction_type" TEXT NOT NULL,
  "emoji" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slide_page_reactions_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "slide_page_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "slide_page_comments" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slide_id" INTEGER NOT NULL,
  "page_number" INTEGER,
  "user_id" INTEGER NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "slide_page_comments_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "slide_page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "slide_page_stats_slide_id_page_number_key" ON "slide_page_stats"("slide_id", "page_number");
CREATE INDEX "slide_page_stats_slide_id_idx" ON "slide_page_stats"("slide_id");
CREATE INDEX "slide_page_stats_view_count_idx" ON "slide_page_stats"("view_count");

CREATE UNIQUE INDEX "slide_view_sessions_slide_id_session_key_key" ON "slide_view_sessions"("slide_id", "session_key");
CREATE INDEX "slide_view_sessions_slide_id_idx" ON "slide_view_sessions"("slide_id");
CREATE INDEX "slide_view_sessions_user_id_idx" ON "slide_view_sessions"("user_id");

CREATE UNIQUE INDEX "slide_page_reactions_slide_id_page_number_actor_key_reaction_type_emoji_key" ON "slide_page_reactions"("slide_id", "page_number", "actor_key", "reaction_type", "emoji");
CREATE INDEX "slide_page_reactions_slide_id_page_number_idx" ON "slide_page_reactions"("slide_id", "page_number");

CREATE INDEX "slide_page_comments_slide_id_page_number_idx" ON "slide_page_comments"("slide_id", "page_number");
CREATE INDEX "slide_page_comments_user_id_idx" ON "slide_page_comments"("user_id");
