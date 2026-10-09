-- V46: Marketplace v2 — admin post-moderation, item condition, views, buyer <-> supplier messaging

ALTER TABLE products ADD COLUMN item_condition VARCHAR(16) NOT NULL DEFAULT 'NEW';
ALTER TABLE products ADD COLUMN view_count INT NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN hidden_by_admin BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE products ADD COLUMN hidden_reason VARCHAR(500);
ALTER TABLE products ADD COLUMN hidden_at TIMESTAMPTZ;

CREATE INDEX idx_products_visible ON products (active, hidden_by_admin, created_at DESC);

INSERT INTO product_categories (id, name, sort_order, active, created_at, updated_at)
SELECT gen_random_uuid(), c.name, c.sort_order, TRUE, now(), now()
FROM (VALUES
    ('Vêtements de sport', 110),
    ('Chaussures', 120),
    ('Running', 130),
    ('Cyclisme', 140),
    ('Sports collectifs', 150),
    ('Sports de raquette', 160),
    ('Sports de combat', 170),
    ('Sports nautiques', 180),
    ('Outdoor & randonnée', 190),
    ('Yoga', 200),
    ('Nutrition & compléments', 210),
    ('Montres & électronique', 220)
) AS c (name, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM product_categories pc WHERE LOWER(pc.name) = LOWER(c.name));

CREATE TABLE marketplace_conversations (
    id UUID PRIMARY KEY,
    product_id UUID REFERENCES products (id) ON DELETE SET NULL,
    product_name VARCHAR(160) NOT NULL,
    buyer_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    last_message_preview VARCHAR(280),
    last_message_at TIMESTAMPTZ NOT NULL,
    buyer_last_read_at TIMESTAMPTZ,
    supplier_last_read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX ux_marketplace_conv_product_buyer ON marketplace_conversations (product_id, buyer_id);
CREATE INDEX idx_marketplace_conv_buyer ON marketplace_conversations (buyer_id, last_message_at DESC);
CREATE INDEX idx_marketplace_conv_supplier ON marketplace_conversations (supplier_id, last_message_at DESC);

CREATE TABLE marketplace_messages (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES marketplace_conversations (id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_marketplace_messages_conv ON marketplace_messages (conversation_id, created_at);
