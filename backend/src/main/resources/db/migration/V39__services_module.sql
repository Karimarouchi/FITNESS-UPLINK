-- Move "services.browse" from MEMBER (particuliers) to EMPLOYER/GYM (salles de sport),
-- since this module targets gyms/studios sourcing B2B providers, not individual members.
DELETE FROM role_permissions
WHERE role_id = '11111111-1111-1111-1111-111111111001'
  AND permission_id = (SELECT id FROM permissions WHERE code = 'services.browse');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code = 'services.browse'
WHERE r.id IN ('11111111-1111-1111-1111-111111111004', '11111111-1111-1111-1111-111111111005')
ON CONFLICT DO NOTHING;

CREATE TABLE service_categories (
    id UUID PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

INSERT INTO service_categories (id, name, sort_order, active, created_at, updated_at) VALUES
(gen_random_uuid(), 'Technique', 10, TRUE, now(), now()),
(gen_random_uuid(), 'Opérations', 20, TRUE, now(), now()),
(gen_random_uuid(), 'Business', 30, TRUE, now(), now()),
(gen_random_uuid(), 'Aménagement', 40, TRUE, now(), now()),
(gen_random_uuid(), 'Expertise', 50, TRUE, now(), now()),
(gen_random_uuid(), 'Création de contenu', 60, TRUE, now(), now());

CREATE TABLE provider_services (
    id UUID PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES service_categories (id),
    name VARCHAR(120) NOT NULL,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_provider_services_provider ON provider_services (provider_id, active);
CREATE INDEX idx_provider_services_category ON provider_services (category_id);

CREATE TABLE service_quote_requests (
    id UUID PRIMARY KEY,
    provider_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    company_name VARCHAR(160) NOT NULL,
    country_id UUID REFERENCES countries (id),
    city VARCHAR(120),
    message TEXT NOT NULL,
    attachments_json TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMPTZ NOT NULL,
    handled_at TIMESTAMPTZ
);

CREATE INDEX idx_service_quote_requests_provider ON service_quote_requests (provider_id, status, created_at DESC);
CREATE INDEX idx_service_quote_requests_requester ON service_quote_requests (requester_id, created_at DESC);

INSERT INTO profile_fields (
    id, field_key, label, field_type, placeholder, options_json, required, max_length, sort_order,
    section_key, section_label, section_icon, help_text, accept
) VALUES
(gen_random_uuid(), 'coverage_countries', 'Pays / zones couvertes', 'COUNTRY_MULTI', NULL, NULL, FALSE, 2000, 300,
 'services_offer', 'Zone de couverture', 'public', 'Pays où vous intervenez.', NULL),
(gen_random_uuid(), 'portfolio_photos', 'Photos', 'FILES', NULL, NULL, FALSE, NULL, 310,
 'services_offer', 'Zone de couverture', 'public', 'Réalisations, équipe, matériel.', 'image/jpeg,image/png,image/webp'),
(gen_random_uuid(), 'portfolio_videos', 'Vidéos', 'TAGS', 'Coller un lien YouTube ou Vimeo', NULL, FALSE, 300, 320,
 'services_offer', 'Zone de couverture', 'public', 'Un lien par vidéo — aucun fichier à envoyer.', NULL);

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order)
SELECT '11111111-1111-1111-1111-111111111008', id, FALSE,
       CASE field_key WHEN 'coverage_countries' THEN 300 WHEN 'portfolio_photos' THEN 310 ELSE 320 END
FROM profile_fields
WHERE field_key IN ('coverage_countries', 'portfolio_photos', 'portfolio_videos');
