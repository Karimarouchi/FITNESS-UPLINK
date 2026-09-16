ALTER TABLE billing_plans ADD COLUMN trial_days INT NOT NULL DEFAULT 0;

-- Preserve current behaviour (every plan already grants a 7 day trial today).
-- New plans created after this migration default to 0 (no trial) until an admin decides otherwise.
UPDATE billing_plans SET trial_days = 7;
