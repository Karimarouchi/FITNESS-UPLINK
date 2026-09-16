CREATE TABLE formations (
    id UUID PRIMARY KEY,
    organizer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content_type VARCHAR(20) NOT NULL,
    title VARCHAR(160) NOT NULL,
    trainer_name VARCHAR(160),
    description TEXT,
    language VARCHAR(40),
    location VARCHAR(200),
    is_online BOOLEAN NOT NULL DEFAULT FALSE,
    price_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'TND',
    has_certification BOOLEAN NOT NULL DEFAULT FALSE,
    image_upload_id UUID,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_formations_organizer ON formations (organizer_id, active);

CREATE TABLE formation_sessions (
    id UUID PRIMARY KEY,
    formation_id UUID NOT NULL REFERENCES formations (id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL DEFAULT 120,
    capacity INT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_formation_sessions_formation ON formation_sessions (formation_id, scheduled_at);
CREATE INDEX idx_formation_sessions_status ON formation_sessions (status, scheduled_at);

CREATE TABLE formation_registrations (
    id UUID PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES formation_sessions (id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status VARCHAR(16) NOT NULL,
    waitlist_position INT,
    payment_id UUID,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_formation_registrations_session ON formation_registrations (session_id, status);
CREATE INDEX idx_formation_registrations_member ON formation_registrations (member_id, created_at DESC);
CREATE UNIQUE INDEX idx_formation_registrations_active_unique
    ON formation_registrations (session_id, member_id)
    WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED', 'WAITLISTED');

CREATE TABLE formation_payments (
    id UUID PRIMARY KEY,
    member_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    registration_id UUID NOT NULL REFERENCES formation_registrations (id),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(16) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_ref VARCHAR(80),
    invoice_number VARCHAR(32) NOT NULL,
    invoice_html TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_formation_payments_member ON formation_payments (member_id, created_at DESC);
