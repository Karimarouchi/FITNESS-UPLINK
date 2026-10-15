-- Password reset protection: wrong-code counter and a temporary block, kept per account.
ALTER TABLE users
    ADD COLUMN reset_failed_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN reset_blocked_until TIMESTAMPTZ;
