CREATE UNIQUE INDEX idx_coaching_reviews_coach_client
    ON coaching_reviews (coach_id, client_id);
