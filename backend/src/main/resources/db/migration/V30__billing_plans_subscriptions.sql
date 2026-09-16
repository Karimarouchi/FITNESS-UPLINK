CREATE TABLE billing_families (
    id UUID PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    label VARCHAR(80) NOT NULL
);

CREATE TABLE billing_family_roles (
    family_id UUID NOT NULL REFERENCES billing_families (id) ON DELETE CASCADE,
    role_code VARCHAR(64) NOT NULL,
    PRIMARY KEY (family_id, role_code)
);

CREATE TABLE billing_entitlements (
    code VARCHAR(80) PRIMARY KEY,
    label VARCHAR(160) NOT NULL,
    hint TEXT,
    limit_kind VARCHAR(16) NOT NULL DEFAULT 'NONE',
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE billing_plans (
    id UUID PRIMARY KEY,
    family_id UUID NOT NULL REFERENCES billing_families (id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    name VARCHAR(80) NOT NULL,
    tagline VARCHAR(160),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (family_id, code)
);

CREATE TABLE billing_plan_prices (
    id UUID PRIMARY KEY,
    plan_id UUID NOT NULL REFERENCES billing_plans (id) ON DELETE CASCADE,
    currency VARCHAR(3) NOT NULL,
    interval VARCHAR(8) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    UNIQUE (plan_id, currency, interval)
);

CREATE TABLE billing_plan_entitlements (
    plan_id UUID NOT NULL REFERENCES billing_plans (id) ON DELETE CASCADE,
    entitlement_code VARCHAR(80) NOT NULL REFERENCES billing_entitlements (code) ON DELETE CASCADE,
    limit_value INT,
    PRIMARY KEY (plan_id, entitlement_code)
);

CREATE TABLE billing_country_vat (
    iso2 VARCHAR(2) PRIMARY KEY,
    rate NUMERIC(6, 3) NOT NULL
);

CREATE TABLE billing_test_cards (
    id UUID PRIMARY KEY,
    pan VARCHAR(19) NOT NULL UNIQUE,
    outcome VARCHAR(16) NOT NULL,
    label VARCHAR(80) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE billing_grants (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    entitlement_code VARCHAR(80) NOT NULL REFERENCES billing_entitlements (code) ON DELETE CASCADE,
    PRIMARY KEY (user_id, entitlement_code)
);

CREATE TABLE billing_subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES billing_plans (id),
    status VARCHAR(16) NOT NULL,
    interval VARCHAR(8) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    test_card_id UUID REFERENCES billing_test_cards (id),
    card_last4 VARCHAR(4),
    trial_ends_at TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_billing_sub_user ON billing_subscriptions (user_id, created_at DESC);
CREATE INDEX idx_billing_sub_status ON billing_subscriptions (status, trial_ends_at);

CREATE TABLE billing_payments (
    id UUID PRIMARY KEY,
    subscription_id UUID NOT NULL REFERENCES billing_subscriptions (id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    vat_rate NUMERIC(6, 3) NOT NULL,
    vat_amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(16) NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_ref VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE billing_invoices (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES billing_subscriptions (id) ON DELETE CASCADE,
    payment_id UUID REFERENCES billing_payments (id),
    number VARCHAR(32) NOT NULL UNIQUE,
    html TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE billing_transaction_logs (
    id UUID PRIMARY KEY,
    user_id UUID,
    subscription_id UUID,
    kind VARCHAR(32) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE billing_webhook_events (
    id UUID PRIMARY KEY,
    provider VARCHAR(32) NOT NULL,
    external_id VARCHAR(120) NOT NULL,
    payload TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE (provider, external_id)
);

INSERT INTO billing_families (id, code, label) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'TALENT', 'Talent'),
    ('a1000000-0000-0000-0000-000000000002', 'BUSINESS', 'Business'),
    ('a1000000-0000-0000-0000-000000000003', 'CREATORS', 'Créateurs');

INSERT INTO billing_family_roles (family_id, role_code) VALUES
    ('a1000000-0000-0000-0000-000000000001', 'CANDIDATE'),
    ('a1000000-0000-0000-0000-000000000001', 'MEMBER'),
    ('a1000000-0000-0000-0000-000000000001', 'COACH'),
    ('a1000000-0000-0000-0000-000000000002', 'EMPLOYER'),
    ('a1000000-0000-0000-0000-000000000002', 'GYM'),
    ('a1000000-0000-0000-0000-000000000002', 'ACADEMY'),
    ('a1000000-0000-0000-0000-000000000002', 'SUPPLIER'),
    ('a1000000-0000-0000-0000-000000000002', 'SERVICE_PROVIDER'),
    ('a1000000-0000-0000-0000-000000000003', 'EXPERT_CREATOR'),
    ('a1000000-0000-0000-0000-000000000003', 'EVENT_ORGANIZER');

INSERT INTO billing_entitlements (code, label, hint, limit_kind, sort_order) VALUES
    ('hire.search', 'Recherche talents', 'Liste et fiche candidat', 'NONE', 10),
    ('hire.search.advanced', 'Filtres avancés', 'Diplôme, langue, mobilité, spécialité', 'NONE', 20),
    ('hire.favorites', 'Favoris', 'Enregistrer des profils', 'NONE', 30),
    ('hire.jobs', 'Offres d’emploi', 'Nombre d’offres actives', 'COUNT', 40),
    ('hire.contact', 'Contacter', 'Recruter et ouvrir la discussion', 'NONE', 50),
    ('hire.pipeline', 'Pipeline', 'Changer les étapes', 'NONE', 60),
    ('hire.interview', 'Entretiens', 'Date, Meet ou lieu + e-mail', 'NONE', 70),
    ('hire.chat.files', 'Pièces jointes chat', 'PDF et images dans la discussion', 'NONE', 80),
    ('hire.mail.own', 'SMTP et textes e-mail', 'Envoyer avec sa propre boîte', 'NONE', 90),
    ('hire.contracts', 'Contrats', 'Préparer et envoyer un contrat', 'NONE', 100),
    ('hire.apply', 'Postuler', 'Candidater à une offre', 'NONE', 110),
    ('hire.visibility', 'Visibilité profil', 'Apparaître dans la recherche', 'NONE', 120),
    ('talent.messages', 'Messages talent', 'Répondre aux employeurs', 'NONE', 130),
    ('creator.publish', 'Publier', 'Contenus et événements', 'NONE', 140),
    ('billing.unlock_all', 'Tout débloquer', 'Compte interne / Super Admin', 'NONE', 900);

INSERT INTO billing_plans (id, family_id, code, name, tagline, featured, sort_order, active) VALUES
    ('b1000000-0000-0000-0000-000000000101', 'a1000000-0000-0000-0000-000000000001', 'STARTER', 'Starter', 'Postuler et rester visible', FALSE, 1, TRUE),
    ('b1000000-0000-0000-0000-000000000102', 'a1000000-0000-0000-0000-000000000001', 'PRO', 'Pro', 'Plus de visibilité et messages', TRUE, 2, TRUE),
    ('b1000000-0000-0000-0000-000000000103', 'a1000000-0000-0000-0000-000000000001', 'BUSINESS', 'Business', 'Profil mis en avant', FALSE, 3, TRUE),
    ('b1000000-0000-0000-0000-000000000201', 'a1000000-0000-0000-0000-000000000002', 'STARTER', 'Starter', 'Rechercher et publier 1 offre', FALSE, 1, TRUE),
    ('b1000000-0000-0000-0000-000000000202', 'a1000000-0000-0000-0000-000000000002', 'PRO', 'Pro', 'Contacter et piloter le pipeline', TRUE, 2, TRUE),
    ('b1000000-0000-0000-0000-000000000203', 'a1000000-0000-0000-0000-000000000002', 'BUSINESS', 'Business', 'SMTP, contrats, volume illimité', FALSE, 3, TRUE),
    ('b1000000-0000-0000-0000-000000000301', 'a1000000-0000-0000-0000-000000000003', 'STARTER', 'Starter', 'Présence créateur', FALSE, 1, TRUE),
    ('b1000000-0000-0000-0000-000000000302', 'a1000000-0000-0000-0000-000000000003', 'PRO', 'Pro', 'Publier plus souvent', TRUE, 2, TRUE),
    ('b1000000-0000-0000-0000-000000000303', 'a1000000-0000-0000-0000-000000000003', 'BUSINESS', 'Business', 'Tout le catalogue créateur', FALSE, 3, TRUE);

INSERT INTO billing_plan_prices (id, plan_id, currency, interval, amount)
SELECT gen_random_uuid(), plan_id, currency, interval, amount
FROM (VALUES
    ('b1000000-0000-0000-0000-000000000101'::uuid, 'TND', 'MONTHLY', 19.00),
    ('b1000000-0000-0000-0000-000000000101'::uuid, 'TND', 'YEARLY', 190.00),
    ('b1000000-0000-0000-0000-000000000101'::uuid, 'EUR', 'MONTHLY', 8.00),
    ('b1000000-0000-0000-0000-000000000101'::uuid, 'EUR', 'YEARLY', 80.00),
    ('b1000000-0000-0000-0000-000000000101'::uuid, 'USD', 'MONTHLY', 9.00),
    ('b1000000-0000-0000-0000-000000000101'::uuid, 'USD', 'YEARLY', 90.00),
    ('b1000000-0000-0000-0000-000000000102'::uuid, 'TND', 'MONTHLY', 49.00),
    ('b1000000-0000-0000-0000-000000000102'::uuid, 'TND', 'YEARLY', 490.00),
    ('b1000000-0000-0000-0000-000000000102'::uuid, 'EUR', 'MONTHLY', 16.00),
    ('b1000000-0000-0000-0000-000000000102'::uuid, 'EUR', 'YEARLY', 160.00),
    ('b1000000-0000-0000-0000-000000000102'::uuid, 'USD', 'MONTHLY', 18.00),
    ('b1000000-0000-0000-0000-000000000102'::uuid, 'USD', 'YEARLY', 180.00),
    ('b1000000-0000-0000-0000-000000000103'::uuid, 'TND', 'MONTHLY', 99.00),
    ('b1000000-0000-0000-0000-000000000103'::uuid, 'TND', 'YEARLY', 990.00),
    ('b1000000-0000-0000-0000-000000000103'::uuid, 'EUR', 'MONTHLY', 29.00),
    ('b1000000-0000-0000-0000-000000000103'::uuid, 'EUR', 'YEARLY', 290.00),
    ('b1000000-0000-0000-0000-000000000103'::uuid, 'USD', 'MONTHLY', 32.00),
    ('b1000000-0000-0000-0000-000000000103'::uuid, 'USD', 'YEARLY', 320.00),
    ('b1000000-0000-0000-0000-000000000201'::uuid, 'TND', 'MONTHLY', 39.00),
    ('b1000000-0000-0000-0000-000000000201'::uuid, 'TND', 'YEARLY', 390.00),
    ('b1000000-0000-0000-0000-000000000201'::uuid, 'EUR', 'MONTHLY', 12.00),
    ('b1000000-0000-0000-0000-000000000201'::uuid, 'EUR', 'YEARLY', 120.00),
    ('b1000000-0000-0000-0000-000000000201'::uuid, 'USD', 'MONTHLY', 14.00),
    ('b1000000-0000-0000-0000-000000000201'::uuid, 'USD', 'YEARLY', 140.00),
    ('b1000000-0000-0000-0000-000000000202'::uuid, 'TND', 'MONTHLY', 89.00),
    ('b1000000-0000-0000-0000-000000000202'::uuid, 'TND', 'YEARLY', 890.00),
    ('b1000000-0000-0000-0000-000000000202'::uuid, 'EUR', 'MONTHLY', 29.00),
    ('b1000000-0000-0000-0000-000000000202'::uuid, 'EUR', 'YEARLY', 290.00),
    ('b1000000-0000-0000-0000-000000000202'::uuid, 'USD', 'MONTHLY', 32.00),
    ('b1000000-0000-0000-0000-000000000202'::uuid, 'USD', 'YEARLY', 320.00),
    ('b1000000-0000-0000-0000-000000000203'::uuid, 'TND', 'MONTHLY', 169.00),
    ('b1000000-0000-0000-0000-000000000203'::uuid, 'TND', 'YEARLY', 1690.00),
    ('b1000000-0000-0000-0000-000000000203'::uuid, 'EUR', 'MONTHLY', 59.00),
    ('b1000000-0000-0000-0000-000000000203'::uuid, 'EUR', 'YEARLY', 590.00),
    ('b1000000-0000-0000-0000-000000000203'::uuid, 'USD', 'MONTHLY', 64.00),
    ('b1000000-0000-0000-0000-000000000203'::uuid, 'USD', 'YEARLY', 640.00),
    ('b1000000-0000-0000-0000-000000000301'::uuid, 'TND', 'MONTHLY', 25.00),
    ('b1000000-0000-0000-0000-000000000301'::uuid, 'TND', 'YEARLY', 250.00),
    ('b1000000-0000-0000-0000-000000000301'::uuid, 'EUR', 'MONTHLY', 9.00),
    ('b1000000-0000-0000-0000-000000000301'::uuid, 'EUR', 'YEARLY', 90.00),
    ('b1000000-0000-0000-0000-000000000301'::uuid, 'USD', 'MONTHLY', 10.00),
    ('b1000000-0000-0000-0000-000000000301'::uuid, 'USD', 'YEARLY', 100.00),
    ('b1000000-0000-0000-0000-000000000302'::uuid, 'TND', 'MONTHLY', 69.00),
    ('b1000000-0000-0000-0000-000000000302'::uuid, 'TND', 'YEARLY', 690.00),
    ('b1000000-0000-0000-0000-000000000302'::uuid, 'EUR', 'MONTHLY', 22.00),
    ('b1000000-0000-0000-0000-000000000302'::uuid, 'EUR', 'YEARLY', 220.00),
    ('b1000000-0000-0000-0000-000000000302'::uuid, 'USD', 'MONTHLY', 24.00),
    ('b1000000-0000-0000-0000-000000000302'::uuid, 'USD', 'YEARLY', 240.00),
    ('b1000000-0000-0000-0000-000000000303'::uuid, 'TND', 'MONTHLY', 129.00),
    ('b1000000-0000-0000-0000-000000000303'::uuid, 'TND', 'YEARLY', 1290.00),
    ('b1000000-0000-0000-0000-000000000303'::uuid, 'EUR', 'MONTHLY', 42.00),
    ('b1000000-0000-0000-0000-000000000303'::uuid, 'EUR', 'YEARLY', 420.00),
    ('b1000000-0000-0000-0000-000000000303'::uuid, 'USD', 'MONTHLY', 46.00),
    ('b1000000-0000-0000-0000-000000000303'::uuid, 'USD', 'YEARLY', 460.00)
) AS seed (plan_id, currency, interval, amount);

INSERT INTO billing_plan_entitlements (plan_id, entitlement_code, limit_value) VALUES
    ('b1000000-0000-0000-0000-000000000201', 'hire.search', NULL),
    ('b1000000-0000-0000-0000-000000000201', 'hire.favorites', NULL),
    ('b1000000-0000-0000-0000-000000000201', 'hire.jobs', 1),
    ('b1000000-0000-0000-0000-000000000202', 'hire.search', NULL),
    ('b1000000-0000-0000-0000-000000000202', 'hire.search.advanced', NULL),
    ('b1000000-0000-0000-0000-000000000202', 'hire.favorites', NULL),
    ('b1000000-0000-0000-0000-000000000202', 'hire.jobs', 5),
    ('b1000000-0000-0000-0000-000000000202', 'hire.contact', NULL),
    ('b1000000-0000-0000-0000-000000000202', 'hire.pipeline', NULL),
    ('b1000000-0000-0000-0000-000000000202', 'hire.interview', NULL),
    ('b1000000-0000-0000-0000-000000000202', 'hire.chat.files', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.search', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.search.advanced', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.favorites', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.jobs', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.contact', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.pipeline', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.interview', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.chat.files', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.mail.own', NULL),
    ('b1000000-0000-0000-0000-000000000203', 'hire.contracts', NULL),
    ('b1000000-0000-0000-0000-000000000101', 'hire.apply', NULL),
    ('b1000000-0000-0000-0000-000000000101', 'hire.visibility', NULL),
    ('b1000000-0000-0000-0000-000000000102', 'hire.apply', NULL),
    ('b1000000-0000-0000-0000-000000000102', 'hire.visibility', NULL),
    ('b1000000-0000-0000-0000-000000000102', 'talent.messages', NULL),
    ('b1000000-0000-0000-0000-000000000103', 'hire.apply', NULL),
    ('b1000000-0000-0000-0000-000000000103', 'hire.visibility', NULL),
    ('b1000000-0000-0000-0000-000000000103', 'talent.messages', NULL),
    ('b1000000-0000-0000-0000-000000000301', 'creator.publish', NULL),
    ('b1000000-0000-0000-0000-000000000302', 'creator.publish', NULL),
    ('b1000000-0000-0000-0000-000000000303', 'creator.publish', NULL);

INSERT INTO billing_country_vat (iso2, rate) VALUES
    ('TN', 19.000),
    ('FR', 20.000),
    ('DE', 19.000),
    ('BE', 21.000),
    ('IT', 22.000),
    ('ES', 21.000),
    ('GB', 20.000),
    ('US', 0.000),
    ('CA', 0.000),
    ('AE', 5.000);

INSERT INTO billing_test_cards (id, pan, outcome, label, enabled) VALUES
    ('c1000000-0000-0000-0000-000000000001', '4242424242424242', 'SUCCESS', 'Paiement accepté', TRUE),
    ('c1000000-0000-0000-0000-000000000002', '4000000000000002', 'DECLINE', 'Paiement refusé', TRUE);

INSERT INTO billing_grants (user_id, entitlement_code)
SELECT u.id, 'billing.unlock_all'
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;
