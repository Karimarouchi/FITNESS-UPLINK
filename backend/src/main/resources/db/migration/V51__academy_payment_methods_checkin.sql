-- Academy: pay online (5-minute seat hold) or on site (QR ticket checked at the door).
ALTER TABLE formations
    ADD COLUMN accepts_online BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN accepts_on_site BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE formation_registrations
    ADD COLUMN payment_method VARCHAR(16),
    ADD COLUMN hold_expires_at TIMESTAMPTZ,
    ADD COLUMN ticket_token VARCHAR(64),
    ADD COLUMN checked_in_at TIMESTAMPTZ,
    ADD COLUMN checked_in_by UUID;

UPDATE formation_registrations SET payment_method = 'ONLINE' WHERE payment_method IS NULL;
UPDATE formation_registrations
    SET hold_expires_at = now() + interval '5 minutes'
    WHERE status = 'PENDING_PAYMENT' AND hold_expires_at IS NULL;
UPDATE formation_registrations
    SET ticket_token = replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
    WHERE ticket_token IS NULL;

ALTER TABLE formation_registrations ALTER COLUMN ticket_token SET NOT NULL;
CREATE UNIQUE INDEX idx_formation_registrations_ticket ON formation_registrations (ticket_token);

-- a seat is also held by an on-site registration
DROP INDEX IF EXISTS idx_formation_registrations_active_unique;
CREATE UNIQUE INDEX idx_formation_registrations_active_unique
    ON formation_registrations (session_id, member_id)
    WHERE status IN ('PENDING_PAYMENT', 'PENDING_ON_SITE', 'CONFIRMED', 'WAITLISTED');

-- members who did not show up after choosing "pay on site" owe the amount
CREATE INDEX idx_formation_registrations_debt
    ON formation_registrations (member_id)
    WHERE status = 'NO_SHOW' AND payment_id IS NULL;

ALTER TABLE formation_payments ADD COLUMN collected_by UUID;
