ALTER TABLE users
    ADD COLUMN IF NOT EXISTS pending_plan VARCHAR(16),
    ADD COLUMN IF NOT EXISTS pending_plan_interval VARCHAR(8);
