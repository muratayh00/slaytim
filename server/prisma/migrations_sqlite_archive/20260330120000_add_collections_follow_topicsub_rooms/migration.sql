CREATE TABLE IF NOT EXISTS "collection_follows" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "collection_id" INTEGER NOT NULL,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "collection_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "collection_follows_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "collection_follows_user_id_collection_id_key" ON "collection_follows"("user_id", "collection_id");
CREATE INDEX IF NOT EXISTS "collection_follows_collection_id_idx" ON "collection_follows"("collection_id");

CREATE TABLE IF NOT EXISTS "topic_subscriptions" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "user_id" INTEGER NOT NULL,
  "topic_id" INTEGER NOT NULL,
  "notify_new_slides" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "topic_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "topic_subscriptions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "topic_subscriptions_user_id_topic_id_key" ON "topic_subscriptions"("user_id", "topic_id");
CREATE INDEX IF NOT EXISTS "topic_subscriptions_topic_id_idx" ON "topic_subscriptions"("topic_id");

CREATE TABLE IF NOT EXISTS "rooms" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "owner_id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "is_public" BOOLEAN NOT NULL DEFAULT true,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME,
  CONSTRAINT "rooms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "rooms_slug_key" ON "rooms"("slug");
CREATE INDEX IF NOT EXISTS "rooms_owner_id_idx" ON "rooms"("owner_id");
CREATE INDEX IF NOT EXISTS "rooms_is_public_idx" ON "rooms"("is_public");

CREATE TABLE IF NOT EXISTS "room_members" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "room_id" INTEGER NOT NULL,
  "user_id" INTEGER NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "room_members_room_id_user_id_key" ON "room_members"("room_id", "user_id");
CREATE INDEX IF NOT EXISTS "room_members_user_id_idx" ON "room_members"("user_id");
