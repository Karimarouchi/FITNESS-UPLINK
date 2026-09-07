-- Identity for candidates: photo and city are mandatory before leaving onboarding.
UPDATE profile_fields
SET required = TRUE
WHERE field_key = 'professional_photo';

UPDATE role_profile_fields
SET required_override = TRUE
WHERE role_id = '11111111-1111-1111-1111-111111111003'
  AND field_id IN (
    '22222222-2222-2222-2222-222222222030',
    '22222222-2222-2222-2222-222222222005'
  );
