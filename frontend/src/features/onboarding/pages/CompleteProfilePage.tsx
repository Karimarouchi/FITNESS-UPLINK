import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { destinationFor, type CountrySummary, type ProfileField } from "@/features/auth/types";
import {
  trimValue,
  validateCity,
  validateContactEmail,
  validateDateOfBirth,
  validateName,
  validateOptionalText,
  validatePhone,
  validateTextarea,
  validateUrl,
} from "@/features/auth/validation";
import { Select } from "@/components/ui/Select";
import { completeProfile, fetchCountries, fetchProfileFields, fetchProfileValues, parseCv } from "../api";
import { LocaleSwitch, useOnboardingLocale } from "../LocaleContext";
import { OnboardingBrand } from "../OnboardingFrame";
import { fieldLabel } from "../i18n";
import {
  BooleanToggle,
  CountryMultiField,
  CountrySelectField,
  FileField,
  MoneyField,
  MultiSelectField,
  PhotoField,
  GroupClassSlotsField,
  RepeatableField,
  TagInput,
} from "../ProfileWidgets";

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function hasUploadId(value: string) {
  const parsed = parseJson<unknown>(value, []);
  if (Array.isArray(parsed)) {
    return parsed.some((item) => item && typeof item === "object" && "id" in item && Boolean((item as { id?: string }).id));
  }
  return Boolean(parsed && typeof parsed === "object" && "id" in parsed && (parsed as { id?: string }).id);
}

function firstUploadId(value: string | undefined) {
  const parsed = parseJson<unknown>(value ?? "", []);
  const list = Array.isArray(parsed) ? parsed : parsed && typeof parsed === "object" ? [parsed] : [];
  for (const item of list) {
    if (item && typeof item === "object" && "id" in item && typeof (item as { id?: string }).id === "string") {
      return (item as { id: string }).id;
    }
  }
  return null;
}

const CV_OVERWRITE = new Set(["first_name", "last_name", "phone", "city", "professional_title"]);

function mergeFromCv(
  current: Record<string, string>,
  incoming: Record<string, string>,
  fields: ProfileField[],
) {
  const next = { ...current };
  const applied: string[] = [];
  const opened = new Set<string>();
  for (const field of fields) {
    const value = incoming[field.fieldKey];
    if (!value) {
      continue;
    }
    const already = current[field.fieldKey] ?? "";
    const empty = isBlankJson(field.fieldType.toUpperCase(), already);
    if (!empty && !CV_OVERWRITE.has(field.fieldKey)) {
      continue;
    }
    if (!empty && already.trim() === value.trim()) {
      continue;
    }
    next[field.fieldKey] = value;
    applied.push(field.label);
    opened.add(field.sectionKey || "profile");
  }
  return { next, applied, opened };
}

function repeatableItemFields(field: ProfileField) {
  if (field.itemFields?.length) {
    return field.itemFields;
  }
  if (field.fieldKey === "legal_representative") {
    return [
      { key: "name", label: "Nom et prénom", type: "text", required: true, options: [] },
      { key: "title", label: "Fonction", type: "text", required: true, options: [] },
      { key: "id_number", label: "N° pièce d’identité", type: "text", required: false, options: [] },
      { key: "email", label: "E-mail", type: "text", required: false, options: [] },
      { key: "phone", label: "Téléphone", type: "text", required: false, options: [] },
    ];
  }
  return field.itemFields ?? [];
}

function compactRepeatable(value: string, schema: { key: string }[]) {
  const parsed = parseJson<unknown>(value || "[]", []);
  const rows = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? [parsed]
      : [];
  const filled = rows.filter((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }
    const row = item as Record<string, string>;
    const keys = schema.length ? schema.map((spec) => spec.key) : Object.keys(row);
    return keys.some((key) => (row[key] ?? "").trim());
  });
  return JSON.stringify(filled);
}

