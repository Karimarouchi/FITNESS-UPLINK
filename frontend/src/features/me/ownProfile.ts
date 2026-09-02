import { useEffect, useMemo, useState } from "react";
import { fetchCountries, fetchProfileFields, fetchProfileValues } from "@/features/onboarding/api";
import type { CountrySummary, ProfileField } from "@/features/auth/types";
import type { FileRef } from "@/features/talent/api";

export type ExperienceItem = {
  title: string | null;
  company: string | null;
  start: string | null;
  end: string | null;
  description: string | null;
};

export type OwnProfile = {
  values: Record<string, string>;
  fields: ProfileField[];
  title: string | null;
  city: string | null;
  phone: string | null;
  biography: string | null;
  specialties: string[];
  experiences: ExperienceItem[];
  availability: string | null;
  availabilityLabel: string | null;
  slots: string[];
  contractTypes: string[];
  salary: string | null;
  relocate: boolean | null;
  international: boolean | null;
  cv: FileRef | null;
  diplomas: FileRef[];
  certifications: FileRef[];
  videos: FileRef[];
  logoUploadId: string | null;
  orgType: string | null;
};

export type ProfileSection = {
  key: string;
  label: string;
  icon: string;
  fields: ProfileField[];
};

const AVAILABILITY_LABEL: Record<string, string> = {
  immediate: "Immédiate",
  "2_weeks": "Sous 2 semaines",
  "1_month": "Sous 1 mois",
  to_discuss: "À convenir",
};

