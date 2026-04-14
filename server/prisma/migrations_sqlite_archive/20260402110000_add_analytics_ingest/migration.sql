-- Analytics ingest dedupe + session snapshots
CREATE TABLE "analytics_events" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "event_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL DEFAULT 0,
  "event_type" TEXT NOT NULL,
  "payload" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "session_snapshots" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "snapshot_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "topic_id" INTEGER,
  "slide_id" INTEGER,
  "duration_ms" INTEGER NOT NULL DEFAULT 0,
  "max_scroll" INTEGER NOT NULL DEFAULT 0,
  "pages_viewed" TEXT NOT NULL DEFAULT '[]',
  "interactions" TEXT NOT NULL DEFAULT '{}',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "analytics_events_event_id_key" ON "analytics_events"("event_id");
CREATE INDEX "analytics_events_session_id_created_at_idx" ON "analytics_events"("session_id", "created_at");
CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events"("event_type", "created_at");

CREATE UNIQUE INDEX "session_snapshots_snapshot_id_key" ON "session_snapshots"("snapshot_id");
CREATE INDEX "session_snapshots_session_id_created_at_idx" ON "session_snapshots"("session_id", "created_at");
CREATE INDEX "session_snapshots_slide_id_created_at_idx" ON "session_snapshots"("slide_id", "created_at");
