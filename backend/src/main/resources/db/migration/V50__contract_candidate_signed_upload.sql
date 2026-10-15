-- The candidate downloads the contract, signs it by hand and uploads the signed PDF.
ALTER TABLE contracts ADD COLUMN candidate_upload_id UUID;
