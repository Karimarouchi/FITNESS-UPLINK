CREATE TABLE user_verification_checks (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    check_key VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, check_key)
);

CREATE INDEX idx_user_verification_checks_status
    ON user_verification_checks (status);
