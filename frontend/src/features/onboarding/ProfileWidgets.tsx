import { useEffect, useState } from "react";
import type { CountrySummary, ItemField, ProfileField } from "@/features/auth/types";
import { ApiError } from "@/shared/api/client";
import { Select } from "@/components/ui/Select";
import { fetchUploadBlob, uploadProfileFile } from "./api";

type FileItem = { id: string; name: string; contentType: string; size: number };

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toFileItems(value: string): FileItem[] {
  const parsed = parseJson<unknown>(value, []);
  if (Array.isArray(parsed)) {
    return parsed as FileItem[];
  }
  if (parsed && typeof parsed === "object" && "id" in parsed) {
    return [parsed as FileItem];
  }
  return [];
}

export function TagInput({
  field,
  value,
  onChange,
  invalid,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const tags = parseJson<string[]>(value || "[]", []);
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const next = raw.trim();
    if (!next || tags.includes(next) || next.length > (field.maxLength ?? 60) || tags.length >= 20) {
      return;
    }
    onChange(JSON.stringify([...tags, next]));
    setDraft("");
  }

  return (
    <div className={`chip-box${invalid ? " is-invalid" : ""}`}>
      <div className="chip-list">
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="chip"
            onClick={() => onChange(JSON.stringify(tags.filter((item) => item !== tag)))}
          >
            {tag}
            <span className="material-symbols-outlined">close</span>
          </button>
        ))}
        <input
          className="chip-input"
          value={draft}
          placeholder={tags.length ? "" : (field.placeholder ?? "")}
          maxLength={field.maxLength ?? 60}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              addTag(draft.replace(",", ""));
            }
          }}
          onBlur={() => addTag(draft)}
        />
      </div>
      {field.options.length ? (
        <div className="chip-suggestions">
          {field.options
            .filter((option) => !tags.includes(option.label) && !tags.includes(option.value))
            .map((option) => (
              <button key={option.value} type="button" className="chip-suggest" onClick={() => addTag(option.label)}>
                {option.label}
              </button>
            ))}
        </div>
      ) : null}
    </div>
  );
}

const WEEK_DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

function classTimes() {
  const items: string[] = [];
  for (let hour = 6; hour <= 22; hour += 1) {
    items.push(`${String(hour).padStart(2, "0")}:00`);
    if (hour < 22) {
      items.push(`${String(hour).padStart(2, "0")}:30`);
    }
  }
  return items;
}

const CLASS_TIMES = classTimes();

