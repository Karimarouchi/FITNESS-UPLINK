CREATE TABLE roles (
    id UUID PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(120) NOT NULL,
    description TEXT,
    category VARCHAR(64) NOT NULL,
    category_label VARCHAR(120) NOT NULL,
    icon VARCHAR(80) NOT NULL,
    selectable BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE countries (
    id UUID PRIMARY KEY,
    iso2 VARCHAR(2) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    flag_emoji VARCHAR(16) NOT NULL,
    calling_code VARCHAR(8) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE profile_fields (
    id UUID PRIMARY KEY,
    field_key VARCHAR(64) NOT NULL UNIQUE,
    label VARCHAR(120) NOT NULL,
    field_type VARCHAR(32) NOT NULL,
    placeholder VARCHAR(160),
    options_json TEXT,
    required BOOLEAN NOT NULL DEFAULT FALSE,
    max_length INTEGER,
    sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE role_profile_fields (
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES profile_fields (id) ON DELETE CASCADE,
    required_override BOOLEAN,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (role_id, field_id)
);

CREATE TABLE user_profile_values (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    field_key VARCHAR(64) NOT NULL,
    value TEXT,
    PRIMARY KEY (user_id, field_key)
);

INSERT INTO roles (id, code, label, description, category, category_label, icon, selectable, sort_order) VALUES
('11111111-1111-1111-1111-111111111001', 'MEMBER', 'Member', 'Train, track and connect with the community.', 'FOR_YOU', 'FOR YOU', 'person', TRUE, 10),
('11111111-1111-1111-1111-111111111002', 'COACH', 'Coach', 'Coach athletes and manage programs.', 'PROFESSIONAL', 'PROFESSIONAL', 'sports', TRUE, 20),
('11111111-1111-1111-1111-111111111003', 'CANDIDATE', 'Candidate', 'Apply to roles in the fitness industry.', 'PROFESSIONAL', 'PROFESSIONAL', 'assignment_ind', TRUE, 30),
('11111111-1111-1111-1111-111111111004', 'EMPLOYER', 'Employer', 'Hire talent for your organization.', 'BUSINESS', 'BUSINESS & ORGANIZATIONS', 'badge', TRUE, 40),
('11111111-1111-1111-1111-111111111005', 'GYM', 'Gym', 'Operate a gym or training facility.', 'BUSINESS', 'BUSINESS & ORGANIZATIONS', 'fitness_center', TRUE, 50),
('11111111-1111-1111-1111-111111111006', 'ACADEMY', 'Academy', 'Run an academy or training school.', 'BUSINESS', 'BUSINESS & ORGANIZATIONS', 'school', TRUE, 60),
('11111111-1111-1111-1111-111111111007', 'SUPPLIER', 'Supplier', 'Supply equipment and products.', 'BUSINESS', 'BUSINESS & ORGANIZATIONS', 'local_shipping', TRUE, 70),
('11111111-1111-1111-1111-111111111008', 'SERVICE_PROVIDER', 'Service Provider', 'Offer professional fitness services.', 'BUSINESS', 'BUSINESS & ORGANIZATIONS', 'handyman', TRUE, 80),
('11111111-1111-1111-1111-111111111009', 'EVENT_ORGANIZER', 'Event Organizer', 'Organize competitions and events.', 'BUSINESS', 'BUSINESS & ORGANIZATIONS', 'event_available', TRUE, 90),
('11111111-1111-1111-1111-111111111010', 'EXPERT_CREATOR', 'Expert / Creator', 'Share expertise and content.', 'BUSINESS', 'BUSINESS & ORGANIZATIONS', 'restaurant', TRUE, 100),
('11111111-1111-1111-1111-111111111099', 'SUPER_ADMIN', 'Super Admin', 'Platform administration.', 'SYSTEM', 'SYSTEM', 'admin_panel_settings', FALSE, 999);

INSERT INTO countries (id, iso2, name, flag_emoji, calling_code, sort_order) VALUES
(gen_random_uuid(), 'TN', 'Tunisia', '🇹🇳', '+216', 10),
(gen_random_uuid(), 'FR', 'France', '🇫🇷', '+33', 20),
(gen_random_uuid(), 'CA', 'Canada', '🇨🇦', '+1', 30),
(gen_random_uuid(), 'US', 'United States', '🇺🇸', '+1', 40),
(gen_random_uuid(), 'GB', 'United Kingdom', '🇬🇧', '+44', 50),
(gen_random_uuid(), 'DE', 'Germany', '🇩🇪', '+49', 60),
(gen_random_uuid(), 'IT', 'Italy', '🇮🇹', '+39', 70),
(gen_random_uuid(), 'ES', 'Spain', '🇪🇸', '+34', 80),
(gen_random_uuid(), 'PT', 'Portugal', '🇵🇹', '+351', 90),
(gen_random_uuid(), 'BE', 'Belgium', '🇧🇪', '+32', 100),
(gen_random_uuid(), 'CH', 'Switzerland', '🇨🇭', '+41', 110),
(gen_random_uuid(), 'NL', 'Netherlands', '🇳🇱', '+31', 120),
(gen_random_uuid(), 'MA', 'Morocco', '🇲🇦', '+212', 130),
(gen_random_uuid(), 'DZ', 'Algeria', '🇩🇿', '+213', 140),
(gen_random_uuid(), 'AE', 'United Arab Emirates', '🇦🇪', '+971', 150),
(gen_random_uuid(), 'SA', 'Saudi Arabia', '🇸🇦', '+966', 160),
(gen_random_uuid(), 'QA', 'Qatar', '🇶🇦', '+974', 170),
(gen_random_uuid(), 'EG', 'Egypt', '🇪🇬', '+20', 180),
(gen_random_uuid(), 'AU', 'Australia', '🇦🇺', '+61', 190),
(gen_random_uuid(), 'JP', 'Japan', '🇯🇵', '+81', 200),
(gen_random_uuid(), 'BR', 'Brazil', '🇧🇷', '+55', 210),
(gen_random_uuid(), 'MX', 'Mexico', '🇲🇽', '+52', 220),
(gen_random_uuid(), 'SE', 'Sweden', '🇸🇪', '+46', 230),
(gen_random_uuid(), 'NO', 'Norway', '🇳🇴', '+47', 240),
(gen_random_uuid(), 'TR', 'Turkey', '🇹🇷', '+90', 250);

INSERT INTO profile_fields (id, field_key, label, field_type, placeholder, options_json, required, max_length, sort_order) VALUES
('22222222-2222-2222-2222-222222222001', 'first_name', 'First name', 'TEXT', 'e.g. Jane', NULL, TRUE, 80, 10),
('22222222-2222-2222-2222-222222222002', 'last_name', 'Last name', 'TEXT', 'e.g. Doe', NULL, TRUE, 80, 20),
('22222222-2222-2222-2222-222222222003', 'date_of_birth', 'Date of birth', 'DATE', NULL, NULL, FALSE, NULL, 30),
('22222222-2222-2222-2222-222222222004', 'gender', 'Gender', 'SELECT', NULL, '[{"value":"prefer_not","label":"Prefer not to say"},{"value":"female","label":"Female"},{"value":"male","label":"Male"},{"value":"other","label":"Other"}]', FALSE, 32, 40),
('22222222-2222-2222-2222-222222222005', 'city', 'City / Location', 'CITY', 'Search city...', NULL, TRUE, 80, 50),
('22222222-2222-2222-2222-222222222006', 'phone', 'Phone number', 'TEL', '(555) 000-0000', NULL, FALSE, 32, 60),
('22222222-2222-2222-2222-222222222007', 'language', 'Language', 'SELECT', NULL, '[{"value":"en","label":"English"},{"value":"fr","label":"French"},{"value":"ar","label":"Arabic"}]', FALSE, 8, 70),
('22222222-2222-2222-2222-222222222008', 'about', 'About you', 'TEXTAREA', 'Share a brief bio or your fitness philosophy...', NULL, FALSE, 250, 80),
('22222222-2222-2222-2222-222222222009', 'fitness_goal', 'Fitness goal', 'TEXT', 'Strength, endurance, mobility...', NULL, FALSE, 120, 90),
('22222222-2222-2222-2222-222222222010', 'specialty', 'Coaching specialty', 'TEXT', 'Strength, HIIT, rehab...', NULL, TRUE, 120, 90),
('22222222-2222-2222-2222-222222222011', 'years_experience', 'Years of experience', 'TEXT', 'e.g. 5', NULL, FALSE, 8, 100),
('22222222-2222-2222-2222-222222222012', 'desired_role', 'Desired role', 'TEXT', 'Coach, physiotherapist...', NULL, TRUE, 120, 90),
('22222222-2222-2222-2222-222222222013', 'company_name', 'Company name', 'TEXT', 'Organization name', NULL, TRUE, 160, 90),
('22222222-2222-2222-2222-222222222014', 'company_size', 'Company size', 'SELECT', NULL, '[{"value":"1-10","label":"1-10"},{"value":"11-50","label":"11-50"},{"value":"51-200","label":"51-200"},{"value":"200+","label":"200+"}]', FALSE, 16, 100),
('22222222-2222-2222-2222-222222222015', 'gym_name', 'Gym name', 'TEXT', 'Your facility name', NULL, TRUE, 160, 90),
('22222222-2222-2222-2222-222222222016', 'academy_name', 'Academy name', 'TEXT', 'Your academy name', NULL, TRUE, 160, 90),
('22222222-2222-2222-2222-222222222017', 'product_category', 'Product category', 'TEXT', 'Equipment, apparel, nutrition...', NULL, FALSE, 120, 100),
('22222222-2222-2222-2222-222222222018', 'service_category', 'Service category', 'TEXT', 'Physio, recovery, consulting...', NULL, TRUE, 120, 90),
('22222222-2222-2222-2222-222222222019', 'organization_name', 'Organization name', 'TEXT', 'Event organization', NULL, TRUE, 160, 90),
('22222222-2222-2222-2222-222222222020', 'expertise_area', 'Expertise area', 'TEXT', 'Nutrition, content, performance...', NULL, TRUE, 120, 90);

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order)
SELECT r.id, f.id, f.required, f.sort_order
FROM roles r
CROSS JOIN profile_fields f
WHERE r.selectable = TRUE
  AND f.field_key IN ('first_name', 'last_name', 'date_of_birth', 'gender', 'city', 'phone', 'language', 'about');

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order) VALUES
('11111111-1111-1111-1111-111111111001', '22222222-2222-2222-2222-222222222009', FALSE, 90),
('11111111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222010', TRUE, 90),
('11111111-1111-1111-1111-111111111002', '22222222-2222-2222-2222-222222222011', FALSE, 100),
('11111111-1111-1111-1111-111111111003', '22222222-2222-2222-2222-222222222012', TRUE, 90),
('11111111-1111-1111-1111-111111111004', '22222222-2222-2222-2222-222222222013', TRUE, 90),
('11111111-1111-1111-1111-111111111004', '22222222-2222-2222-2222-222222222014', FALSE, 100),
('11111111-1111-1111-1111-111111111005', '22222222-2222-2222-2222-222222222015', TRUE, 90),
('11111111-1111-1111-1111-111111111006', '22222222-2222-2222-2222-222222222016', TRUE, 90),
('11111111-1111-1111-1111-111111111007', '22222222-2222-2222-2222-222222222013', TRUE, 90),
('11111111-1111-1111-1111-111111111007', '22222222-2222-2222-2222-222222222017', FALSE, 100),
('11111111-1111-1111-1111-111111111008', '22222222-2222-2222-2222-222222222018', TRUE, 90),
('11111111-1111-1111-1111-111111111009', '22222222-2222-2222-2222-222222222019', TRUE, 90),
('11111111-1111-1111-1111-111111111010', '22222222-2222-2222-2222-222222222020', TRUE, 90);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD COLUMN role_id UUID;
ALTER TABLE users ADD COLUMN country_id UUID;
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE users
SET role_id = '11111111-1111-1111-1111-111111111099',
    onboarding_completed = TRUE
WHERE role = 'SUPER_ADMIN';

ALTER TABLE users DROP COLUMN role;
ALTER TABLE users
    ADD CONSTRAINT users_role_fk FOREIGN KEY (role_id) REFERENCES roles (id);
ALTER TABLE users
    ADD CONSTRAINT users_country_fk FOREIGN KEY (country_id) REFERENCES countries (id);

CREATE INDEX idx_roles_selectable_sort ON roles (selectable, sort_order);
CREATE INDEX idx_countries_name ON countries (name);
CREATE INDEX idx_user_profile_values_user ON user_profile_values (user_id);
