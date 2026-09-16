CREATE TABLE mail_settings (
    id SMALLINT PRIMARY KEY,
    from_name VARCHAR(120) NOT NULL,
    from_email VARCHAR(255) NOT NULL,
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    smtp_username VARCHAR(255),
    smtp_password_enc TEXT,
    updated_at TIMESTAMPTZ NOT NULL,
    updated_by UUID
);

ALTER TABLE mail_settings
    ADD CONSTRAINT mail_settings_singleton CHECK (id = 1);

CREATE TABLE mail_events (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL,
    purpose VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL,
    recipient_hash VARCHAR(64) NOT NULL,
    recipient_masked VARCHAR(255) NOT NULL,
    error_code VARCHAR(80),
    error_message VARCHAR(500),
    duration_ms INTEGER
);

CREATE INDEX mail_events_created_at_idx ON mail_events (created_at DESC);
CREATE INDEX mail_events_status_idx ON mail_events (status, created_at DESC);
