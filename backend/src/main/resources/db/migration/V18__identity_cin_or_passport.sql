INSERT INTO profile_fields (
    id, field_key, label, field_type, placeholder, options_json, required, max_length, sort_order,
    section_key, section_label, section_icon, help_text, accept
) VALUES
(
    '22222222-2222-2222-2222-222222222083',
    'identity_document_type',
    'Type de pièce',
    'SELECT',
    NULL,
    '[{"value":"cin","label":"CIN"},{"value":"passport","label":"Passeport"}]',
    TRUE,
    16,
    12,
    'identity',
    'Identité & contact',
    'badge',
    'Choisissez d’abord CIN ou passeport.',
    NULL
),
(
    '22222222-2222-2222-2222-222222222084',
    'identity_document_number',
    'N° CIN ou passeport',
    'TEXT',
    'Ex. 12345678 ou A1234567',
    NULL,
    TRUE,
    40,
    13,
    'identity',
    'Identité & contact',
    'badge',
    'Saisissez le numéro de la pièce choisie.',
    NULL
)
ON CONFLICT (id) DO NOTHING;

UPDATE profile_fields
SET
    label = 'Photo de la pièce',
    help_text = 'Photo ou scan de la CIN / du passeport · PDF ou image · max 10 Mo. Comme le CV.',
    accept = 'application/pdf,image/jpeg,image/png,image/webp',
    sort_order = 14
WHERE field_key = 'identity_document';

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order, visibility_required)
SELECT '11111111-1111-1111-1111-111111111003', f.id, TRUE, f.sort_order, TRUE
FROM profile_fields f
WHERE f.field_key IN ('identity_document_type', 'identity_document_number')
ON CONFLICT (role_id, field_id) DO UPDATE
SET required_override = TRUE,
    sort_order = EXCLUDED.sort_order,
    visibility_required = TRUE;

UPDATE role_profile_fields rpf
SET required_override = TRUE,
    visibility_required = TRUE,
    sort_order = 14
FROM profile_fields f
WHERE rpf.field_id = f.id
  AND f.field_key = 'identity_document'
  AND rpf.role_id = '11111111-1111-1111-1111-111111111003';

INSERT INTO role_profile_fields (role_id, field_id, required_override, sort_order, visibility_required)
SELECT '11111111-1111-1111-1111-111111111004', f.id,
    TRUE,
    CASE f.field_key
        WHEN 'identity_document_type' THEN 182
        WHEN 'identity_document_number' THEN 183
        ELSE 184
    END,
    CASE f.field_key
        WHEN 'identity_document' THEN TRUE
        ELSE FALSE
    END
FROM profile_fields f
WHERE f.field_key IN ('identity_document_type', 'identity_document_number', 'identity_document')
ON CONFLICT (role_id, field_id) DO UPDATE
SET required_override = TRUE,
    sort_order = EXCLUDED.sort_order,
    visibility_required = EXCLUDED.visibility_required;

UPDATE role_profile_fields rpf
SET required_override = FALSE,
    visibility_required = FALSE
FROM profile_fields f
WHERE rpf.field_id = f.id
  AND f.field_key = 'representative_cin'
  AND rpf.role_id = '11111111-1111-1111-1111-111111111004';

INSERT INTO user_profile_values (user_id, field_key, value)
SELECT v.user_id, 'identity_document_number', v.value
FROM user_profile_values v
WHERE v.field_key = 'representative_cin'
  AND v.value IS NOT NULL
  AND TRIM(v.value) <> ''
ON CONFLICT (user_id, field_key) DO NOTHING;
