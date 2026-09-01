ALTER TABLE users
    ADD COLUMN verification_status VARCHAR(16) NOT NULL DEFAULT 'pending';

UPDATE users
SET verification_status = 'verified'
WHERE role_id = '11111111-1111-1111-1111-111111111099';

CREATE TABLE candidate_favorites (
    employer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (employer_id, candidate_id)
);

CREATE TABLE talent_pipeline (
    id UUID PRIMARY KEY,
    employer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    stage VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employer_id, candidate_id)
);

CREATE INDEX idx_users_verification ON users (verification_status);
CREATE INDEX idx_pipeline_employer ON talent_pipeline (employer_id);
CREATE INDEX idx_favorites_employer ON candidate_favorites (employer_id);
