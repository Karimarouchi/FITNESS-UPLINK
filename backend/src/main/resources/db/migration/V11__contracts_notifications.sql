CREATE TABLE contracts (
    id UUID PRIMARY KEY,
    recruitment_id UUID NOT NULL REFERENCES talent_pipeline (id) ON DELETE CASCADE,
    employer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    job_offer_id UUID REFERENCES job_offers (id) ON DELETE SET NULL,
    title VARCHAR(180) NOT NULL,
    status VARCHAR(32) NOT NULL,
    source VARCHAR(16) NOT NULL,
    terms_json TEXT,
    original_upload_id UUID REFERENCES user_uploads (id),
    signed_upload_id UUID REFERENCES user_uploads (id),
    audit_trail_upload_id UUID REFERENCES user_uploads (id),
    signature_provider VARCHAR(64) NOT NULL,
    external_signature_request_id VARCHAR(120),
    created_by UUID NOT NULL REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    candidate_signed_at TIMESTAMPTZ,
    employer_signed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_contracts_employer ON contracts (employer_id, updated_at DESC);
CREATE INDEX idx_contracts_candidate ON contracts (candidate_id, updated_at DESC);
CREATE INDEX idx_contracts_recruitment ON contracts (recruitment_id, created_at DESC);
CREATE UNIQUE INDEX uq_contracts_external_id
    ON contracts (external_signature_request_id)
    WHERE external_signature_request_id IS NOT NULL;

CREATE TABLE contract_signers (
    id UUID PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES contracts (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL,
    signing_order INT NOT NULL,
    signed_at TIMESTAMPTZ,
    UNIQUE (contract_id, role)
);

CREATE INDEX idx_contract_signers_contract ON contract_signers (contract_id, signing_order);

CREATE TABLE contract_history (
    id UUID PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES contracts (id) ON DELETE CASCADE,
    event VARCHAR(64) NOT NULL,
    actor_id UUID REFERENCES users (id) ON DELETE SET NULL,
    actor_type VARCHAR(16) NOT NULL,
    previous_status VARCHAR(32),
    new_status VARCHAR(32),
    metadata TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contract_history_contract ON contract_history (contract_id, created_at);

CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    message TEXT NOT NULL,
    action_label VARCHAR(80),
    action_path VARCHAR(255),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

CREATE TABLE signature_webhook_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(64) NOT NULL,
    external_id VARCHAR(120) NOT NULL,
    event_type VARCHAR(64) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, external_id, event_type, payload_hash)
);
