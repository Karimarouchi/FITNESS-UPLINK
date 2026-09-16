CREATE TABLE coach_settings (
    coach_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    cancellation_deadline_hours INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE coaching_platform_settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT coaching_platform_settings_singleton CHECK (id = 1)
);

INSERT INTO coaching_platform_settings (id, commission_rate, updated_at) VALUES (1, 0, now());

CREATE TABLE coaching_reports (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES coaching_bookings (id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    admin_note TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_coaching_reports_status ON coaching_reports (status, created_at DESC);

ALTER TABLE coaching_payments
    ADD COLUMN commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
    ADD COLUMN commission_amount NUMERIC(12, 2) NOT NULL DEFAULT 0;
