ALTER TABLE talent_pipeline
    ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(16),
    ADD COLUMN IF NOT EXISTS interview_place VARCHAR(400);

ALTER TABLE recruitment_messages
    ADD COLUMN IF NOT EXISTS upload_id UUID;

CREATE TABLE IF NOT EXISTS hire_reports (
    id UUID PRIMARY KEY,
    recruitment_id UUID NOT NULL REFERENCES talent_pipeline (id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_hire_reports_recruitment ON hire_reports (recruitment_id, created_at DESC);

INSERT INTO mail_templates (purpose, subject, body, updated_at) VALUES
    (
        'HIRE_INTERVIEW',
        'Entretien prévu avec {{etablissement}}',
        'Bonjour {{prenom}},' || E'\n\n' ||
        '{{etablissement}} vous convie à un entretien pour {{offre}}.' || E'\n\n' ||
        'Date : {{date}}' || E'\n' ||
        'Heure : {{heure}}' || E'\n' ||
        'Mode : {{mode}}' || E'\n' ||
        '{{lieu_label}} : {{lieu}}' || E'\n\n' ||
        'Connectez-vous à Fitness Uplink pour répondre.' || E'\n\n' ||
        'Fitness Uplink',
        NOW()
    )
ON CONFLICT (purpose) DO NOTHING;
