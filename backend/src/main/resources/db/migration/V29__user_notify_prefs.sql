CREATE TABLE IF NOT EXISTS user_notify_prefs (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    in_app_contact BOOLEAN NOT NULL DEFAULT TRUE,
    email_contact BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_message BOOLEAN NOT NULL DEFAULT TRUE,
    email_message BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_application BOOLEAN NOT NULL DEFAULT TRUE,
    email_application BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_document BOOLEAN NOT NULL DEFAULT TRUE,
    email_document BOOLEAN NOT NULL DEFAULT TRUE,
    in_app_contract BOOLEAN NOT NULL DEFAULT TRUE,
    email_contract BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL
);