function isBlankJson(type: string, value: string, schema: { key: string }[] = []) {
  if (!value || !value.trim()) {
    return true;
  }
  if (["PHOTO", "FILE", "FILES"].includes(type)) {
    return !hasUploadId(value);
  }
  if (type === "REPEATABLE") {
    return compactRepeatable(value, schema) === "[]";
  }
  if (["TAGS", "MULTISELECT", "COUNTRY_MULTI"].includes(type)) {
    const parsed = parseJson<unknown>(value, []);
    if (Array.isArray(parsed)) {
      return parsed.length === 0;
    }
    return true;
  }
  if (type === "MONEY") {
    const parsed = parseJson<{ amount?: string }>(value, {});
    return !parsed.amount?.trim();
  }
  return false;
}

function isFieldRequired(field: ProfileField) {
  return field.required;
}

function fieldError(field: ProfileField, value: string) {
  const type = field.fieldType.toUpperCase();
  const required = isFieldRequired(field);
  if (isBlankJson(type, value, type === "REPEATABLE" ? repeatableItemFields(field) : [])) {
    return required ? `${field.label} est obligatoire` : null;
  }
  if (field.fieldKey === "first_name" || field.fieldKey === "last_name") {
    return validateName(value);
  }
  if (field.fieldKey === "identity_document_number") {
    if (!/^[A-Za-z0-9][A-Za-z0-9 ./-]{3,39}$/.test(value.trim())) {
      return "Indiquez un n° CIN ou passeport valide";
    }
    return null;
  }
  if (type === "CITY") {
    return validateCity(value, required);
  }
  if (type === "TEL") {
    return validatePhone(value, required);
  }
  if (type === "EMAIL") {
    return validateContactEmail(value, required);
  }
  if (type === "URL") {
    return validateUrl(value, required);
  }
  if (type === "DATE") {
    return validateDateOfBirth(value, required);
  }
  if (type === "TEXTAREA") {
    return validateTextarea(value, required, field.maxLength);
  }
  if (type === "MONEY") {
    const money = parseJson<{ amount?: string }>(value, {});
    if (!/^\d{1,9}([.,]\d{1,2})?$/.test(money.amount ?? "")) {
      return "Indiquez un montant valide";
    }
    return null;
  }
  if (type === "REPEATABLE") {
    const schema = repeatableItemFields(field);
    const items = parseJson<Record<string, string>[]>(compactRepeatable(value, schema), []);
    for (const item of items) {
      for (const spec of schema) {
        if (spec.required && !(item[spec.key] ?? "").trim()) {
          return `${spec.label} est obligatoire`;
        }
      }
    }
    return null;
  }
  if (["SELECT", "BOOLEAN", "COUNTRY", "PHOTO", "FILE", "FILES", "TAGS", "MULTISELECT", "COUNTRY_MULTI"].includes(type)) {
    return null;
  }
  return validateOptionalText(value, field.label, field.maxLength);
}

function defaultValue(field: ProfileField, userCountryId?: string, userEmail?: string) {
  const type = field.fieldType.toUpperCase();
  if ((field.fieldKey === "current_country" || field.fieldKey === "org_country") && userCountryId) {
    return userCountryId;
  }
  if (field.fieldKey === "org_email" && userEmail) {
    return userEmail;
  }
  if (field.fieldKey === "verification_status") {
    return "pending";
  }
  if (["TAGS", "MULTISELECT", "REPEATABLE", "FILES", "PHOTO", "FILE", "COUNTRY_MULTI"].includes(type)) {
    return "[]";
  }
  return "";
}

type Section = {
  key: string;
  label: string;
  icon: string;
  fields: ProfileField[];
};

const SPORT_SECTION_ICONS: Record<string, string> = {
  identity: "sports_score",
  profession: "fitness_center",
  experience: "sports",
  documents: "military_tech",
  media: "videocam",
  contract: "handshake",
  mobility: "public",
  org_identity: "stadium",
  org_location: "location_on",
  org_contact: "call",
  org_legal: "verified",
  org_hiring: "groups",
  org_verification: "verified_user",
  legal: "verified",
  contact: "call",
  profile: "exercise",
};

const SPORT_ROLE_ICONS: Record<string, string> = {
  MEMBER: "exercise",
  CANDIDATE: "sports",
  EMPLOYER: "stadium",
  ACADEMY: "school",
  SUPPLIER: "inventory_2",
  SERVICE_PROVIDER: "handyman",
  EVENT_ORGANIZER: "emoji_events",
  EXPERT_CREATOR: "nutrition",
};

