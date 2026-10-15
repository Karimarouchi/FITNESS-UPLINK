-- In-app negotiation: employer and candidate exchange proposed terms during the NEGOTIATION step.
CREATE TABLE negotiation_offers (
    id UUID PRIMARY KEY,
    recruitment_id UUID NOT NULL REFERENCES talent_pipeline (id) ON DELETE CASCADE,
    proposer_id UUID NOT NULL,
    salary_amount NUMERIC(12, 2) NOT NULL,
    salary_currency VARCHAR(3) NOT NULL,
    contract_type VARCHAR(20) NOT NULL,
    start_date DATE,
    location VARCHAR(160),
    note TEXT,
    status VARCHAR(12) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ
);

CREATE INDEX idx_negotiation_offers_recruitment ON negotiation_offers (recruitment_id, created_at);
