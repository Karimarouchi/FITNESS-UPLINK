ALTER TABLE talent_pipeline
    ADD COLUMN IF NOT EXISTS cover_letter_text TEXT,
    ADD COLUMN IF NOT EXISTS cover_letter_upload_id UUID REFERENCES user_uploads (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_talent_pipeline_employer_status
    ON talent_pipeline (employer_id, status, updated_at DESC);
