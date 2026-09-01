CREATE TABLE job_offers (
    id UUID PRIMARY KEY,
    employer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    position VARCHAR(160),
    location VARCHAR(160),
    contract_type VARCHAR(32),
    salary_amount VARCHAR(32),
    salary_currency VARCHAR(8),
    languages TEXT,
    certifications TEXT,
    experience VARCHAR(160),
    description TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_offers_employer ON job_offers (employer_id);

ALTER TABLE talent_pipeline
    ADD COLUMN job_offer_id UUID REFERENCES job_offers (id) ON DELETE RESTRICT,
    ADD COLUMN internal_note TEXT,
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'NEW',
    ADD COLUMN status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE talent_pipeline
SET status = CASE stage
    WHEN 'to_contact' THEN 'CONTACTED'
    WHEN 'interview' THEN 'INTERVIEW_SCHEDULED'
    WHEN 'shortlisted' THEN 'NEGOTIATION'
    WHEN 'hired' THEN 'HIRED'
    WHEN 'rejected' THEN 'REJECTED'
    ELSE 'NEW'
END,
status_updated_at = updated_at;

ALTER TABLE talent_pipeline DROP COLUMN stage;

ALTER TABLE talent_pipeline DROP CONSTRAINT IF EXISTS talent_pipeline_employer_id_candidate_id_key;

CREATE UNIQUE INDEX uq_pipeline_offer
    ON talent_pipeline (employer_id, candidate_id, job_offer_id)
    WHERE job_offer_id IS NOT NULL;

CREATE UNIQUE INDEX uq_pipeline_direct
    ON talent_pipeline (employer_id, candidate_id)
    WHERE job_offer_id IS NULL;

CREATE INDEX idx_pipeline_candidate ON talent_pipeline (candidate_id);
CREATE INDEX idx_pipeline_offer ON talent_pipeline (job_offer_id);
