INSERT INTO profile_fields (
    id, field_key, label, field_type, placeholder, options_json, required, max_length, sort_order,
    section_key, section_label, section_icon, help_text, accept
) VALUES
('22222222-2222-2222-2222-222222222060', 'organization_logo', 'Logo', 'PHOTO', NULL, NULL, FALSE, NULL, 10,
 'org_identity', 'Identité de l’établissement', 'storefront', 'PNG, JPG ou WEBP · fond simple, max 5 Mo.', 'image/jpeg,image/png,image/webp'),
('22222222-2222-2222-2222-222222222061', 'trade_name', 'Nom commercial', 'TEXT', 'Nom sous lequel vous êtes connus', NULL, FALSE, 160, 20,
 'org_identity', 'Identité de l’établissement', 'storefront', NULL, NULL),
('22222222-2222-2222-2222-222222222062', 'legal_name', 'Raison sociale', 'TEXT', 'Nom juridique de la société', NULL, FALSE, 200, 30,
 'org_identity', 'Identité de l’établissement', 'storefront', NULL, NULL),
('22222222-2222-2222-2222-222222222063', 'organization_description', 'Description', 'TEXTAREA', 'Présentez votre établissement, votre offre et votre public.', NULL, FALSE, 1200, 40,
 'org_identity', 'Identité de l’établissement', 'storefront', NULL, NULL),
('22222222-2222-2222-2222-222222222064', 'establishment_type', 'Type d’établissement', 'SELECT', NULL,
 '[{"value":"gym","label":"Salle de sport / Gym"},{"value":"studio","label":"Studio"},{"value":"academy","label":"Académie / École"},{"value":"club","label":"Club / Employeur"},{"value":"supplier","label":"Fournisseur"},{"value":"service","label":"Prestataire de services"},{"value":"events","label":"Organisateur d’événements"},{"value":"creator","label":"Expert / Créateur"},{"value":"other","label":"Autre"}]',
 FALSE, 32, 50, 'org_identity', 'Identité de l’établissement', 'storefront', NULL, NULL),
('22222222-2222-2222-2222-222222222065', 'org_country', 'Pays', 'COUNTRY', NULL, NULL, FALSE, 36, 60,
 'org_location', 'Localisation', 'location_on', 'Pré-rempli depuis l’étape précédente.', NULL),
('22222222-2222-2222-2222-222222222066', 'org_city', 'Ville', 'CITY', 'Tunis, Paris, Casablanca…', NULL, FALSE, 80, 70,
 'org_location', 'Localisation', 'location_on', NULL, NULL),
('22222222-2222-2222-2222-222222222067', 'org_address', 'Adresse', 'TEXT', 'Rue, numéro, complément', NULL, FALSE, 200, 80,
 'org_location', 'Localisation', 'location_on', NULL, NULL),
('22222222-2222-2222-2222-222222222068', 'website', 'Site internet', 'URL', 'https://www.exemple.com', NULL, FALSE, 200, 90,
 'org_contact', 'Contact & réseaux', 'call', NULL, NULL),
('22222222-2222-2222-2222-222222222069', 'social_networks', 'Réseaux sociaux', 'REPEATABLE', NULL,
 '{"items":[{"key":"network","label":"Réseau","type":"select","required":true,"options":[{"value":"instagram","label":"Instagram"},{"value":"facebook","label":"Facebook"},{"value":"linkedin","label":"LinkedIn"},{"value":"tiktok","label":"TikTok"},{"value":"youtube","label":"YouTube"},{"value":"x","label":"X"},{"value":"other","label":"Autre"}]},{"key":"url","label":"Lien","type":"text","required":true}]}',
 FALSE, 8000, 100, 'org_contact', 'Contact & réseaux', 'call', 'Ajoutez vos pages officielles.', NULL),
('22222222-2222-2222-2222-222222222070', 'org_phone', 'Téléphone', 'TEL', '70 000 000', NULL, FALSE, 32, 110,
 'org_contact', 'Contact & réseaux', 'call', NULL, NULL),
('22222222-2222-2222-2222-222222222071', 'org_email', 'E-mail de contact', 'EMAIL', 'contact@entreprise.com', NULL, FALSE, 255, 120,
 'org_contact', 'Contact & réseaux', 'call', NULL, NULL),
('22222222-2222-2222-2222-222222222072', 'patente_number', 'Patente', 'TEXT', 'N° de patente', NULL, FALSE, 80, 130,
 'org_legal', 'Pièces juridiques', 'gavel', NULL, NULL),
