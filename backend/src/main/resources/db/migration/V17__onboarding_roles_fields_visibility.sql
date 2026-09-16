ALTER TABLE users
    ADD COLUMN IF NOT EXISTS professional_intent VARCHAR(16),
    ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE role_profile_fields
    ADD COLUMN IF NOT EXISTS visibility_required BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE roles
SET category_label = CASE category
    WHEN 'FOR_YOU' THEN 'Pour vous'
    WHEN 'PROFESSIONAL' THEN 'Recrutement'
    WHEN 'BUSINESS' THEN 'Entreprises & organisations'
    ELSE category_label
END
WHERE selectable = TRUE;

UPDATE roles SET
    label = 'Professionnel du fitness',
    description = 'Coach ou candidat : un compte, puis vous choisissez emploi, coaching, ou les deux.'
WHERE code = 'CANDIDATE';

UPDATE roles SET
    label = 'Employeur / salle / studio',
    description = 'Recrutez des professionnels. Le type d’établissement se précise dans le dossier.'
WHERE code = 'EMPLOYER';

UPDATE profile_fields
SET
    label = CASE field_key
        WHEN 'first_name' THEN 'Prénom'
        WHEN 'last_name' THEN 'Nom'
        WHEN 'date_of_birth' THEN 'Date de naissance'
        WHEN 'gender' THEN 'Genre'
        WHEN 'city' THEN 'Ville'
        WHEN 'phone' THEN 'Téléphone'
        WHEN 'language' THEN 'Langue'
        WHEN 'about' THEN 'À propos'
        WHEN 'fitness_goal' THEN 'Objectif fitness'
        ELSE label
    END,
    placeholder = CASE field_key
        WHEN 'first_name' THEN 'Ex. Amira'
        WHEN 'last_name' THEN 'Ex. Ben Ali'
        WHEN 'city' THEN 'Tunis, Paris, Casablanca…'
        WHEN 'phone' THEN '20 000 000'
        WHEN 'about' THEN 'Quelques mots sur vous'
        WHEN 'fitness_goal' THEN 'Ex. prise de masse, perte de poids, mobilité…'
        ELSE placeholder
    END,
    options_json = CASE field_key
        WHEN 'gender' THEN '[{"value":"prefer_not","label":"Préfère ne pas dire"},{"value":"female","label":"Femme"},{"value":"male","label":"Homme"},{"value":"other","label":"Autre"}]'
        WHEN 'language' THEN '[{"value":"fr","label":"Français"},{"value":"en","label":"English"},{"value":"ar","label":"العربية"}]'
        ELSE options_json
    END,
    section_key = CASE
        WHEN field_key IN ('first_name', 'last_name', 'date_of_birth', 'gender', 'city', 'phone', 'language') THEN 'identity'
        WHEN field_key IN ('about', 'fitness_goal') THEN 'profession'
        ELSE section_key
    END,
    section_label = CASE
        WHEN field_key IN ('first_name', 'last_name', 'date_of_birth', 'gender', 'city', 'phone', 'language') THEN 'Identité & contact'
        WHEN field_key IN ('about', 'fitness_goal') THEN 'Profil'
        ELSE section_label
    END
WHERE field_key IN (
    'first_name', 'last_name', 'date_of_birth', 'gender', 'city', 'phone', 'language', 'about', 'fitness_goal'
);

UPDATE profile_fields
SET
    options_json = '[{"value":"gym","label":"Salle de sport / gym"},{"value":"studio","label":"Studio (pilates, yoga, boxing…)"},{"value":"club","label":"Club"},{"value":"hotel","label":"Hôtel / resort"},{"value":"wellness","label":"Centre bien-être / spa"},{"value":"medical","label":"Centre médical sportif"},{"value":"franchise","label":"Franchise / chaîne"},{"value":"academy","label":"Académie / école"},{"value":"other","label":"Autre"}]',
    help_text = 'Choisissez le type qui décrit le mieux votre structure.'
WHERE field_key = 'establishment_type';

INSERT INTO profile_fields (
    id, field_key, label, field_type, placeholder, options_json, required, max_length, sort_order,
    section_key, section_label, section_icon, help_text, accept
) VALUES
('22222222-2222-2222-2222-222222222051', 'identity_document', 'Pièce d’identité', 'FILE', NULL, NULL, TRUE, NULL, 15,
 'identity', 'Identité & contact', 'badge', 'CIN ou passeport · PDF ou image · max 10 Mo.', 'application/pdf,image/jpeg,image/png'),
('22222222-2222-2222-2222-222222222052', 'educations', 'Formations / études', 'REPEATABLE', NULL,
 '{"items":[{"key":"school","label":"Établissement","type":"text","required":true},{"key":"diploma","label":"Diplôme","type":"text","required":true},{"key":"year","label":"Année","type":"text"},{"key":"notes","label":"Précision","type":"textarea"}]}',
 FALSE, 20000, 125, 'documents', 'CV & diplômes', 'description', 'Ex. Licence STAPS, Université de Tunis, 2019.', NULL),
('22222222-2222-2222-2222-222222222053', 'video_links', 'Liens vidéo', 'REPEATABLE', NULL,
 '{"items":[{"key":"url","label":"Lien YouTube ou Vimeo","type":"text","required":true}]}',
 FALSE, 8000, 155, 'media', 'Langues, vidéos & références', 'translate', 'Collez un lien public, en plus ou à la place d’un fichier.', NULL),