export function GroupClassSlotsField({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const slots = parseJson<string[]>(value || "[]", []).filter((item) => typeof item === "string");
  const [days, setDays] = useState<(typeof WEEK_DAYS)[number][]>([]);
  const [time, setTime] = useState("");

  function toggleDay(item: (typeof WEEK_DAYS)[number]) {
    setDays((current) => (current.includes(item) ? current.filter((day) => day !== item) : [...current, item]));
  }

  function addSlot() {
    if (!time || days.length === 0) {
      return;
    }
    const additions = days.map((day) => `${day} ${time}`).filter((next) => !slots.includes(next));
    if (additions.length === 0) {
      return;
    }
    const next = [...slots, ...additions].slice(0, 40);
    onChange(JSON.stringify(next));
    setTime("");
    setDays([]);
  }

  return (
    <div className={`chip-box slot-picker${invalid ? " is-invalid" : ""}`}>
      <div className="slot-days" role="group" aria-label="Jours">
        {WEEK_DAYS.map((item) => (
          <button
            key={item}
            type="button"
            className={days.includes(item) ? "slot-day is-active" : "slot-day"}
            onClick={() => toggleDay(item)}
          >
            {item.slice(0, 3)}
          </button>
        ))}
      </div>
      <div className="slot-time-row">
        <label className="slot-time-label" htmlFor="group-class-time">
          Heure
          <Select
            id="group-class-time"
            value={time}
            onChange={setTime}
            placeholder="Choisir un horaire"
            options={CLASS_TIMES.map((item) => ({ value: item, label: item }))}
          />
        </label>
        <button className="slot-add" type="button" disabled={!time || days.length === 0} onClick={addSlot}>
          Ajouter {days.length > 1 ? `(${days.length} jours)` : days.length === 1 ? days[0] : ""}
        </button>
      </div>
      <div className="chip-list">
        {slots.length === 0 ? (
          <span className="slot-empty">Aucun créneau. Choisissez un ou plusieurs jours, puis un horaire.</span>
        ) : null}
        {slots.map((slot) => (
          <button
            key={slot}
            type="button"
            className="chip"
            onClick={() => onChange(JSON.stringify(slots.filter((item) => item !== slot)))}
          >
            {slot}
            <span className="material-symbols-outlined">close</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BooleanToggle({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="bool-toggle">
      {field.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`bool-option${value === option.value ? " is-active" : ""}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function MoneyField({
  field,
  value,
  onChange,
  invalid,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const money = parseJson<{ amount?: string; currency?: string }>(value || "{}", {});
  const currency = money.currency || field.options[0]?.value || "EUR";
  return (
    <div className={`money-row${invalid ? " is-invalid" : ""}`}>
      <input
        className="custom-input"
        inputMode="decimal"
        placeholder={field.placeholder ?? ""}
        value={money.amount ?? ""}
        onChange={(event) => onChange(JSON.stringify({ amount: event.target.value, currency }))}
      />
      <Select
        className="money-currency"
        value={currency}
        onChange={(next) => onChange(JSON.stringify({ amount: money.amount ?? "", currency: next }))}
        options={field.options}
      />
    </div>
  );
}

export function MultiSelectField({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseJson<string[]>(value || "[]", []);
  function toggle(option: string) {
    onChange(JSON.stringify(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]));
  }
  return (
    <div className="multi-grid">
      {field.options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`multi-card${selected.includes(option.value) ? " is-active" : ""}`}
          onClick={() => toggle(option.value)}
        >
          <span className="material-symbols-outlined">{selected.includes(option.value) ? "check_circle" : "circle"}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function CountrySelectField({
  countries,
  value,
  onChange,
  invalid,
  readOnly,
}: {
  countries: CountrySummary[];
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  readOnly?: boolean;
}) {
  return (
    <Select
      value={value}
      onChange={onChange}
      invalid={invalid}
      disabled={readOnly}
      placeholder="Choisir un pays"
      options={countries.map((country) => ({ value: country.id, label: `${country.flagEmoji} ${country.name}` }))}
    />
  );
}

export function CountryMultiField({
  countries,
  value,
  onChange,
}: {
  countries: CountrySummary[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = parseJson<string[]>(value || "[]", []);
  function toggle(id: string) {
    onChange(JSON.stringify(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]));
  }
  return (
    <div className="country-multi">
      {countries.map((country) => (
        <button
          key={country.id}
          type="button"
          className={`country-pill${selected.includes(country.id) ? " is-active" : ""}`}
          onClick={() => toggle(country.id)}
        >
          <span>{country.flagEmoji}</span>
          {country.name}
        </button>
      ))}
    </div>
  );
}

const LEGAL_REPRESENTATIVE_FIELDS: ItemField[] = [
  { key: "name", label: "Nom et prénom", type: "text", required: true, options: [] },
  { key: "title", label: "Fonction", type: "text", required: true, options: [] },
  { key: "id_number", label: "N° pièce d’identité", type: "text", required: false, options: [] },
  { key: "email", label: "E-mail", type: "text", required: false, options: [] },
  { key: "phone", label: "Téléphone", type: "text", required: false, options: [] },
];

function repeatableSchema(field: ProfileField): ItemField[] {
  if (field.itemFields?.length) {
    return field.itemFields;
  }
  if (field.fieldKey === "legal_representative") {
    return LEGAL_REPRESENTATIVE_FIELDS;
  }
  return [];
}

export function RepeatableField({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
}) {
  const parsed = parseJson<unknown>(value || "[]", []);
  const items = Array.isArray(parsed)
    ? (parsed as Record<string, string>[])
    : parsed && typeof parsed === "object"
      ? [parsed as Record<string, string>]
      : [];
  const schema: ItemField[] = repeatableSchema(field);

  function update(index: number, key: string, next: string) {
    const copy = items.map((item) => ({ ...item }));
    copy[index] = { ...copy[index], [key]: next };
    onChange(JSON.stringify(copy));
  }

  function add() {
    const blank: Record<string, string> = {};
    for (const spec of schema) {
                    blank[spec.key] = spec.type === "select" ? (spec.options?.[0]?.value ?? "") : "";
    }
    onChange(JSON.stringify([...items, blank]));
  }

  return (
    <div className="repeat-list">
      {items.map((item, index) => (
        <div key={index} className="repeat-card">
          <div className="repeat-card-top">
            <span className="font-mono-data text-on-surface-variant">#{index + 1}</span>
            <button
              type="button"
              className="ob-link"
              onClick={() => onChange(JSON.stringify(items.filter((_, current) => current !== index)))}
            >
              Retirer
            </button>
          </div>
          <div className="repeat-grid">
            {schema.map((spec) => (
              <label key={spec.key} className={`repeat-field${spec.type === "textarea" ? " is-full" : ""}`}>
                <span className="auth-label">
                  {spec.label}
                  {spec.required ? " *" : ""}
                </span>
                {spec.type === "select" ? (
                  <Select
                    value={item[spec.key] ?? ""}
                    onChange={(next) => update(index, spec.key, next)}
                    options={spec.options ?? []}
                  />
                ) : spec.type === "textarea" ? (
                  <textarea
                    className="custom-input custom-textarea"
                    value={item[spec.key] ?? ""}
                    onChange={(event) => update(index, spec.key, event.target.value)}
                  />
                ) : (
                  <input
                    className="custom-input"
                    type={spec.type === "month" ? "month" : "text"}
                    value={item[spec.key] ?? ""}
                    onChange={(event) => update(index, spec.key, event.target.value)}
                  />
                )}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="repeat-add" onClick={add} disabled={items.length >= 15}>
        <span className="material-symbols-outlined">add</span>
        Ajouter
      </button>
    </div>
  );
}

export function FileField({
  field,
  value,
  onChange,
  multiple,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
  multiple: boolean;
}) {
  const files = toFileItems(value);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  async function onPick(list: FileList | null) {
    if (!list?.length) {
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const uploaded: FileItem[] = [];
      const selected = Array.from(list).slice(0, multiple ? 8 - files.length : 1);
      for (const file of selected) {
        const result = await uploadProfileFile(field.fieldKey, file);
        uploaded.push({
          id: result.id,
          name: result.originalFilename,
          contentType: result.contentType,
          size: result.sizeBytes,
        });
      }
      onChange(JSON.stringify(multiple ? [...files, ...uploaded] : uploaded));
    } catch {
      setLocalError("Impossible d’envoyer le fichier.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="file-block">
      <label
        className="file-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void onPick(event.dataTransfer.files);
        }}
      >
        <span className="material-symbols-outlined">{field.fieldType === "PHOTO" ? "add_a_photo" : "cloud_upload"}</span>
        <span>{busy ? "Envoi en cours…" : multiple ? "Ajouter des fichiers" : "Choisir un fichier"}</span>
        <small>{field.helpText}</small>
        <input
          type="file"
          hidden
          multiple={multiple}
          accept={field.accept ?? undefined}
          disabled={busy}
          onChange={(event) => {
            void onPick(event.target.files);
            event.target.value = "";
          }}
        />
      </label>
      {files.map((file) => (
        <div key={file.id} className="file-row">
          <span className="material-symbols-outlined">draft</span>
          <span className="file-name">{file.name}</span>
          <button
            type="button"
            className="ob-link"
            onClick={() => onChange(JSON.stringify(files.filter((item) => item.id !== file.id)))}
          >
            Retirer
          </button>
        </div>
      ))}
      {localError ? <p className="auth-field-error">{localError}</p> : null}
    </div>
  );
}

export function PhotoField({
  field,
  value,
  onChange,
  invalid,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  const files = toFileItems(value);
  const current = files[0];
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    if (!current) {
      setPreview(null);
      return;
    }
    fetchUploadBlob(current.id)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        url = URL.createObjectURL(blob);
        setPreview(url);
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null);
        }
      });
    return () => {
      cancelled = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [current?.id]);

  async function onPick(file: File | undefined) {
    if (!file) {
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      const result = await uploadProfileFile(field.fieldKey, file);
      onChange(JSON.stringify([{ id: result.id, name: result.originalFilename, contentType: result.contentType, size: result.sizeBytes }]));
    } catch (error) {
      setLocalError(
        error instanceof ApiError && error.status === 413
          ? "Ce fichier est trop volumineux (max 5 Mo)."
          : "Impossible d’enregistrer l’image. PNG, JPG ou WEBP, max 5 Mo.",
      );
    } finally {
      setBusy(false);
    }
  }

  const addLabel = field.fieldKey === "organization_logo" ? "Ajouter un logo" : "Ajouter une photo";
  const changeLabel = field.fieldKey === "organization_logo" ? "Changer le logo" : "Changer la photo";

  return (
    <div className={`photo-hero${invalid ? " is-invalid" : ""}`}>
      <div className="photo-avatar" style={preview ? { backgroundImage: `url(${preview})` } : undefined}>
        {preview ? null : <span className="material-symbols-outlined">{field.fieldKey === "organization_logo" ? "stadium" : "sports"}</span>}
      </div>
      <div className="photo-copy">
        <p className="auth-label">{field.label}{field.required ? " *" : ""}</p>
        <p className="field-hint">{field.helpText ?? "Une photo nette, de face, fond simple."}</p>
        <label className="ob-upload-live">
          {busy ? "Envoi…" : current ? changeLabel : addLabel}
          <input
            type="file"
            hidden
            accept={field.accept ?? "image/jpeg,image/png,image/webp"}
            disabled={busy}
            onChange={(event) => {
              void onPick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        {localError ? <p className="auth-field-error">{localError}</p> : null}
      </div>
    </div>
  );
}
