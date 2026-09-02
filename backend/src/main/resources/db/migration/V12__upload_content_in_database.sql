ALTER TABLE user_uploads
    ADD COLUMN content BYTEA;

ALTER TABLE user_uploads
    ALTER COLUMN storage_path DROP NOT NULL;
