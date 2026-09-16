ALTER TABLE talent_pipeline
    ADD COLUMN blocked_at TIMESTAMPTZ;

ALTER TABLE user_verification_checks
    ADD COLUMN rejection_reason TEXT;

CREATE TABLE user_mail_prefs (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    send_mode VARCHAR(16) NOT NULL DEFAULT 'PLATFORM',
    contact_subject TEXT,
    contact_body TEXT,
    message_subject TEXT,
    message_body TEXT,
    updated_at TIMESTAMPTZ NOT NULL
);
