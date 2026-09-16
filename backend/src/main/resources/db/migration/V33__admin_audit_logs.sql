CREATE TABLE admin_audit_logs (
    id UUID PRIMARY KEY,
    actor_id UUID,
    actor_label VARCHAR(160),
    target_user_id UUID,
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32),
    entity_id UUID,
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

-- No foreign keys on purpose: an audit trail must survive deletion of the
-- account it refers to (actor or target), so actor_label captures a snapshot.
CREATE INDEX idx_admin_audit_logs_target ON admin_audit_logs (target_user_id, created_at DESC);
CREATE INDEX idx_admin_audit_logs_actor ON admin_audit_logs (actor_id, created_at DESC);
