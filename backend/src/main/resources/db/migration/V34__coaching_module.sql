CREATE TABLE coach_services (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    price_amount NUMERIC(12, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_coach_services_coach ON coach_services (coach_id, active);

CREATE TABLE coach_availability_rules (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_coach_avail_rules_coach ON coach_availability_rules (coach_id, active);

CREATE TABLE coach_availability_exceptions (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    note VARCHAR(200)
);

CREATE INDEX idx_coach_avail_exceptions_coach ON coach_availability_exceptions (coach_id, exception_date);

CREATE TABLE coach_pack_offers (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    pack_type VARCHAR(16) NOT NULL,
    session_count INT,
    price_amount NUMERIC(12, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL,
    validity_days INT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_coach_pack_offers_coach ON coach_pack_offers (coach_id, active);

CREATE TABLE coaching_packs (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    offer_id UUID NOT NULL REFERENCES coach_pack_offers (id),
    sessions_total INT NOT NULL,
    sessions_used INT NOT NULL DEFAULT 0,
    price_amount NUMERIC(12, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL,
    status VARCHAR(16) NOT NULL,
    purchased_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    payment_id UUID
);

CREATE INDEX idx_coaching_packs_client ON coaching_packs (client_id, status);
CREATE INDEX idx_coaching_packs_coach ON coaching_packs (coach_id, status);

CREATE TABLE coaching_bookings (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    coach_service_id UUID NOT NULL REFERENCES coach_services (id),
    pack_id UUID REFERENCES coaching_packs (id),
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INT NOT NULL,
    status VARCHAR(16) NOT NULL,
    price_amount NUMERIC(12, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL,
    payment_id UUID,
    reminder_sent_at TIMESTAMPTZ,
    cancelled_reason VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_coaching_bookings_coach ON coaching_bookings (coach_id, scheduled_at);
CREATE INDEX idx_coaching_bookings_client ON coaching_bookings (client_id, scheduled_at);
CREATE INDEX idx_coaching_bookings_status ON coaching_bookings (status, scheduled_at);

CREATE TABLE coaching_payments (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    booking_id UUID REFERENCES coaching_bookings (id),
    pack_id UUID REFERENCES coaching_packs (id),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    status VARCHAR(16) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_ref VARCHAR(80),
    invoice_number VARCHAR(32) NOT NULL UNIQUE,
    invoice_html TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_coaching_payments_client ON coaching_payments (client_id, created_at DESC);

CREATE TABLE coaching_messages (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES coaching_bookings (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body TEXT,
    upload_id UUID,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_coaching_messages_booking ON coaching_messages (booking_id, created_at);

CREATE TABLE coaching_reviews (
    id UUID PRIMARY KEY,
    booking_id UUID NOT NULL UNIQUE REFERENCES coaching_bookings (id) ON DELETE CASCADE,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_coaching_reviews_coach ON coaching_reviews (coach_id);
