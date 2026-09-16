CREATE INDEX IF NOT EXISTS idx_users_hire_search
    ON users (verification_status, profile_visible, onboarding_completed, professional_intent);

CREATE INDEX IF NOT EXISTS idx_users_hire_country
    ON users (country_id, verification_status);

CREATE INDEX IF NOT EXISTS idx_users_created_at
    ON users (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profile_values_field
    ON user_profile_values (field_key);
