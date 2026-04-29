-- Add indexes for User.role and User.emailVerifiedAt
-- These fields are frequently filtered in admin queries and auth flows.

CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users"("role");
CREATE INDEX IF NOT EXISTS "users_email_verified_at_idx" ON "users"("email_verified_at");
