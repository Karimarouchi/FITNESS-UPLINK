-- V40: Direct messages between member and coach (pre-booking)
CREATE TABLE coach_direct_messages (
    id UUID PRIMARY KEY,
    coach_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_coach_direct_msgs ON coach_direct_messages (coach_id, member_id, created_at);
