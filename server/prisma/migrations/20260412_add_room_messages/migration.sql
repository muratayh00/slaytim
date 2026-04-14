-- CreateTable
CREATE TABLE "room_messages" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    CONSTRAINT "room_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_messages_room_id_created_at_idx" ON "room_messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "room_messages_user_id_created_at_idx" ON "room_messages"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "room_messages"
ADD CONSTRAINT "room_messages_room_id_fkey"
FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_messages"
ADD CONSTRAINT "room_messages_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