function parseJson(raw: string | undefined): unknown {
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function text(values: Record<string, string>, key: string): string | null {
  const value = values[key];
  return value && value.trim() ? value.trim() : null;
}

function stringList(raw: string | undefined): string[] {
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function fileRef(item: unknown): FileRef | null {
  if (!item || typeof item !== "object" || !("id" in item)) {
    return null;
  }
  const row = item as { id?: string; name?: string; contentType?: string; size?: number };
  if (!row.id) {
    return null;
  }
  return {
    id: row.id,
    name: row.name ?? "Document",
    contentType: row.contentType ?? "",
    size: row.size ?? 0,
  };
}

function files(raw: string | undefined): FileRef[] {
  const parsed = parseJson(raw);
  if (!parsed) {
    return [];
  }
  const list = Array.isArray(parsed) ? parsed : [parsed];
  return list.map(fileRef).filter((item): item is FileRef => item !== null);
}

function experiences(raw: string | undefined): ExperienceItem[] {
  const parsed = parseJson(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map((item) => {
    const row = item as Record<string, string>;
    return {
      title: row.title || null,
      company: row.company || null,
      start: row.start || null,
      end: row.end || null,
      description: row.description || null,
    };
  });
}

function yesNo(raw: string | undefined): boolean | null {
  if (raw === "yes" || raw === "true") {
    return true;
  }
  if (raw === "no" || raw === "false") {
    return false;
  }
  return null;
}

function moneyLabel(raw: string | undefined): string | null {
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== "object") {
    return text({ v: raw ?? "" }, "v");
  }
  const row = parsed as { amount?: string; currency?: string };
  if (!row.amount) {
    return null;
  }
  return `${row.amount} ${row.currency ?? ""}`.trim();
}

function optionLabel(fields: ProfileField[], key: string, value: string): string {
  const field = fields.find((item) => item.fieldKey === key);
  return field?.options.find((option) => option.value === value)?.label ?? value;
}

function fieldOptionLabel(field: ProfileField, value: string) {
  return field.options.find((option) => option.value === value)?.label ?? value;
}

export type FieldView =
  | { kind: "empty" }
  | { kind: "text"; value: string; wide?: boolean }
  | { kind: "photo"; id: string }
  | { kind: "files"; files: FileRef[] }
  | { kind: "tags"; items: string[] }
  | { kind: "rows"; rows: { label: string; value: string }[][] };

export function viewProfileField(
  field: ProfileField,
  raw: string | undefined,
  countries: CountrySummary[],
): FieldView {
  const type = field.fieldType.toUpperCase();
  if (!raw || !String(raw).trim() || raw === "[]" || raw === "{}") {
    return { kind: "empty" };
  }
  if (type === "PHOTO") {
    const id = files(raw)[0]?.id;
    return id ? { kind: "photo", id } : { kind: "empty" };
  }
  if (type === "FILE" || type === "FILES") {
    const list = files(raw);
    return list.length ? { kind: "files", files: list } : { kind: "empty" };
  }
  if (type === "TAGS" || type === "MULTISELECT") {
    const items = stringList(raw).map((item) => fieldOptionLabel(field, item));
    return items.length ? { kind: "tags", items } : { kind: "empty" };
  }
  if (type === "COUNTRY") {
    const label = countryLabel(countries, raw.trim());
    return label ? { kind: "text", value: label } : { kind: "empty" };
  }
  if (type === "COUNTRY_MULTI") {
    const ids = stringList(raw);
    const items = ids.map((id) => countryLabel(countries, id) ?? id).filter(Boolean);
    return items.length ? { kind: "tags", items } : { kind: "empty" };
  }
  if (type === "BOOLEAN" || type === "SELECT") {
    if (type === "BOOLEAN") {
      const flag = yesNo(raw);
      if (flag === null && !raw.trim()) {
        return { kind: "empty" };
      }
      return { kind: "text", value: flag === true ? "Oui" : flag === false ? "Non" : fieldOptionLabel(field, raw) };
    }
    return { kind: "text", value: fieldOptionLabel(field, raw) };
  }
  if (type === "MONEY") {
    const label = moneyLabel(raw);
    return label ? { kind: "text", value: label } : { kind: "empty" };
  }
  if (type === "REPEATABLE") {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { kind: "empty" };
    }
    const rows = parsed.map((item) => {
      const row = (item ?? {}) as Record<string, string>;
      const specs = field.itemFields.length
        ? field.itemFields
        : Object.keys(row).map((key) => ({ key, label: key, type: "text", required: false, options: [] }));
      return specs
        .map((spec) => {
          const value = row[spec.key];
          if (!value) {
            return null;
          }
          const option = spec.options.find((entry) => entry.value === value)?.label;
          return { label: spec.label, value: option ?? value };
        })
        .filter((entry): entry is { label: string; value: string } => entry !== null);
    }).filter((row) => row.length > 0);
    return rows.length ? { kind: "rows", rows } : { kind: "empty" };
  }
  if (type === "TEXTAREA") {
    return { kind: "text", value: raw.trim(), wide: true };
  }
  return { kind: "text", value: raw.trim() };
}

export function parseOwnProfile(values: Record<string, string>, fields: ProfileField[]): OwnProfile {
  const specialties = stringList(values.specialties).map((item) => optionLabel(fields, "specialties", item));
  const availability = text(values, "availability");
  const establishment = text(values, "establishment_type");
  return {
    values,
    fields,
    title:
      text(values, "trade_name") ??
      text(values, "professional_title") ??
      text(values, "legal_name") ??
      text(values, "desired_role") ??
      text(values, "company_name") ??
      text(values, "gym_name") ??
      text(values, "organization_name"),
    city: text(values, "city") ?? text(values, "org_city"),
    phone: text(values, "phone") ?? text(values, "org_phone"),
    biography: text(values, "biography") ?? text(values, "about") ?? text(values, "organization_description"),
    specialties,
    experiences: experiences(values.experiences),
    availability,
    availabilityLabel: availability ? AVAILABILITY_LABEL[availability] ?? optionLabel(fields, "availability", availability) : null,
    slots: stringList(values.group_class_slots),
    contractTypes: stringList(values.contract_types).map((item) => optionLabel(fields, "contract_types", item)),
    salary: moneyLabel(values.desired_salary),
    relocate: yesNo(values.willing_to_relocate),
    international: yesNo(values.international_mission),
    cv: files(values.cv)[0] ?? null,
    diplomas: files(values.diplomas),
    certifications: files(values.certifications),
    videos: files(values.presentation_videos),
    logoUploadId: files(values.organization_logo)[0]?.id ?? files(values.professional_photo)[0]?.id ?? null,
    orgType: establishment ? optionLabel(fields, "establishment_type", establishment) : null,
  };
}

export function groupProfileSections(fields: ProfileField[]): ProfileSection[] {
  const order: ProfileSection[] = [];
  const index = new Map<string, ProfileSection>();
  for (const field of fields) {
    if (field.fieldKey === "verification_status") {
      continue;
    }
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
}

export function countryLabel(countries: CountrySummary[], id: string | null | undefined) {
  if (!id) {
    return null;
  }
  const match = countries.find((item) => item.id === id);
  return match ? `${match.flagEmoji} ${match.name}` : id;
}

export function useOwnProfile() {
  const [profile, setProfile] = useState<OwnProfile | null>(null);
  const [countries, setCountries] = useState<CountrySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchProfileValues(), fetchProfileFields(), fetchCountries()])
      .then(([payload, fields, countryList]) => {
        if (!cancelled) {
          setProfile(parseOwnProfile(payload.values ?? {}, fields));
          setCountries(countryList);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError("Impossible de charger le profil.");
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
  }, []);

  return useMemo(() => ({ profile, countries, error, loading }), [profile, countries, error, loading]);
}

export function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} o`;
  }
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} Ko`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatMonth(value: string | null) {
  if (!value) {
    return "—";
  }
  const [year, month] = value.split("-");
  if (!year || !month) {
    return value;
  }
  return `${month}/${year}`;
}
