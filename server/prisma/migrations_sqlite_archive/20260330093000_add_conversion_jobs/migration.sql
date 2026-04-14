-- CreateTable
CREATE TABLE IF NOT EXISTS "conversion_jobs" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "slide_id" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "locked_at" DATETIME,
  "finished_at" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME,
  CONSTRAINT "conversion_jobs_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "conversion_jobs_slide_id_key" ON "conversion_jobs"("slide_id");
CREATE INDEX IF NOT EXISTS "conversion_jobs_status_idx" ON "conversion_jobs"("status");
CREATE INDEX IF NOT EXISTS "conversion_jobs_locked_at_idx" ON "conversion_jobs"("locked_at");
