ALTER TABLE users
    ADD COLUMN IF NOT EXISTS selected_plan VARCHAR(16),
    ADD COLUMN IF NOT EXISTS selected_plan_interval VARCHAR(8);
