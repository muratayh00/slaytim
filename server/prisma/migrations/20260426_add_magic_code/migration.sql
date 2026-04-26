-- Migration: 20260426_add_magic_code
-- Adds OTP code support to auth_tokens for cross-device magic-link login.
--
-- code_hash    : sha256(tokenHash + ':' + 6-digit-code) — never raw
-- code_attempts: wrong-guess counter; token invalidated after 5 failures

ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS code_hash     TEXT;
ALTER TABLE auth_tokens ADD COLUMN IF NOT EXISTS code_attempts INTEGER NOT NULL DEFAULT 0;
