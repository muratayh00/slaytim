-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "bio" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_muted" BOOLEAN NOT NULL DEFAULT false,
    "is_banned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "room_id" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "pinned_slide_id" INTEGER,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slides" (
    "id" SERIAL NOT NULL,
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
    "downloads_count" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversion_jobs" (
    "id" SERIAL NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "next_attempt_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "dead_lettered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "conversion_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_likes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slide_likes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slide_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_slides" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followed_users" (
    "id" SERIAL NOT NULL,
    "follower_id" INTEGER NOT NULL,
    "following_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followed_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "followed_categories" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "followed_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visited_topics" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "visited_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visited_topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" SERIAL NOT NULL,
    "event_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "event_type" TEXT NOT NULL,
    "payload" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session_snapshots" (
    "id" SERIAL NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "topic_id" INTEGER,
    "slide_id" INTEGER,
    "duration_ms" INTEGER NOT NULL DEFAULT 0,
    "max_scroll" INTEGER NOT NULL DEFAULT 0,
    "pages_viewed" TEXT NOT NULL DEFAULT '[]',
    "interactions" TEXT NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "session_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "note" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_users" (
    "id" SERIAL NOT NULL,
    "blocker_id" INTEGER NOT NULL,
    "blocked_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_warnings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_warnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_id" INTEGER NOT NULL,
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_slides" (
    "id" SERIAL NOT NULL,
    "collection_id" INTEGER NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_slides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_follows" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "collection_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topic_subscriptions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "topic_id" INTEGER NOT NULL,
    "notify_new_slides" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "topic_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "access_password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_members" (
    "id" SERIAL NOT NULL,
    "room_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideo_series" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideo_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideos" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT,
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
    "hidden_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideo_likes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideo_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideo_saves" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideo_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideo_completions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideo_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideo_shares" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideo_shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideo_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "page_count" INTEGER,
    "published_slideo_id" INTEGER,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "slideo_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideo_feed_assignments" (
    "id" SERIAL NOT NULL,
    "subject_key" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideo_feed_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slideo_feed_events" (
    "id" SERIAL NOT NULL,
    "subject_key" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "slideo_id" INTEGER NOT NULL,
    "page" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "event_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slideo_feed_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slide_page_stats" (
    "id" SERIAL NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "slide_page_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slide_view_sessions" (
    "id" SERIAL NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "session_key" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "max_page" INTEGER NOT NULL DEFAULT 1,
    "total_read_ms" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "profile_visited" BOOLEAN NOT NULL DEFAULT false,
    "follow_converted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "slide_view_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slide_page_reactions" (
    "id" SERIAL NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "page_number" INTEGER NOT NULL,
    "user_id" INTEGER,
    "actor_key" TEXT NOT NULL,
    "reaction_type" TEXT NOT NULL,
    "emoji" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slide_page_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slide_page_comments" (
    "id" SERIAL NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "page_number" INTEGER,
    "user_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slide_page_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_sets" (
    "id" SERIAL NOT NULL,
    "slide_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'four',
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "flashcard_sets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_questions" (
    "id" SERIAL NOT NULL,
    "set_id" INTEGER NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "prompt" TEXT NOT NULL,
    "option_a" TEXT NOT NULL,
    "option_b" TEXT NOT NULL,
    "option_c" TEXT,
    "option_d" TEXT,
    "correct_option" INTEGER NOT NULL,
    "explanation" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flashcard_attempts" (
    "id" SERIAL NOT NULL,
    "set_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "session_key" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flashcard_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_logs" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "target_type" TEXT,
    "target_id" INTEGER,
    "meta" TEXT,
    "ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "topics_user_id_idx" ON "topics"("user_id");

-- CreateIndex
CREATE INDEX "topics_category_id_idx" ON "topics"("category_id");

-- CreateIndex
CREATE INDEX "topics_room_id_idx" ON "topics"("room_id");

-- CreateIndex
CREATE INDEX "topics_views_count_idx" ON "topics"("views_count");

-- CreateIndex
CREATE INDEX "topics_is_hidden_idx" ON "topics"("is_hidden");

-- CreateIndex
CREATE UNIQUE INDEX "slides_slug_key" ON "slides"("slug");

-- CreateIndex
CREATE INDEX "slides_user_id_idx" ON "slides"("user_id");

-- CreateIndex
CREATE INDEX "slides_topic_id_idx" ON "slides"("topic_id");

-- CreateIndex
CREATE INDEX "slides_likes_count_idx" ON "slides"("likes_count");

-- CreateIndex
CREATE INDEX "slides_is_hidden_idx" ON "slides"("is_hidden");

-- CreateIndex
CREATE UNIQUE INDEX "conversion_jobs_slide_id_key" ON "conversion_jobs"("slide_id");

-- CreateIndex
CREATE INDEX "conversion_jobs_status_idx" ON "conversion_jobs"("status");

-- CreateIndex
CREATE INDEX "conversion_jobs_next_attempt_at_idx" ON "conversion_jobs"("next_attempt_at");

-- CreateIndex
CREATE INDEX "conversion_jobs_locked_at_idx" ON "conversion_jobs"("locked_at");

-- CreateIndex
CREATE INDEX "topic_likes_topic_id_idx" ON "topic_likes"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "topic_likes_user_id_topic_id_key" ON "topic_likes"("user_id", "topic_id");

-- CreateIndex
CREATE INDEX "slide_likes_slide_id_idx" ON "slide_likes"("slide_id");

-- CreateIndex
CREATE UNIQUE INDEX "slide_likes_user_id_slide_id_key" ON "slide_likes"("user_id", "slide_id");

-- CreateIndex
CREATE INDEX "saved_slides_slide_id_idx" ON "saved_slides"("slide_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_slides_user_id_slide_id_key" ON "saved_slides"("user_id", "slide_id");

-- CreateIndex
CREATE UNIQUE INDEX "followed_users_follower_id_following_id_key" ON "followed_users"("follower_id", "following_id");

-- CreateIndex
CREATE UNIQUE INDEX "followed_categories_user_id_category_id_key" ON "followed_categories"("user_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "visited_topics_user_id_topic_id_key" ON "visited_topics"("user_id", "topic_id");

-- CreateIndex
CREATE INDEX "comments_topic_id_idx" ON "comments"("topic_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- CreateIndex
CREATE INDEX "notifications_created_at_idx" ON "notifications"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "analytics_events_event_id_key" ON "analytics_events"("event_id");

-- CreateIndex
CREATE INDEX "analytics_events_session_id_created_at_idx" ON "analytics_events"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "analytics_events_event_type_created_at_idx" ON "analytics_events"("event_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "session_snapshots_snapshot_id_key" ON "session_snapshots"("snapshot_id");

-- CreateIndex
CREATE INDEX "session_snapshots_session_id_created_at_idx" ON "session_snapshots"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "session_snapshots_slide_id_created_at_idx" ON "session_snapshots"("slide_id", "created_at");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_priority_idx" ON "reports"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "blocked_users_blocker_id_blocked_id_key" ON "blocked_users"("blocker_id", "blocked_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_key_key" ON "badges"("key");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "collections_user_id_idx" ON "collections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_slides_collection_id_slide_id_key" ON "collection_slides"("collection_id", "slide_id");

-- CreateIndex
CREATE INDEX "collection_follows_collection_id_idx" ON "collection_follows"("collection_id");

-- CreateIndex
CREATE UNIQUE INDEX "collection_follows_user_id_collection_id_key" ON "collection_follows"("user_id", "collection_id");

-- CreateIndex
CREATE INDEX "topic_subscriptions_topic_id_idx" ON "topic_subscriptions"("topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "topic_subscriptions_user_id_topic_id_key" ON "topic_subscriptions"("user_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_slug_key" ON "rooms"("slug");

-- CreateIndex
CREATE INDEX "rooms_owner_id_idx" ON "rooms"("owner_id");

-- CreateIndex
CREATE INDEX "rooms_is_public_idx" ON "rooms"("is_public");

-- CreateIndex
CREATE INDEX "room_members_user_id_idx" ON "room_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_members_room_id_user_id_key" ON "room_members"("room_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "slideo_series_user_id_idx" ON "slideo_series"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "slideos_slug_key" ON "slideos"("slug");

-- CreateIndex
CREATE INDEX "slideos_user_id_idx" ON "slideos"("user_id");

-- CreateIndex
CREATE INDEX "slideos_created_at_idx" ON "slideos"("created_at");

-- CreateIndex
CREATE INDEX "slideos_is_hidden_idx" ON "slideos"("is_hidden");

-- CreateIndex
CREATE INDEX "slideo_likes_slideo_id_idx" ON "slideo_likes"("slideo_id");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_likes_user_id_slideo_id_key" ON "slideo_likes"("user_id", "slideo_id");

-- CreateIndex
CREATE INDEX "slideo_saves_slideo_id_idx" ON "slideo_saves"("slideo_id");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_saves_user_id_slideo_id_key" ON "slideo_saves"("user_id", "slideo_id");

-- CreateIndex
CREATE INDEX "slideo_completions_completed_at_idx" ON "slideo_completions"("completed_at");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_completions_user_id_slideo_id_key" ON "slideo_completions"("user_id", "slideo_id");

-- CreateIndex
CREATE INDEX "slideo_shares_created_at_idx" ON "slideo_shares"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_shares_user_id_slideo_id_key" ON "slideo_shares"("user_id", "slideo_id");

-- CreateIndex
CREATE INDEX "slideo_sessions_user_id_created_at_idx" ON "slideo_sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "slideo_sessions_status_idx" ON "slideo_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_sessions_slide_id_key" ON "slideo_sessions"("slide_id");

-- CreateIndex
CREATE UNIQUE INDEX "slideo_feed_assignments_subject_key_key" ON "slideo_feed_assignments"("subject_key");

-- CreateIndex
CREATE INDEX "slideo_feed_assignments_variant_idx" ON "slideo_feed_assignments"("variant");

-- CreateIndex
CREATE INDEX "slideo_feed_events_subject_key_created_at_idx" ON "slideo_feed_events"("subject_key", "created_at");

-- CreateIndex
CREATE INDEX "slideo_feed_events_variant_event_type_created_at_idx" ON "slideo_feed_events"("variant", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "slideo_feed_events_slideo_id_created_at_idx" ON "slideo_feed_events"("slideo_id", "created_at");

-- CreateIndex
CREATE INDEX "slide_page_stats_slide_id_idx" ON "slide_page_stats"("slide_id");

-- CreateIndex
CREATE INDEX "slide_page_stats_view_count_idx" ON "slide_page_stats"("view_count");

-- CreateIndex
CREATE UNIQUE INDEX "slide_page_stats_slide_id_page_number_key" ON "slide_page_stats"("slide_id", "page_number");

-- CreateIndex
CREATE INDEX "slide_view_sessions_slide_id_idx" ON "slide_view_sessions"("slide_id");

-- CreateIndex
CREATE INDEX "slide_view_sessions_user_id_idx" ON "slide_view_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "slide_view_sessions_slide_id_session_key_key" ON "slide_view_sessions"("slide_id", "session_key");

-- CreateIndex
CREATE INDEX "slide_page_reactions_slide_id_page_number_idx" ON "slide_page_reactions"("slide_id", "page_number");

-- CreateIndex
CREATE UNIQUE INDEX "slide_page_reactions_slide_id_page_number_actor_key_reactio_key" ON "slide_page_reactions"("slide_id", "page_number", "actor_key", "reaction_type", "emoji");

-- CreateIndex
CREATE INDEX "slide_page_comments_slide_id_page_number_idx" ON "slide_page_comments"("slide_id", "page_number");

-- CreateIndex
CREATE INDEX "slide_page_comments_user_id_idx" ON "slide_page_comments"("user_id");

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

-- CreateIndex
CREATE INDEX "admin_logs_admin_id_idx" ON "admin_logs"("admin_id");

-- CreateIndex
CREATE INDEX "admin_logs_action_idx" ON "admin_logs"("action");

-- CreateIndex
CREATE INDEX "admin_logs_created_at_idx" ON "admin_logs"("created_at");

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_pinned_slide_id_fkey" FOREIGN KEY ("pinned_slide_id") REFERENCES "slides"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slides" ADD CONSTRAINT "slides_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slides" ADD CONSTRAINT "slides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversion_jobs" ADD CONSTRAINT "conversion_jobs_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_likes" ADD CONSTRAINT "topic_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_likes" ADD CONSTRAINT "topic_likes_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_likes" ADD CONSTRAINT "slide_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_likes" ADD CONSTRAINT "slide_likes_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_slides" ADD CONSTRAINT "saved_slides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_slides" ADD CONSTRAINT "saved_slides_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followed_users" ADD CONSTRAINT "followed_users_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followed_users" ADD CONSTRAINT "followed_users_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followed_categories" ADD CONSTRAINT "followed_categories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "followed_categories" ADD CONSTRAINT "followed_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visited_topics" ADD CONSTRAINT "visited_topics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visited_topics" ADD CONSTRAINT "visited_topics_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_users" ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_warnings" ADD CONSTRAINT "user_warnings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_slides" ADD CONSTRAINT "collection_slides_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_slides" ADD CONSTRAINT "collection_slides_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_follows" ADD CONSTRAINT "collection_follows_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_follows" ADD CONSTRAINT "collection_follows_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_subscriptions" ADD CONSTRAINT "topic_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_subscriptions" ADD CONSTRAINT "topic_subscriptions_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_members" ADD CONSTRAINT "room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_series" ADD CONSTRAINT "slideo_series_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideos" ADD CONSTRAINT "slideos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideos" ADD CONSTRAINT "slideos_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideos" ADD CONSTRAINT "slideos_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "slideo_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_likes" ADD CONSTRAINT "slideo_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_likes" ADD CONSTRAINT "slideo_likes_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_saves" ADD CONSTRAINT "slideo_saves_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_saves" ADD CONSTRAINT "slideo_saves_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_completions" ADD CONSTRAINT "slideo_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_completions" ADD CONSTRAINT "slideo_completions_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_shares" ADD CONSTRAINT "slideo_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_shares" ADD CONSTRAINT "slideo_shares_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_sessions" ADD CONSTRAINT "slideo_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_sessions" ADD CONSTRAINT "slideo_sessions_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_sessions" ADD CONSTRAINT "slideo_sessions_published_slideo_id_fkey" FOREIGN KEY ("published_slideo_id") REFERENCES "slideos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slideo_feed_events" ADD CONSTRAINT "slideo_feed_events_slideo_id_fkey" FOREIGN KEY ("slideo_id") REFERENCES "slideos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_page_stats" ADD CONSTRAINT "slide_page_stats_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_view_sessions" ADD CONSTRAINT "slide_view_sessions_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_view_sessions" ADD CONSTRAINT "slide_view_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_page_reactions" ADD CONSTRAINT "slide_page_reactions_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_page_reactions" ADD CONSTRAINT "slide_page_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_page_comments" ADD CONSTRAINT "slide_page_comments_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slide_page_comments" ADD CONSTRAINT "slide_page_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_sets" ADD CONSTRAINT "flashcard_sets_slide_id_fkey" FOREIGN KEY ("slide_id") REFERENCES "slides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_sets" ADD CONSTRAINT "flashcard_sets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_questions" ADD CONSTRAINT "flashcard_questions_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "flashcard_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_attempts" ADD CONSTRAINT "flashcard_attempts_set_id_fkey" FOREIGN KEY ("set_id") REFERENCES "flashcard_sets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flashcard_attempts" ADD CONSTRAINT "flashcard_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