('22222222-2222-2222-2222-222222222082', 'representative_cin', 'CIN / n° pièce d’identité', 'TEXT', 'N° CIN du représentant ou du compte', NULL, TRUE, 40, 185,
 'org_legal', 'Pièces juridiques', 'gavel', 'Identité de la personne qui ouvre le compte ou du représentant légal.', NULL)
ON CONFLICT (id) DO NOTHING;

-- Professionnel : reconstruire le mapping
DELETE FROM role_profile_fields
WHERE role_id = '11111111-1111-1111-1111-111111111003';

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order, visibility_required) VALUES
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222030', TRUE, 10, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222051', TRUE, 15, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222001', TRUE, 20, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222002', TRUE, 30, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222003', TRUE, 35, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222004', TRUE, 36, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222006', TRUE, 40, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222005', TRUE, 50, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222031', TRUE, 60, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222009', TRUE, 65, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222032', FALSE, 70, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222033', FALSE, 80, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222034', FALSE, 90, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222035', FALSE, 100, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222036', FALSE, 110, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222052', FALSE, 125, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222037', FALSE, 130, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222038', FALSE, 140, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222039', FALSE, 150, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222040', FALSE, 155, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222053', FALSE, 158, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222041', FALSE, 160, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222042', FALSE, 170, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222043', FALSE, 180, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222044', FALSE, 190, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222045', FALSE, 200, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222046', TRUE, 210, TRUE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222047', FALSE, 220, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222048', FALSE, 230, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222049', FALSE, 240, FALSE),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222050', FALSE, 250, FALSE);

-- Membre : dossier court
DELETE FROM role_profile_fields
WHERE role_id = '11111111-1111-1111-1111-111111111001';

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order, visibility_required) VALUES
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222030', FALSE, 10, FALSE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222001', TRUE, 20, TRUE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222002', TRUE, 30, TRUE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222003', FALSE, 35, FALSE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222004', FALSE, 36, FALSE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222005', TRUE, 50, TRUE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222006', TRUE, 60, TRUE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222007', FALSE, 70, FALSE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222008', FALSE, 80, FALSE),
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222009', FALSE, 90, FALSE);

-- Employeur : alléger les * , garder le dossier CDC, docs optionnels pour Terminer
DELETE FROM role_profile_fields
WHERE role_id = '11111111-1111-1111-1111-111111111004';

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order, visibility_required)
SELECT '11111111-1111-1111-1111-111111111004', f.id,
    CASE f.field_key
        WHEN 'organization_logo' THEN TRUE
        WHEN 'trade_name' THEN TRUE
        WHEN 'legal_name' THEN TRUE
        WHEN 'establishment_type' THEN TRUE
        WHEN 'org_country' THEN TRUE
        WHEN 'org_city' THEN TRUE
        WHEN 'org_phone' THEN TRUE
        WHEN 'org_email' THEN TRUE
        WHEN 'representative_cin' THEN TRUE
        WHEN 'trade_register_number' THEN TRUE
        WHEN 'tax_id' THEN TRUE
        ELSE FALSE
    END,
    f.sort_order,
    CASE f.field_key
        WHEN 'patente_document' THEN TRUE
        WHEN 'trade_register_document' THEN TRUE
        WHEN 'tax_id_document' THEN TRUE
        WHEN 'legal_documents' THEN TRUE
        ELSE FALSE
    END
FROM profile_fields f
WHERE f.field_key IN (
    'organization_logo', 'trade_name', 'legal_name', 'organization_description', 'establishment_type',
    'org_country', 'org_city', 'org_address', 'website', 'social_networks', 'org_phone', 'org_email',
    'patente_number', 'patente_document', 'trade_register_number', 'trade_register_document',
    'tax_id', 'tax_id_document', 'representative_cin', 'legal_representative', 'legal_documents',
    'recruitment_history'
);

-- Autres rôles entreprise : retirer historique recrutement + statut vérif, assouplir le site
DELETE FROM role_profile_fields rpf
USING profile_fields f
WHERE rpf.field_id = f.id
  AND rpf.role_id IN (
    '11111111-1111-1111-1111-111111111006',
    '11111111-1111-1111-1111-111111111007',
    '11111111-1111-1111-1111-111111111008',
    '11111111-1111-1111-1111-111111111009',
    '11111111-1111-1111-1111-111111111010'
  )
  AND f.field_key IN ('recruitment_history', 'verification_status');

UPDATE role_profile_fields rpf
SET required_override = FALSE
FROM profile_fields f
WHERE rpf.field_id = f.id
  AND f.field_key IN ('website', 'organization_description', 'org_address')
  AND rpf.role_id IN (
    '11111111-1111-1111-1111-111111111006',
    '11111111-1111-1111-1111-111111111007',
    '11111111-1111-1111-1111-111111111008',
    '11111111-1111-1111-1111-111111111009',
    '11111111-1111-1111-1111-111111111010'
  );

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('coaching.manage', 'coaching.discover')
WHERE r.code = 'CANDIDATE'
ON CONFLICT DO NOTHING;

UPDATE users u
SET profile_visible = TRUE
WHERE u.onboarding_completed = TRUE
  AND u.role_id IN (
    SELECT id FROM roles WHERE code IN ('CANDIDATE', 'MEMBER', 'EMPLOYER')
  );
