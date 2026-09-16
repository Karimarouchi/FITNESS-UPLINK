-- Prevents two confirmed bookings from ever landing on the exact same coach slot,
-- even under concurrent requests (double-click on the same time slot).
CREATE UNIQUE INDEX idx_coaching_bookings_unique_slot
    ON coaching_bookings (coach_id, scheduled_at)
    WHERE status = 'CONFIRMED';
