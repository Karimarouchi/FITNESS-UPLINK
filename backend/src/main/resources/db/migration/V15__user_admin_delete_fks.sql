ALTER TABLE contracts ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_created_by_fkey;
ALTER TABLE contracts
    ADD CONSTRAINT contracts_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_original_upload_id_fkey;
ALTER TABLE contracts
    ADD CONSTRAINT contracts_original_upload_id_fkey
    FOREIGN KEY (original_upload_id) REFERENCES user_uploads (id) ON DELETE SET NULL;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_signed_upload_id_fkey;
ALTER TABLE contracts
    ADD CONSTRAINT contracts_signed_upload_id_fkey
    FOREIGN KEY (signed_upload_id) REFERENCES user_uploads (id) ON DELETE SET NULL;

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_audit_trail_upload_id_fkey;
ALTER TABLE contracts
    ADD CONSTRAINT contracts_audit_trail_upload_id_fkey
    FOREIGN KEY (audit_trail_upload_id) REFERENCES user_uploads (id) ON DELETE SET NULL;
