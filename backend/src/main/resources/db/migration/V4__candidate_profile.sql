ALTER TABLE profile_fields
    ADD COLUMN section_key VARCHAR(64) NOT NULL DEFAULT 'profile',
    ADD COLUMN section_label VARCHAR(120) NOT NULL DEFAULT 'Profile',
    ADD COLUMN section_icon VARCHAR(80) NOT NULL DEFAULT 'person',
    ADD COLUMN help_text VARCHAR(240),
    ADD COLUMN accept VARCHAR(160);

CREATE TABLE user_uploads (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    field_key VARCHAR(64) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(400) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_uploads_user ON user_uploads (user_id, field_key);

UPDATE roles
SET selectable = FALSE
WHERE code = 'COACH';

INSERT INTO profile_fields (
    id, field_key, label, field_type, placeholder, options_json, required, max_length, sort_order,
    section_key, section_label, section_icon, help_text, accept
) VALUES
('22222222-2222-2222-2222-222222222030', 'professional_photo', 'Photo professionnelle', 'PHOTO', NULL, NULL, TRUE, NULL, 10,
 'identity', 'Identité & contact', 'badge', 'JPG ou PNG, max 5 Mo.', 'image/jpeg,image/png,image/webp'),
('22222222-2222-2222-2222-222222222031', 'professional_title', 'Titre professionnel', 'TEXT', 'Coach sportif, préparateur physique…', NULL, TRUE, 120, 60,
 'profession', 'Profil professionnel', 'work', NULL, NULL),
('22222222-2222-2222-2222-222222222032', 'biography', 'Biographie', 'TEXTAREA', 'Présentez votre parcours, votre méthode et ce que vous recherchez.', NULL, FALSE, 800, 70,
 'profession', 'Profil professionnel', 'work', NULL, NULL),
('22222222-2222-2222-2222-222222222033', 'specialties', 'Spécialités', 'TAGS', 'Ajouter une spécialité', '[{"value":"musculation","label":"Musculation"},{"value":"hiit","label":"HIIT"},{"value":"yoga","label":"Yoga"},{"value":"pilates","label":"Pilates"},{"value":"rehab","label":"Réathlétisation"},{"value":"nutrition","label":"Nutrition"},{"value":"crossfit","label":"CrossFit"}]', FALSE, 40, 80,
 'profession', 'Profil professionnel', 'work', 'Ajoutez vos disciplines principales.', NULL),
('22222222-2222-2222-2222-222222222034', 'skills', 'Compétences', 'TAGS', 'Ajouter une compétence', NULL, FALSE, 40, 90,
 'profession', 'Profil professionnel', 'work', NULL, NULL),
('22222222-2222-2222-2222-222222222035', 'experiences', 'Expériences professionnelles', 'REPEATABLE', NULL,
 '{"items":[{"key":"title","label":"Poste","type":"text","required":true},{"key":"company","label":"Employeur / structure","type":"text","required":true},{"key":"start","label":"Début","type":"month"},{"key":"end","label":"Fin","type":"month"},{"key":"description","label":"Missions","type":"textarea"}]}',
 FALSE, 20000, 100, 'experience', 'Parcours', 'timeline', 'Ajoutez vos missions les plus récentes.', NULL),
('22222222-2222-2222-2222-222222222036', 'cv', 'CV', 'FILE', NULL, NULL, FALSE, NULL, 110,
 'documents', 'CV & diplômes', 'description', 'PDF, DOC ou DOCX · max 10 Mo.', 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
('22222222-2222-2222-2222-222222222037', 'diplomas', 'Diplômes', 'FILES', NULL, NULL, FALSE, NULL, 120,
 'documents', 'CV & diplômes', 'description', 'PDF ou images · max 10 Mo chacun.', 'application/pdf,image/jpeg,image/png'),
('22222222-2222-2222-2222-222222222038', 'certifications', 'Certifications', 'FILES', NULL, NULL, FALSE, NULL, 130,
 'documents', 'CV & diplômes', 'description', 'PDF ou images · max 10 Mo chacun.', 'application/pdf,image/jpeg,image/png'),
('22222222-2222-2222-2222-222222222039', 'spoken_languages', 'Langues parlées', 'REPEATABLE', NULL,
 '{"items":[{"key":"language","label":"Langue","type":"text","required":true},{"key":"level","label":"Niveau","type":"select","required":true,"options":[{"value":"a1","label":"A1"},{"value":"a2","label":"A2"},{"value":"b1","label":"B1"},{"value":"b2","label":"B2"},{"value":"c1","label":"C1"},{"value":"c2","label":"C2"},{"value":"native","label":"Natif"}]}]}',
 FALSE, 8000, 140, 'media', 'Langues, vidéos & références', 'translate', NULL, NULL),
('22222222-2222-2222-2222-222222222040', 'presentation_videos', 'Vidéos de présentation', 'FILES', NULL, NULL, FALSE, NULL, 150,
 'media', 'Langues, vidéos & références', 'translate', 'MP4 ou WebM · max 50 Mo.', 'video/mp4,video/webm'),
('22222222-2222-2222-2222-222222222041', 'professional_references', 'Références professionnelles', 'REPEATABLE', NULL,
 '{"items":[{"key":"name","label":"Nom","type":"text","required":true},{"key":"role","label":"Fonction","type":"text"},{"key":"company","label":"Organisation","type":"text"},{"key":"contact","label":"Email ou téléphone","type":"text"}]}',
 FALSE, 8000, 160, 'media', 'Langues, vidéos & références', 'translate', NULL, NULL),
('22222222-2222-2222-2222-222222222042', 'availability', 'Disponibilités', 'SELECT', NULL,
 '[{"value":"immediate","label":"Immédiate"},{"value":"2_weeks","label":"Sous 2 semaines"},{"value":"1_month","label":"Sous 1 mois"},{"value":"to_discuss","label":"À convenir"}]',
 FALSE, 32, 170, 'contract', 'Disponibilités & contrat', 'event_available', NULL, NULL),
('22222222-2222-2222-2222-222222222043', 'group_class_slots', 'Créneaux pour cours collectifs', 'TAGS', 'Ex. Lundi 18:00', NULL, FALSE, 40, 180,
 'contract', 'Disponibilités & contrat', 'event_available', 'Indiquez vos créneaux habituels.', NULL),
('22222222-2222-2222-2222-222222222044', 'desired_salary', 'Salaire souhaité', 'MONEY', 'Ex. 2500',
 '[{"value":"TND","label":"TND"},{"value":"EUR","label":"EUR"},{"value":"USD","label":"USD"},{"value":"GBP","label":"GBP"},{"value":"MAD","label":"MAD"}]',
 FALSE, 32, 190, 'contract', 'Disponibilités & contrat', 'event_available', NULL, NULL),
('22222222-2222-2222-2222-222222222045', 'contract_types', 'Type de contrat recherché', 'MULTISELECT', NULL,
 '[{"value":"cdi","label":"CDI"},{"value":"cdd","label":"CDD"},{"value":"freelance","label":"Freelance"},{"value":"part_time","label":"Temps partiel"},{"value":"internship","label":"Stage"},{"value":"vacation","label":"Vacation"}]',
 FALSE, 200, 200, 'contract', 'Disponibilités & contrat', 'event_available', NULL, NULL),
('22222222-2222-2222-2222-222222222046', 'current_country', 'Pays actuel', 'COUNTRY', NULL, NULL, TRUE, 36, 210,
 'mobility', 'Mobilité', 'public', 'Pré-rempli depuis l’étape précédente.', NULL),
('22222222-2222-2222-2222-222222222047', 'target_countries', 'Pays recherchés', 'COUNTRY_MULTI', NULL, NULL, FALSE, 2000, 220,
 'mobility', 'Mobilité', 'public', NULL, NULL),
('22222222-2222-2222-2222-222222222048', 'willing_to_relocate', 'Prêt à déménager', 'BOOLEAN', NULL,
 '[{"value":"yes","label":"Oui"},{"value":"no","label":"Non"}]',
 FALSE, 8, 230, 'mobility', 'Mobilité', 'public', NULL, NULL),
('22222222-2222-2222-2222-222222222049', 'preferred_zones', 'Zones préférées', 'TAGS', 'Ex. Grand Tunis, Île-de-France', NULL, FALSE, 60, 240,
 'mobility', 'Mobilité', 'public', NULL, NULL),
('22222222-2222-2222-2222-222222222050', 'international_mission', 'Disponible pour mission internationale', 'BOOLEAN', NULL,
 '[{"value":"yes","label":"Oui"},{"value":"no","label":"Non"}]',
 FALSE, 8, 250, 'mobility', 'Mobilité', 'public', NULL, NULL);

UPDATE profile_fields
SET section_key = 'identity',
    section_label = 'Identité & contact',
    section_icon = 'badge',
    label = CASE field_key
        WHEN 'first_name' THEN 'Prénom'
        WHEN 'last_name' THEN 'Nom'
        WHEN 'city' THEN 'Ville'
        WHEN 'phone' THEN 'Téléphone'
        ELSE label
    END
WHERE field_key IN ('first_name', 'last_name', 'city', 'phone');

DELETE FROM role_profile_fields
WHERE role_id = '11111111-1111-1111-1111-111111111003';

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order) VALUES
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222030', TRUE, 10),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222001', TRUE, 20),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222002', TRUE, 30),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222006', FALSE, 40),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222005', TRUE, 50),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222031', TRUE, 60),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222032', FALSE, 70),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222033', FALSE, 80),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222034', FALSE, 90),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222035', FALSE, 100),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222036', FALSE, 110),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222037', FALSE, 120),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222038', FALSE, 130),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222039', FALSE, 140),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222040', FALSE, 150),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222041', FALSE, 160),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222042', FALSE, 170),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222043', FALSE, 180),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222044', FALSE, 190),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222045', FALSE, 200),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222046', TRUE, 210),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222047', FALSE, 220),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222048', FALSE, 230),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222049', FALSE, 240),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222050', FALSE, 250);
