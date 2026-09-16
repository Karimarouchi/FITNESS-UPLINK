CREATE TABLE recruitment_messages (
    id UUID PRIMARY KEY,
    recruitment_id UUID NOT NULL REFERENCES talent_pipeline (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_recruitment_messages_thread
    ON recruitment_messages (recruitment_id, created_at);