function sportSectionIcon(sectionKey: string, fallback?: string) {
  return SPORT_SECTION_ICONS[sectionKey] ?? fallback ?? "fitness_center";
}

const IDENTITY_KEYS = new Set(["identity_document_type", "identity_document_number", "identity_document"]);

export function CompleteProfilePage() {
  const { user, updateUser } = useAuth();
  const { locale, t } = useOnboardingLocale();
  const navigate = useNavigate();
  const path = useLocation().pathname;
  const editing = path === "/profile" || path === "/app/profile/edit";
  const embedded = path.startsWith("/app/");
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);
  const [cvStatus, setCvStatus] = useState<"idle" | "loading" | "done" | "empty" | "error">("idle");
  const [cvMessage, setCvMessage] = useState<string | null>(null);
  const parsedCvId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchProfileFields(), fetchCountries(), fetchProfileValues().catch(() => ({ values: {} as Record<string, string> }))])
      .then(([items, countryList, saved]) => {
        if (cancelled) {
          return;
        }
        setFields(items.filter((item) => item.fieldKey !== "verification_status"));
        setCountries(countryList);
        setValues((current) => {
          const next = { ...current };
          for (const field of items) {
            if (next[field.fieldKey] !== undefined) {
              continue;
            }
            const stored = saved.values[field.fieldKey];
            if (stored) {
              next[field.fieldKey] = stored;
            } else if (field.fieldKey === "first_name") {
              next[field.fieldKey] = user?.firstName ?? "";
            } else if (field.fieldKey === "last_name") {
              next[field.fieldKey] = user?.lastName ?? "";
            } else {
              next[field.fieldKey] = defaultValue(field, user?.country?.id, user?.email);
            }
          }
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(t.loadFormError);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.firstName, user?.lastName, user?.country?.id]);

  const sections = useMemo<Section[]>(() => {
    const order: Section[] = [];
    const index = new Map<string, Section>();
    for (const field of fields) {
      if (field.fieldKey === "cv") {
        continue;
      }
      const key = field.sectionKey || "profile";
      let section = index.get(key);
      if (!section) {
        section = { key, label: field.sectionLabel || "Profil", icon: sportSectionIcon(key, field.sectionIcon), fields: [] };
        index.set(key, section);
        order.push(section);
      }
      section.fields.push(field);
    }
    return order;
  }, [fields]);

  function issueFor(field: ProfileField) {
    if (field.fieldKey === "identity_document_number" && !(values.identity_document_type ?? "").trim()) {
      return isFieldRequired(field) ? t.identityChooseFirst : null;
    }
    return fieldError(field, values[field.fieldKey] ?? "");
  }

  function filledCount(sectionFields: ProfileField[]) {
    return sectionFields.filter((field) => !isBlankJson(field.fieldType.toUpperCase(), values[field.fieldKey] ?? "", repeatableItemFields(field))).length;
  }

  function sectionMeta(section: Section) {
    const requiredFields = section.fields.filter((field) => isFieldRequired(field));
    if (requiredFields.length) {
      const done = requiredFields.filter((field) => !issueFor(field)).length;
      return `${done}/${requiredFields.length} obligatoire${requiredFields.length > 1 ? "s" : ""}`;
    }
    const filled = filledCount(section.fields);
    return filled > 0 ? `${filled} renseigné${filled > 1 ? "s" : ""}` : "Optionnel";
  }

  const requiredBlocking = fields.some((field) => issueFor(field));
  const cvField = fields.find((field) => field.fieldKey === "cv") ?? null;
  const cvUploadId = cvField ? firstUploadId(values.cv) : null;

  useEffect(() => {
    if (!cvField || !cvUploadId) {
      if (!cvUploadId) {
        parsedCvId.current = null;
      }
      return;
    }
    if (parsedCvId.current === cvUploadId) {
      return;
    }
    let cancelled = false;
    setCvStatus("loading");
    setCvMessage("Analyse du CV en cours…");
    parseCv(cvUploadId)
      .then((result) => {
        if (cancelled) {
          return;
        }
        parsedCvId.current = cvUploadId;
        let applied: string[] = [];
        let opened = new Set<string>();
        setValues((current) => {
          const merged = mergeFromCv(current, result.values, fields);
          applied = merged.applied;
          opened = merged.opened;
          return merged.next;
        });
        if (opened.size) {
          setCollapsed((current) => {
            const next = { ...current };
            for (const key of opened) {
              next[key] = false;
            }
            return next;
          });
        }
        if (applied.length) {
          setCvStatus("done");
          setCvMessage(
            applied.length === 1
              ? `${applied[0]} a été prérempli depuis le CV. Vérifiez ce champ.`
              : `${applied.length} champs ont été préremplis : ${applied.slice(0, 6).join(", ")}${applied.length > 6 ? "…" : ""}. Vérifiez-les avant de continuer.`,
          );
        } else {
          setCvStatus("empty");
          setCvMessage(result.message || "CV enregistré. Complétez le formulaire, la photo reste obligatoire.");
        }
      })
      .catch((err) => {
        if (cancelled) {
          return;
        }
        parsedCvId.current = cvUploadId;
        setCvStatus("error");
        setCvMessage(err instanceof ApiError ? err.message : "Impossible d’analyser ce CV. Remplissez le formulaire à la main.");
      });
    return () => {
      cancelled = true;
    };
  }, [cvField, cvUploadId, fields]);

  function toggleSection(key: string) {
    setCollapsed((current) => ({ ...current, [key]: !current[key] }));
  }

  function setField(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    const nextErrors: Record<string, string | undefined> = {};
    for (const field of fields) {
      nextErrors[field.fieldKey] = issueFor(field) ?? undefined;
    }
    const firstInvalid = fields.find((field) => nextErrors[field.fieldKey]);
    if (firstInvalid) {
      const blocked = new Set(
        fields.filter((field) => nextErrors[field.fieldKey]).map((field) => field.sectionKey || "profile"),
      );
      setCollapsed((current) => {
        const next = { ...current };
        for (const key of blocked) {
          next[key] = false;
        }
        return next;
      });
      setError(t.requiredBanner);
      requestAnimationFrame(() => {
        document.getElementById(`field-${firstInvalid.fieldKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const allowed = new Set(fields.map((field) => field.fieldKey));
      const payload: Record<string, string> = {};
      for (const field of fields) {
        const type = field.fieldType.toUpperCase();
        const raw = values[field.fieldKey] ?? "";
        const value = type === "REPEATABLE" ? compactRepeatable(raw, repeatableItemFields(field)) : raw;
        if (isBlankJson(type, value, repeatableItemFields(field))) {
          continue;
        }
        payload[field.fieldKey] = ["TAGS", "MULTISELECT", "REPEATABLE", "FILES", "PHOTO", "FILE", "COUNTRY_MULTI", "MONEY"].includes(type)
          ? value
          : trimValue(value);
      }
      if (allowed.has("first_name") && !payload.first_name && user?.firstName) {
        payload.first_name = user.firstName;
      }
      if (allowed.has("last_name") && !payload.last_name && user?.lastName) {
        payload.last_name = user.lastName;
      }
      if (allowed.has("current_country") && !payload.current_country && user?.country?.id) {
        payload.current_country = user.country.id;
      }
      if (allowed.has("org_country") && !payload.org_country && user?.country?.id) {
        payload.org_country = user.country.id;
      }
      if (allowed.has("org_email") && !payload.org_email && user?.email) {
        payload.org_email = user.email;
      }
      const next = await completeProfile(payload);
      updateUser(next);
      if (next.onboardingStep === "PROFILE") {
        setAttempted(true);
        setError(t.requiredBanner);
        return;
      }
      if (!editing && next.profileVisible === false) {
        try {
          sessionStorage.setItem("fu.visibility.notice", "1");
        } catch {
          /* ignore */
        }
      }
      navigate(editing ? "/app/profile" : destinationFor(next), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.saveError);
    } finally {
      setSubmitting(false);
    }
  }

  function renderIdentityDocument() {
    const typeField = fields.find((item) => item.fieldKey === "identity_document_type");
    const numberField = fields.find((item) => item.fieldKey === "identity_document_number");
    const fileField = fields.find((item) => item.fieldKey === "identity_document");
    if (!typeField) {
      return null;
    }
    const kind = values.identity_document_type ?? "";
    const numberLabel = kind === "passport" ? t.identityNumberPassport : kind === "cin" ? t.identityNumberCin : t.identityNumberGeneric;
    const typeIssue = issueFor(typeField);
    const numberIssue = numberField ? issueFor(numberField) : null;
    const fileIssue = fileField ? issueFor(fileField) : null;
    const showTypeIssue = Boolean(typeIssue) && attempted;
    const showNumberIssue = Boolean(numberIssue) && (attempted || Boolean(kind));
    const showFileIssue = Boolean(fileIssue) && (attempted || Boolean(kind));
    return (
      <div id="field-identity_document_type" key="identity-document-block" className="ob-field ob-field--full">
        <section className="ob-cv-import">
          <div className="ob-cv-import-head">
            <span className="material-symbols-outlined">badge</span>
            <div>
              <h2>{t.identityTypeTitle}</h2>
              <p>{t.identityTypeLead}</p>
            </div>
          </div>
          <div className="bool-toggle">
            {(typeField.options.length
              ? typeField.options
              : [
                  { value: "cin", label: t.identityCin },
                  { value: "passport", label: t.identityPassport },
                ]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                className={`bool-option${kind === option.value ? " is-active" : ""}`}
                onClick={() => {
                  setField("identity_document_type", option.value);
                }}
              >
                {option.value === "passport" ? t.identityPassport : t.identityCin}
              </button>
            ))}
          </div>
          {showTypeIssue ? <p className="auth-field-error">{t.identityChooseFirst}</p> : null}
          {kind && numberField ? (
            <div className="ob-id-number">
              <label className="auth-label" htmlFor="identity_document_number">
                {numberLabel} *
              </label>
              <input
                id="identity_document_number"
                className={`custom-input${showNumberIssue ? " is-invalid" : ""}`}
                value={values.identity_document_number ?? ""}
                placeholder={kind === "passport" ? "A1234567" : "12345678"}
                maxLength={numberField.maxLength ?? 40}
                onChange={(event) => setField("identity_document_number", event.target.value)}
              />
              {showNumberIssue ? <p className="auth-field-error">{numberIssue}</p> : null}
            </div>
          ) : null}
          {kind && fileField ? (
            <div className="ob-id-photo">
              <label className="auth-label">
                {t.identityPhotoTitle} *
              </label>
              <p className="field-hint">{t.identityPhotoLead}</p>
              <FileField
                field={{ ...fileField, helpText: t.identityPhotoLead }}
                value={values.identity_document ?? "[]"}
                multiple={false}
                onChange={(next) => setField("identity_document", next)}
              />
              {showFileIssue ? <p className="auth-field-error">{fileIssue}</p> : null}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  function renderField(field: ProfileField) {
    const hasIdentityType = fields.some((item) => item.fieldKey === "identity_document_type");
    if (hasIdentityType && IDENTITY_KEYS.has(field.fieldKey)) {
      return field.fieldKey === "identity_document_type" ? renderIdentityDocument() : null;
    }
    const value = values[field.fieldKey] ?? "";
    const type = field.fieldType.toUpperCase();
    const required = isFieldRequired(field);
    const shownLabel = fieldLabel(field.fieldKey, locale, field.label);
    const displayField = { ...field, required, label: shownLabel };
    const issue = issueFor(field);
    const showIssue = Boolean(issue) && (attempted || required || !isBlankJson(type, value));
    const invalid = showIssue;
    const wide = ["TEXTAREA", "TAGS", "MULTISELECT", "REPEATABLE", "FILES", "FILE", "PHOTO", "COUNTRY_MULTI", "MONEY"].includes(type);
    const label = type === "PHOTO" ? null : (
      <label className="auth-label" htmlFor={field.fieldKey}>
        {shownLabel}
        {required ? " *" : ""}
      </label>
    );

    let control = null;
    if (type === "PHOTO") {
      control = <PhotoField field={displayField} value={value} invalid={invalid} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "FILE" || type === "FILES") {
      control = (
        <FileField
          field={field}
          value={value}
          multiple={type === "FILES"}
          onChange={(next) => setField(field.fieldKey, next)}
        />
      );
    } else if (type === "TAGS" && field.fieldKey === "group_class_slots") {
      control = <GroupClassSlotsField value={value} invalid={invalid} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "TAGS") {
      control = <TagInput field={field} value={value} invalid={invalid} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "BOOLEAN") {
      control = <BooleanToggle field={field} value={value} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "MONEY") {
      control = <MoneyField field={field} value={value} invalid={invalid} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "MULTISELECT") {
      control = <MultiSelectField field={field} value={value} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "COUNTRY") {
      control = (
        <CountrySelectField
          countries={countries}
          value={value}
          invalid={invalid}
          readOnly={field.fieldKey === "current_country" || field.fieldKey === "org_country"}
          onChange={(next) => setField(field.fieldKey, next)}
        />
      );
    } else if (type === "COUNTRY_MULTI") {
      control = <CountryMultiField countries={countries} value={value} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "REPEATABLE") {
      control = <RepeatableField field={field} value={value} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "SELECT") {
      const locked = field.fieldKey === "verification_status";
      control = (
        <Select
          id={field.fieldKey}
          value={value}
          invalid={invalid}
          disabled={locked}
          placeholder="Sélectionner"
          options={field.options}
          onChange={(next) => setField(field.fieldKey, next)}
        />
      );
    } else if (type === "TEXTAREA") {
      control = (
        <textarea
          id={field.fieldKey}
          className={`custom-input custom-textarea custom-textarea--tall${invalid ? " is-invalid" : ""}`}
          placeholder={field.placeholder ?? ""}
          maxLength={field.maxLength ?? undefined}
          value={value}
          onChange={(event) => setField(field.fieldKey, event.target.value)}
        />
      );
    } else if (type === "TEL") {
      control = (
        <div className="ob-phone">
          <span className="ob-phone-code">{user?.country?.callingCode ?? ""}</span>
          <input
            id={field.fieldKey}
            className={`custom-input${invalid ? " is-invalid" : ""}`}
            type="tel"
            value={value}
            placeholder={field.placeholder ?? ""}
            maxLength={field.maxLength ?? 32}
            onChange={(event) => setField(field.fieldKey, event.target.value)}
          />
        </div>
      );
    } else if (type === "CITY") {
      control = (
        <div className="ob-city">
          <span className="material-symbols-outlined">location_on</span>
          <input
            id={field.fieldKey}
            className={`custom-input custom-input--icon${invalid ? " is-invalid" : ""}`}
            value={value}
            placeholder={field.placeholder ?? ""}
            maxLength={field.maxLength ?? 80}
            onChange={(event) => setField(field.fieldKey, event.target.value)}
          />
        </div>
      );
    } else {
      control = (
        <input
          id={field.fieldKey}
          className={`custom-input${invalid ? " is-invalid" : ""}`}
          type={type === "DATE" ? "date" : type === "EMAIL" ? "email" : type === "URL" ? "url" : "text"}
          placeholder={field.placeholder ?? ""}
          maxLength={type === "DATE" ? undefined : (field.maxLength ?? undefined)}
          value={value}
          onChange={(event) => setField(field.fieldKey, event.target.value)}
        />
      );
    }

    return (
      <div id={`field-${field.fieldKey}`} key={field.fieldKey} className={`ob-field${wide ? " ob-field--full" : ""}`}>
        {label}
        {field.helpText && type !== "PHOTO" && type !== "FILE" && type !== "FILES" ? (
          <p className="field-hint">{field.helpText}</p>
        ) : null}
        {control}
        {showIssue ? <p className="auth-field-error">{issue}</p> : null}
      </div>
    );
  }

  const candidate = user?.role?.code === "CANDIDATE";
  const business = user?.role?.category === "BUSINESS";
  const memberFlow = user?.role?.code === "MEMBER";
  const goBack = () => navigate(editing ? "/app/profile" : "/onboarding/country");
  const longFlow = candidate;
  const profileTitle = candidate
    ? t.profileCandidateTitle
    : business
      ? t.profileBusinessTitle
      : user?.role?.code === "MEMBER"
        ? t.profileMemberTitle
        : t.profileDefaultTitle;
  const profileLead = candidate
    ? t.profileCandidateLead
    : business
      ? t.profileBusinessLead
      : user?.role?.code === "MEMBER"
        ? t.profileMemberLead
        : t.profileDefaultLead;

  const form = (
        <form className="ob-dossier" onSubmit={onSubmit} noValidate>
          {embedded ? null : (
          <div className="ob-role-badge">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">
                {SPORT_ROLE_ICONS[user?.role?.code ?? ""] ?? "fitness_center"}
              </span>
              <span>{t.profileLabel} : {user?.role?.label ?? "—"}</span>
            </div>
            {editing ? null : (
              <button className="ob-link" type="button" onClick={() => navigate("/onboarding/role")}>
                {t.changeRole}
              </button>
            )}
          </div>
          )}
          {cvField ? (
            <section className="ob-cv-import">
              <div className="ob-cv-import-head">
                <span className="material-symbols-outlined">assignment</span>
                <div>
                  <h2>{t.cvTitle}</h2>
                  <p>{t.cvLead}</p>
                </div>
              </div>
              <FileField
                field={cvField}
                value={values.cv ?? "[]"}
                multiple={false}
                onChange={(next) => setField("cv", next)}
              />
              {cvMessage ? <p className={`ob-cv-import-status is-${cvStatus}`}>{cvMessage}</p> : null}
            </section>
          ) : null}
          {loading ? <p className="font-body-md text-on-surface-variant">{t.loadingForm}</p> : null}
          {sections.map((section, index) => {
            const folded = Boolean(collapsed[section.key]);
            return (
              <section key={section.key} className={`ob-section${folded ? " is-collapsed" : ""}`}>
                <button
                  type="button"
                  className="ob-section-head"
                  onClick={() => toggleSection(section.key)}
                  aria-expanded={!folded}
                >
                  <span className="ob-section-index">{String(index + 1).padStart(2, "0")}</span>
                  <span className="material-symbols-outlined">{section.icon}</span>
                  <h2>{section.label}</h2>
                  <span className="ob-section-meta">{sectionMeta(section)}</span>
                  <span className={`material-symbols-outlined ob-chevron${folded ? " is-folded" : ""}`}>expand_less</span>
                </button>
                <div className="ob-fields" hidden={folded}>
                  {section.fields.map(renderField)}
                </div>
              </section>
            );
          })}
          {error ? <p className="auth-error">{error}</p> : null}
          <div className="ob-profile-footer">
            <p>
              {editing
                ? t.privacyFooter
                : t.requiredFooter}
            </p>
            <div className="ob-profile-actions">
              <button className="ob-secondary" type="button" onClick={goBack}>
                {t.back}
              </button>
              <button className="ob-primary" type="submit" disabled={submitting || loading || requiredBlocking}>
                {submitting ? t.saving : editing ? t.save : memberFlow ? t.continue : t.finish}
                <span className="material-symbols-outlined text-[16px]">{editing ? "check" : "arrow_forward"}</span>
              </button>
            </div>
          </div>
        </form>
  );

  if (embedded) {
    return (
      <section className="ob-embedded">
        <div className="page-head">
          <div>
            <h1>{business ? "Modifier le profil organisation" : "Modifier le profil"}</h1>
            <div className="sub">Mettez à jour vos informations. Elles restent dans votre dossier.</div>
          </div>
        </div>
        {form}
      </section>
    );
  }

  return (
    <div className="fu-public ob-shell ob-shell--profile">
      <header className="ob-profile-nav">
        <button className="ob-nav-back" type="button" onClick={goBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-label-caps uppercase">{t.back}</span>
        </button>
        <OnboardingBrand />
        <div className="flex items-center gap-3">
          <LocaleSwitch />
          <div className="ob-step-label">{memberFlow ? t.stepProfileMember : longFlow ? t.stepProfileLong : t.stepProfile}</div>
        </div>
      </header>
      <main className="ob-profile ob-profile--wide">
        <div className="ob-profile-intro">
          <p className="ob-kicker">{user?.role?.label}</p>
          <h1>{profileTitle}</h1>
          <p>{profileLead}</p>
        </div>
        {form}
      </main>
    </div>
  );
}
