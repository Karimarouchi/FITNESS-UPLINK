UPDATE role_profile_fields
SET required_override = FALSE
WHERE role_id = '11111111-1111-1111-1111-111111111003'
  AND field_id IN (
    '22222222-2222-2222-2222-222222222030',
    '22222222-2222-2222-2222-222222222005',
    '22222222-2222-2222-2222-222222222031'
  );

UPDATE profile_fields
SET required = FALSE
WHERE field_key IN ('professional_photo', 'professional_title');