('22222222-2222-2222-2222-222222222073', 'patente_document', 'Justificatif de patente', 'FILE', NULL, NULL, FALSE, NULL, 140,
 'org_legal', 'Pièces juridiques', 'gavel', 'PDF ou image · max 10 Mo.', 'application/pdf,image/jpeg,image/png'),
('22222222-2222-2222-2222-222222222074', 'trade_register_number', 'Registre de commerce', 'TEXT', 'N° RC / RNE', NULL, FALSE, 80, 150,
 'org_legal', 'Pièces juridiques', 'gavel', NULL, NULL),
('22222222-2222-2222-2222-222222222075', 'trade_register_document', 'Extrait du registre de commerce', 'FILE', NULL, NULL, FALSE, NULL, 160,
 'org_legal', 'Pièces juridiques', 'gavel', 'PDF ou image · max 10 Mo.', 'application/pdf,image/jpeg,image/png'),
('22222222-2222-2222-2222-222222222076', 'tax_id', 'Matricule fiscal', 'TEXT', 'N° de matricule fiscal', NULL, FALSE, 80, 170,
 'org_legal', 'Pièces juridiques', 'gavel', NULL, NULL),
('22222222-2222-2222-2222-222222222077', 'tax_id_document', 'Justificatif fiscal', 'FILE', NULL, NULL, FALSE, NULL, 180,
 'org_legal', 'Pièces juridiques', 'gavel', 'PDF ou image · max 10 Mo.', 'application/pdf,image/jpeg,image/png'),
('22222222-2222-2222-2222-222222222078', 'legal_representative', 'Représentant légal', 'REPEATABLE', NULL,
 '{"items":[{"key":"name","label":"Nom et prénom","type":"text","required":true},{"key":"title","label":"Fonction","type":"text","required":true},{"key":"id_number","label":"N° pièce d’identité","type":"text"},{"key":"email","label":"E-mail","type":"text"},{"key":"phone","label":"Téléphone","type":"text"}]}',
 FALSE, 8000, 190, 'org_legal', 'Pièces juridiques', 'gavel', 'Personne habilitée à engager la structure.', NULL),
('22222222-2222-2222-2222-222222222079', 'legal_documents', 'Documents juridiques', 'FILES', NULL, NULL, FALSE, NULL, 200,
 'org_legal', 'Pièces juridiques', 'gavel', 'Statuts, procuration, RNE… PDF ou images · max 10 Mo.', 'application/pdf,image/jpeg,image/png'),
('22222222-2222-2222-2222-222222222080', 'recruitment_history', 'Historique des recrutements', 'REPEATABLE', NULL,
 '{"items":[{"key":"role","label":"Poste recruté","type":"text","required":true},{"key":"year","label":"Année","type":"text"},{"key":"count","label":"Nombre","type":"text"},{"key":"notes","label":"Détail","type":"textarea"}]}',
 FALSE, 8000, 210, 'org_hiring', 'Recrutement', 'work_history', 'Indiquez les recrutements déjà réalisés.', NULL),
('22222222-2222-2222-2222-222222222081', 'verification_status', 'Statut de vérification', 'SELECT', NULL,
 '[{"value":"pending","label":"En attente de vérification"},{"value":"unverified","label":"Non vérifié"},{"value":"verified","label":"Vérifié"},{"value":"rejected","label":"Refusé"}]',
 FALSE, 32, 220, 'org_verification', 'Vérification', 'verified', 'Attribué par Fitness Uplink après examen des pièces.', NULL);

DELETE FROM role_profile_fields
WHERE role_id IN (
    '11111111-1111-1111-1111-111111111004',
    '11111111-1111-1111-1111-111111111005',
    '11111111-1111-1111-1111-111111111006',
    '11111111-1111-1111-1111-111111111007',
    '11111111-1111-1111-1111-111111111008',
    '11111111-1111-1111-1111-111111111009',
    '11111111-1111-1111-1111-111111111010'
);

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order)
SELECT r.id, f.id, FALSE, f.sort_order
FROM roles r
CROSS JOIN profile_fields f
WHERE r.category = 'BUSINESS'
  AND r.selectable = TRUE
  AND f.field_key IN (
    'organization_logo',
    'trade_name',
    'legal_name',
    'organization_description',
    'establishment_type',
    'org_country',
    'org_city',
    'org_address',
    'website',
    'social_networks',
    'org_phone',
    'org_email',
    'patente_number',
    'patente_document',
    'trade_register_number',
    'trade_register_document',
    'tax_id',
    'tax_id_document',
    'legal_representative',
    'legal_documents',
    'recruitment_history',
    'verification_status'
  );
