ALTER TABLE user_mail_prefs
    ADD COLUMN IF NOT EXISTS from_name VARCHAR(120),
    ADD COLUMN IF NOT EXISTS from_email VARCHAR(255),
    ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
    ADD COLUMN IF NOT EXISTS smtp_port INTEGER,
    ADD COLUMN IF NOT EXISTS smtp_username VARCHAR(255),
    ADD COLUMN IF NOT EXISTS smtp_password_enc TEXT;

CREATE TABLE IF NOT EXISTS mail_templates (
    purpose VARCHAR(40) PRIMARY KEY,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

INSERT INTO mail_templates (purpose, subject, body, updated_at) VALUES
    (
        'HIRE_CONTACTED',
        '{{etablissement}} souhaite échanger avec vous',
        'Bonjour {{prenom}},' || E'\n\n' || '{{etablissement}} vous a contacté pour {{offre}}. Connectez-vous à Fitness Uplink pour répondre dans la messagerie.' || E'\n\n' || 'Fitness Uplink',
        NOW()
    ),
    (
        'HIRE_MESSAGE',
        'Nouveau message de {{expediteur}}',
        'Bonjour {{prenom}},' || E'\n\n' || '{{expediteur}} vous a écrit :' || E'\n\n' || '{{extrait}}' || E'\n\n' || 'Répondez depuis Fitness Uplink.' || E'\n\n' || 'Fitness Uplink',
        NOW()
    ),
    (
        'DOCUMENT_REJECTED',
        'Document refusé : {{section}}',
        'Bonjour {{prenom}},' || E'\n\n' || 'La section « {{section}} » a été refusée.' || E'\n\n' || 'Motif : {{motif}}' || E'\n\n' || 'Corrigez votre dossier puis reconnectez-vous.' || E'\n\n' || 'Fitness Uplink',
        NOW()
    ),
    (
        'DOCUMENT_VERIFIED',
        'Document validé : {{section}}',
        'Bonjour {{prenom}},' || E'\n\n' || 'La section « {{section}} » a été validée.' || E'\n\n' || 'Fitness Uplink',
        NOW()
    )
ON CONFLICT (purpose) DO NOTHING;
