import { useEffect, useState } from "react";
import type { CountrySummary, ItemField, ProfileField } from "@/features/auth/types";
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
            .slice(0, 8)
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
      <select
        className="custom-input money-currency"
        value={currency}
        onChange={(event) => onChange(JSON.stringify({ amount: money.amount ?? "", currency: event.target.value }))}
      >
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
    <select
      className={`custom-input${invalid ? " is-invalid" : ""}${readOnly ? " is-readonly" : ""}`}
      value={value}
      disabled={readOnly}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Choisir un pays</option>
      {countries.map((country) => (
        <option key={country.id} value={country.id}>
          {country.flagEmoji} {country.name}
        </option>
      ))}
    </select>
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

export function RepeatableField({
  field,
  value,
  onChange,
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
}) {
  const items = parseJson<Record<string, string>[]>(value || "[]", []);
  const schema: ItemField[] = field.itemFields ?? [];

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
                  <select className="custom-input" value={item[spec.key] ?? ""} onChange={(event) => update(index, spec.key, event.target.value)}>
                    {(spec.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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
      <label className="file-drop">
        <span className="material-symbols-outlined">{field.fieldType === "PHOTO" ? "add_a_photo" : "upload_file"}</span>
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
}: {
  field: ProfileField;
  value: string;
  onChange: (value: string) => void;
}) {
  const files = toFileItems(value);
  const current = files[0];
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    try {
      const result = await uploadProfileFile(field.fieldKey, file);
      onChange(JSON.stringify([{ id: result.id, name: result.originalFilename, contentType: result.contentType, size: result.sizeBytes }]));
    } catch {
      // keep previous photo if upload fails
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-hero">
      <div className="photo-avatar" style={preview ? { backgroundImage: `url(${preview})` } : undefined}>
        {preview ? null : <span className="material-symbols-outlined">person</span>}
      </div>
      <div className="photo-copy">
        <p className="auth-label">{field.label}{field.required ? " *" : ""}</p>
        <p className="font-body-md text-on-surface-variant">{field.helpText ?? "Une photo nette, de face, fond simple."}</p>
        <label className="ob-upload-live">
          {busy ? "Envoi…" : current ? "Changer la photo" : "Ajouter une photo"}
          <input
            type="file"
            hidden
            accept={field.accept ?? "image/jpeg,image/png,image/webp"}
            onChange={(event) => {
              void onPick(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
