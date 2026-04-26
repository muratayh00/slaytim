-- Migration: 20260426_add_auth_tokens
-- Adds email_verified_at to users and creates the unified auth_tokens table.
-- auth_tokens replaces password_reset_tokens for all token-based auth flows
-- (email verification, password reset, magic-link login).
-- Tokens are stored as sha256(rawToken) — raw tokens are never persisted.

-- Add email_verified_at column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Create unified auth_tokens table
CREATE TABLE IF NOT EXISTS auth_tokens (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL,               -- verify | reset | magic
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_tokens_user_id_type_idx ON auth_tokens (user_id, type);
CREATE INDEX IF NOT EXISTS auth_tokens_expires_at_idx   ON auth_tokens (expires_at);
