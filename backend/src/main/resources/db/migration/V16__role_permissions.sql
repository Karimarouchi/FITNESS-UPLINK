CREATE TABLE permissions (
    id UUID PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    module VARCHAR(40) NOT NULL,
    module_label VARCHAR(80) NOT NULL,
    label VARCHAR(160) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX idx_role_permissions_permission ON role_permissions (permission_id);

INSERT INTO permissions (id, code, module, module_label, label, description, sort_order) VALUES
(gen_random_uuid(), 'account.profile', 'account', 'Compte', 'Profil', 'Voir et modifier son profil', 10),
(gen_random_uuid(), 'account.notifications', 'account', 'Compte', 'Notifications', 'Consulter les notifications', 20),
(gen_random_uuid(), 'account.settings', 'account', 'Compte', 'Paramètres', 'Accéder aux paramètres du compte', 30),
(gen_random_uuid(), 'hire.profile.professional', 'hire', 'Recrutement', 'Profil professionnel', 'CV, diplômes, vidéos, disponibilités', 110),
(gen_random_uuid(), 'hire.jobs.apply', 'hire', 'Recrutement', 'Postuler aux offres', 'Voir les opportunités et candidater', 120),
(gen_random_uuid(), 'hire.applications.view', 'hire', 'Recrutement', 'Suivre ses candidatures', 'Voir le suivi de ses candidatures', 130),
(gen_random_uuid(), 'hire.contracts.candidate', 'hire', 'Recrutement', 'Contrats candidat', 'Signer et consulter ses contrats', 140),
(gen_random_uuid(), 'hire.candidates.search', 'hire', 'Recrutement', 'Rechercher des talents', 'Annuaire et fiches candidats', 150),
(gen_random_uuid(), 'hire.favorites', 'hire', 'Recrutement', 'Favoris talents', 'Enregistrer des profils', 160),
(gen_random_uuid(), 'hire.pipeline', 'hire', 'Recrutement', 'Pipeline', 'Gérer le suivi de recrutement', 170),
(gen_random_uuid(), 'hire.jobs.manage', 'hire', 'Recrutement', 'Offres d’emploi', 'Créer et publier des offres', 180),
(gen_random_uuid(), 'hire.contracts.employer', 'hire', 'Recrutement', 'Contrats employeur', 'Préparer et envoyer des contrats', 190),
(gen_random_uuid(), 'coaching.discover', 'coaching', 'Coaching', 'Découvrir les coachs', 'Recherche de coaching privé', 210),
(gen_random_uuid(), 'coaching.manage', 'coaching', 'Coaching', 'Gérer le coaching', 'Agenda, services et séances', 220),
(gen_random_uuid(), 'marketplace.browse', 'marketplace', 'Marketplace', 'Parcourir le catalogue', 'Consulter les produits', 310),
(gen_random_uuid(), 'marketplace.manage', 'marketplace', 'Marketplace', 'Gérer le catalogue', 'Produits et demandes de devis', 320),
(gen_random_uuid(), 'services.browse', 'services', 'Services', 'Parcourir les prestataires', 'Annuaire de services B2B', 410),
(gen_random_uuid(), 'services.manage', 'services', 'Services', 'Gérer les services', 'Offre de services et demandes', 420),
(gen_random_uuid(), 'academy.browse', 'academy', 'Académie', 'Parcourir les formations', 'Catalogue de formations', 510),
(gen_random_uuid(), 'academy.manage', 'academy', 'Académie', 'Gérer l’académie', 'Formations, sessions, inscrits', 520),
(gen_random_uuid(), 'events.browse', 'events', 'Events', 'Parcourir les événements', 'Agenda public des events', 610),
(gen_random_uuid(), 'events.manage', 'events', 'Events', 'Gérer les événements', 'Création et inscriptions', 620),
(gen_random_uuid(), 'content.browse', 'content', 'Contenus', 'Consulter les contenus', 'News, recettes, programmes', 710),
(gen_random_uuid(), 'content.publish', 'content', 'Contenus', 'Publier des contenus', 'Recettes, articles, programmes', 720),
(gen_random_uuid(), 'admin.users', 'admin', 'Administration', 'Utilisateurs', 'Lister, bloquer et supprimer des comptes', 810),
(gen_random_uuid(), 'admin.verifications', 'admin', 'Administration', 'Vérifications', 'Valider identité et documents', 820),
(gen_random_uuid(), 'admin.modules', 'admin', 'Administration', 'Modules', 'Vue d’ensemble des modules', 830),
(gen_random_uuid(), 'admin.config', 'admin', 'Administration', 'Configuration', 'Pays, langues, paramètres', 840),
(gen_random_uuid(), 'admin.roles', 'admin', 'Administration', 'Rôles et permissions', 'Attribuer les droits de chaque rôle', 850);

UPDATE roles SET selectable = FALSE WHERE code IN ('COACH', 'GYM');

UPDATE roles SET
    label = 'Membre',
    description = 'Pratiquant : coaching, programmes, recettes, événements et favoris.'
WHERE code = 'MEMBER';

UPDATE roles SET
    label = 'Professionnel',
    description = 'Coach / candidat : profil professionnel, CV, certifications, emploi et candidatures.'
WHERE code = 'CANDIDATE';

UPDATE roles SET
    label = 'Employeur / salle',
    description = 'Salle, studio ou employeur : offres, recherche de talents, pipeline et contrats.'
WHERE code = 'EMPLOYER';

UPDATE roles SET
    label = 'Académie',
    description = 'Organisme de formation : formations, sessions, inscriptions et certifications.'
WHERE code = 'ACADEMY';

UPDATE roles SET
    label = 'Fournisseur',
    description = 'Marque ou fournisseur : catalogue, produits et demandes de devis.'
WHERE code = 'SUPPLIER';

UPDATE roles SET
    label = 'Prestataire',
    description = 'Prestataire B2B : services, zones couvertes et demandes de contact.'
WHERE code = 'SERVICE_PROVIDER';

UPDATE roles SET
    label = 'Organisateur',
    description = 'Organisateur : événements, inscriptions et participants.'
WHERE code = 'EVENT_ORGANIZER';

UPDATE roles SET
    label = 'Créateur de contenu',
    description = 'Expert nutrition / créateur : recettes, articles et programmes autorisés.'
WHERE code = 'EXPERT_CREATOR';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings',
    'coaching.discover', 'marketplace.browse', 'services.browse',
    'academy.browse', 'events.browse', 'content.browse'
) WHERE r.code = 'MEMBER';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings',
    'hire.profile.professional', 'hire.jobs.apply', 'hire.applications.view', 'hire.contracts.candidate'
) WHERE r.code = 'CANDIDATE';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings',
    'hire.candidates.search', 'hire.favorites', 'hire.pipeline', 'hire.jobs.manage', 'hire.contracts.employer'
) WHERE r.code IN ('EMPLOYER', 'GYM');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings', 'academy.manage'
) WHERE r.code = 'ACADEMY';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings', 'marketplace.manage'
) WHERE r.code = 'SUPPLIER';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings', 'services.manage'
) WHERE r.code = 'SERVICE_PROVIDER';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings', 'events.manage'
) WHERE r.code = 'EVENT_ORGANIZER';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings', 'content.publish'
) WHERE r.code = 'EXPERT_CREATOR';

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON p.code IN (
    'account.profile', 'account.notifications', 'account.settings', 'coaching.manage', 'hire.profile.professional'
) WHERE r.code = 'COACH';
