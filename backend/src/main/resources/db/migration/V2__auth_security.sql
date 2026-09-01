ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(100) NOT NULL DEFAULT '!',
    ADD COLUMN role VARCHAR(32) NOT NULL DEFAULT 'USER',
    ADD COLUMN first_name VARCHAR(80) NOT NULL DEFAULT '',
    ADD COLUMN last_name VARCHAR(80) NOT NULL DEFAULT '',
    ADD COLUMN enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMPTZ,
    ADD COLUMN last_login_at TIMESTAMPTZ,
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE users ALTER COLUMN password_hash DROP DEFAULT;
ALTER TABLE users ALTER COLUMN role DROP DEFAULT;
ALTER TABLE users ALTER COLUMN first_name DROP DEFAULT;
ALTER TABLE users ALTER COLUMN last_name DROP DEFAULT;

ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('USER', 'SUPER_ADMIN'));

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    replaced_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens (expires_at);
