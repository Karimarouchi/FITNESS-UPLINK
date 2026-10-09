-- Signups stay here until the e-mail code is confirmed; the users row is only created on success.
CREATE TABLE pending_signups (
    id              UUID PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(80)  NOT NULL,
    last_name       VARCHAR(80)  NOT NULL,
    code_hash       VARCHAR(64)  NOT NULL,
    code_expires_at TIMESTAMPTZ  NOT NULL,
    attempts        INTEGER      NOT NULL DEFAULT 0,
    last_sent_at    TIMESTAMPTZ  NOT NULL,
    expires_at      TIMESTAMPTZ  NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL
);

CREATE INDEX pending_signups_expires_at_idx ON pending_signups (expires_at);

-- Accounts created by the previous flow without ever confirming their e-mail.
DELETE FROM users WHERE email_verified = FALSE;
