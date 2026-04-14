-- CreateIndex
CREATE INDEX "comments_topic_id_idx" ON "comments"("topic_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "slides_user_id_idx" ON "slides"("user_id");

-- CreateIndex
CREATE INDEX "slides_topic_id_idx" ON "slides"("topic_id");

-- CreateIndex
CREATE INDEX "slides_likes_count_idx" ON "slides"("likes_count");

-- CreateIndex
CREATE INDEX "topics_user_id_idx" ON "topics"("user_id");

-- CreateIndex
CREATE INDEX "topics_category_id_idx" ON "topics"("category_id");

-- CreateIndex
CREATE INDEX "topics_views_count_idx" ON "topics"("views_count");
