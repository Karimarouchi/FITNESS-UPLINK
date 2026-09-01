import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import type { CountrySummary, ProfileField } from "@/features/auth/types";
import { isVerified } from "@/features/auth/types";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { VerificationBadge } from "@/shared/components/VerificationBadge";
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
import { completeProfile, fetchCountries, fetchProfileFields, fetchProfileValues } from "../api";
import {
  BooleanToggle,
  CountryMultiField,
  CountrySelectField,
  FileField,
  MoneyField,
  MultiSelectField,
  PhotoField,
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

function isBlankJson(type: string, value: string) {
  if (!value || !value.trim()) {
    return true;
  }
  if (["TAGS", "MULTISELECT", "REPEATABLE", "FILES", "PHOTO", "FILE", "COUNTRY_MULTI"].includes(type)) {
    const parsed = parseJson<unknown>(value, []);
    if (Array.isArray(parsed)) {
      return parsed.length === 0;
    }
    return !(parsed && typeof parsed === "object" && "id" in parsed);
  }
  if (type === "MONEY") {
    const parsed = parseJson<{ amount?: string }>(value, {});
    return !parsed.amount?.trim();
  }
  return false;
}

function fieldError(field: ProfileField, value: string): string | null {
  const type = field.fieldType.toUpperCase();
  if (isBlankJson(type, value)) {
    return field.required ? `${field.label} est obligatoire` : null;
  }
  if (field.fieldKey === "first_name" || field.fieldKey === "last_name") {
    return validateName(value);
  }
  if (type === "CITY") {
    return validateCity(value, field.required);
  }
  if (type === "TEL") {
    return validatePhone(value, field.required);
  }
  if (type === "EMAIL") {
    return validateContactEmail(value, field.required);
  }
  if (type === "URL") {
    return validateUrl(value, field.required);
  }
  if (type === "DATE") {
    return validateDateOfBirth(value, field.required);
  }
  if (type === "TEXTAREA") {
    return validateTextarea(value, field.required, field.maxLength);
  }
  if (type === "MONEY") {
    const money = parseJson<{ amount?: string }>(value, {});
    if (!/^\d{1,9}([.,]\d{1,2})?$/.test(money.amount ?? "")) {
      return "Indiquez un montant valide";
    }
    return null;
  }
  if (["SELECT", "BOOLEAN", "COUNTRY", "PHOTO", "FILE", "FILES", "TAGS", "MULTISELECT", "REPEATABLE", "COUNTRY_MULTI"].includes(type)) {
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

function photoUploadId(value?: string) {
  try {
    const parsed = JSON.parse(value || "[]") as { id?: string } | { id?: string }[];
    const first = Array.isArray(parsed) ? parsed[0] : parsed;
    return first?.id;
  } catch {
    return undefined;
  }
}

export function CompleteProfilePage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const editing = useLocation().pathname === "/profile";
  const [fields, setFields] = useState<ProfileField[]>([]);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [attempted, setAttempted] = useState(false);

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
          setError("Impossible de charger le formulaire.");
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
      const key = field.sectionKey || "profile";
      let section = index.get(key);
      if (!section) {
        section = { key, label: field.sectionLabel || "Profil", icon: field.sectionIcon || "person", fields: [] };
        index.set(key, section);
        order.push(section);
      }
      section.fields.push(field);
    }
    return order;
  }, [fields]);

  function filledCount(sectionFields: ProfileField[]) {
    return sectionFields.filter((field) => !isBlankJson(field.fieldType.toUpperCase(), values[field.fieldKey] ?? "")).length;
  }

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
      nextErrors[field.fieldKey] = fieldError(field, values[field.fieldKey] ?? "") ?? undefined;
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
      setError("Complétez les champs obligatoires marqués d’une *.");
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
        const value = values[field.fieldKey] ?? "";
        if (isBlankJson(type, value)) {
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
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’enregistrer le profil");
    } finally {
      setSubmitting(false);
    }
  }

  function renderField(field: ProfileField) {
    const value = values[field.fieldKey] ?? "";
    const type = field.fieldType.toUpperCase();
    const issue = fieldError(field, value);
    const showIssue = Boolean(issue) && (attempted || !isBlankJson(type, value));
    const invalid = showIssue;
    const wide = ["TEXTAREA", "TAGS", "MULTISELECT", "REPEATABLE", "FILES", "FILE", "PHOTO", "COUNTRY_MULTI", "MONEY"].includes(type);
    const label = type === "PHOTO" ? null : (
      <label className="auth-label" htmlFor={field.fieldKey}>
        {field.label}
        {field.required ? " *" : ""}
      </label>
    );

    let control = null;
    if (type === "PHOTO") {
      control = <PhotoField field={field} value={value} onChange={(next) => setField(field.fieldKey, next)} />;
    } else if (type === "FILE" || type === "FILES") {
      control = (
        <FileField
          field={field}
          value={value}
          multiple={type === "FILES"}
          onChange={(next) => setField(field.fieldKey, next)}
        />
      );
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
        <select
          id={field.fieldKey}
          className={`custom-input${invalid ? " is-invalid" : ""}${locked ? " is-readonly" : ""}`}
          value={value}
          disabled={locked}
          onChange={(event) => setField(field.fieldKey, event.target.value)}
        >
          <option value="">Sélectionner</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
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
  const displayName = user?.displayName || [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Profil";
  const avatarId =
    photoUploadId(values.professional_photo) ?? photoUploadId(values.organization_logo) ?? user?.avatarUploadId;
  const goBack = () => navigate(editing ? "/" : "/onboarding/country");

  return (
    <div className="ob-shell ob-shell--profile">
      <header className="ob-profile-nav">
        <button className="ob-nav-back" type="button" onClick={goBack}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-label-caps uppercase">Retour</span>
        </button>
        <div className="font-headline-md text-primary">Fitness Uplink</div>
        {editing ? (
          <ProfileAvatar uploadId={avatarId} name={displayName} size={40} />
        ) : (
          <div className="font-label-caps text-on-surface-variant">Étape 3 / 3</div>
        )}
      </header>
      <main className="ob-profile ob-profile--wide">
        <div className="ob-profile-intro">
          {editing ? (
            <div className="ob-profile-circle">
              <ProfileAvatar uploadId={avatarId} name={displayName} size={112} />
              <div className="mt-3 flex justify-center">
                <VerificationBadge verified={isVerified(user)} />
              </div>
            </div>
          ) : null}
          <p className="ob-kicker">{user?.role?.label}</p>
          <h1 className="font-display-lg-mobile md:font-display-lg text-on-surface">
            {editing
              ? "Mon profil"
              : candidate
                ? "Votre dossier candidat"
                : business
                  ? "Votre dossier établissement"
                  : "Complete your profile"}
          </h1>
          <p className="font-body-lg text-on-surface-variant">
            {editing
              ? "Consultez vos informations et mettez-les à jour à tout moment."
              : candidate
                ? "Présentez votre parcours, vos pièces et vos préférences. Vous pourrez affiner plus tard."
                : business
                  ? "Renseignez l’identité, les pièces juridiques et les coordonnées de votre structure. Vous pourrez affiner plus tard."
                  : "Tell us a little more about yourself to personalize your Fitness Uplink experience."}
          </p>
        </div>
        <form className="ob-dossier" onSubmit={onSubmit} noValidate>
          <div className="ob-role-badge">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">{user?.role?.icon ?? "person"}</span>
              <span className="font-mono-data text-on-surface-variant">Profil : {user?.role?.label ?? "—"}</span>
            </div>
            {editing ? null : (
              <button className="ob-link" type="button" onClick={() => navigate("/onboarding/role")}>
                Changer
              </button>
            )}
          </div>
          {loading ? <p className="font-body-md text-on-surface-variant">Chargement du formulaire…</p> : null}
          {sections.map((section, index) => {
            const folded = Boolean(collapsed[section.key]);
            const filled = filledCount(section.fields);
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
                  <span className="ob-section-meta">
                    {filled > 0 ? `${filled} renseigné${filled > 1 ? "s" : ""}` : "Optionnel"}
                  </span>
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
            <p className="font-mono-data text-[12px] text-on-surface-variant">
              Vos informations sont traitées conformément à la politique de confidentialité Fitness Uplink.
            </p>
            <div className="ob-profile-actions">
              <button className="ob-secondary" type="button" onClick={goBack}>
                Retour
              </button>
              <button className="ob-primary" type="submit" disabled={submitting || loading}>
                {submitting ? "Enregistrement..." : editing ? "Enregistrer" : "Terminer"}
                {submitting ? "Enregistrement..." : editing ? "Enregistrer" : "Terminer"}
                <span className="material-symbols-outlined text-[16px]">{editing ? "check" : "arrow_forward"}</span>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
