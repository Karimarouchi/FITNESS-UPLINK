UPDATE profile_fields
SET required = TRUE
WHERE field_key IN (
    'organization_logo',
    'trade_name',
    'legal_name',
    'organization_description',
    'establishment_type',
    'org_country',
    'org_city',
    'org_address',
    'website',
    'org_phone',
    'org_email',
    'patente_number',
    'trade_register_number',
    'tax_id'
);

UPDATE role_profile_fields rpf
SET required_override = TRUE
FROM profile_fields f
WHERE rpf.field_id = f.id
  AND f.field_key IN (
    'organization_logo',
    'trade_name',
    'legal_name',
    'organization_description',
    'establishment_type',
    'org_country',
    'org_city',
    'org_address',
    'website',
    'org_phone',
    'org_email',
    'patente_number',
    'trade_register_number',
    'tax_id'
  );
