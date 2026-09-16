CREATE TABLE product_categories (
    id UUID PRIMARY KEY,
    name VARCHAR(80) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

INSERT INTO product_categories (id, name, sort_order, active, created_at, updated_at) VALUES
(gen_random_uuid(), 'Machines de musculation', 10, TRUE, now(), now()),
(gen_random_uuid(), 'Cardio', 20, TRUE, now(), now()),
(gen_random_uuid(), 'HYROX', 30, TRUE, now(), now()),
(gen_random_uuid(), 'Pilates', 40, TRUE, now(), now()),
(gen_random_uuid(), 'Cross Training', 50, TRUE, now(), now()),
(gen_random_uuid(), 'Accessoires', 60, TRUE, now(), now()),
(gen_random_uuid(), 'Récupération', 70, TRUE, now(), now()),
(gen_random_uuid(), 'Bien-être', 80, TRUE, now(), now()),
(gen_random_uuid(), 'Pièces détachées', 90, TRUE, now(), now()),
(gen_random_uuid(), 'Consommables', 100, TRUE, now(), now());

CREATE TABLE products (
    id UUID PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES product_categories (id),
    name VARCHAR(160) NOT NULL,
    brand VARCHAR(120),
    description TEXT,
    technical_sheet TEXT,
    price_amount NUMERIC(12, 2),
    price_currency VARCHAR(3),
    photos_json TEXT,
    videos_json TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_products_supplier ON products (supplier_id, active);
CREATE INDEX idx_products_category ON products (category_id, active);

CREATE TABLE marketplace_quote_requests (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(160) NOT NULL,
    phone VARCHAR(40),
    message TEXT NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    code_expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    verified_at TIMESTAMPTZ,
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    created_at TIMESTAMPTZ NOT NULL,
    handled_at TIMESTAMPTZ
);

CREATE INDEX idx_marketplace_quotes_supplier ON marketplace_quote_requests (supplier_id, status, created_at DESC);
CREATE INDEX idx_marketplace_quotes_email ON marketplace_quote_requests (email, created_at DESC);
