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

const HOURS = Array.from({ length: 18 }, (_, index) => `${String(index + 6).padStart(2, "0")}:00`); // 06:00 → 23:00

type SlotRange = { day: (typeof WEEK_DAYS)[number]; from: string; to: string };

/** "Lundi 08:00–12:00" ⇄ range. Legacy single times ("Lundi 07:00") are read as a one-hour range. */
function parseRange(raw: string): SlotRange | null {
  const match = raw.match(/^(\S+)\s+(\d{2}:\d{2})(?:\s*[–-]\s*(\d{2}:\d{2}))?$/);
  if (!match || !(WEEK_DAYS as readonly string[]).includes(match[1])) return null;
  const from = match[2];
  const to = match[3] ?? `${String(Math.min(23, Number(from.slice(0, 2)) + 1)).padStart(2, "0")}:${from.slice(3)}`;
  return { day: match[1] as SlotRange["day"], from, to };
}

function formatRange(range: SlotRange) {
  return `${range.day} ${range.from}–${range.to}`;
}

export function GroupClassSlotsField({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}) {
  const ranges = parseJson<string[]>(value || "[]", [])
    .filter((item) => typeof item === "string")
    .map(parseRange)
    .filter((item): item is SlotRange => item !== null)
    .sort((a, b) => WEEK_DAYS.indexOf(a.day) - WEEK_DAYS.indexOf(b.day) || a.from.localeCompare(b.from));
  const [days, setDays] = useState<(typeof WEEK_DAYS)[number][]>([]);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("12:00");
  const [problem, setProblem] = useState<string | null>(null);

  function save(next: SlotRange[]) {
    onChange(JSON.stringify(next.map(formatRange)));
  }

  function toggleDay(item: (typeof WEEK_DAYS)[number]) {
    setProblem(null);
    setDays((current) => (current.includes(item) ? current.filter((day) => day !== item) : [...current, item]));
  }

  function addRange() {
    if (!days.length) {
      setProblem("Choisissez au moins un jour.");
      return;
    }
    if (to <= from) {
      setProblem("L’heure de fin doit être après l’heure de début.");
      return;
    }
    const overlapping = days.filter((day) => ranges.some((range) => range.day === day && from < range.to && to > range.from));
    if (overlapping.length) {
      setProblem(`Chevauche une plage existante : ${overlapping.join(", ")}.`);
      return;
    }
    save([...ranges, ...days.map((day) => ({ day, from, to }))].slice(0, 40));
    setDays([]);
    setProblem(null);
  }

  const byDay = WEEK_DAYS.map((day) => ({ day, items: ranges.filter((range) => range.day === day) })).filter(
    (entry) => entry.items.length,
  );

  return (
    <div className={`slot-ranges${invalid ? " is-invalid" : ""}`}>
      <div className="slot-days" role="group" aria-label="Jours">
        {WEEK_DAYS.map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={days.includes(item)}
            className={days.includes(item) ? "slot-day is-active" : "slot-day"}
            onClick={() => toggleDay(item)}
          >
            {item.slice(0, 3)}
          </button>
        ))}
      </div>

      <div className="slot-range-row">
        <label>
          <span>De</span>
          <Select id="slot-from" value={from} onChange={setFrom} options={HOURS.slice(0, -1).map((item) => ({ value: item, label: item }))} />
        </label>
        <label>
          <span>À</span>
          <Select id="slot-to" value={to} onChange={setTo} options={HOURS.slice(1).map((item) => ({ value: item, label: item }))} />
        </label>
        <button className="slot-add" type="button" onClick={addRange}>
          <span className="material-symbols-outlined" aria-hidden="true">
            add
          </span>
          Ajouter{days.length > 1 ? ` (${days.length} jours)` : ""}
        </button>
      </div>
      {problem ? <p className="slot-problem">{problem}</p> : null}

      {byDay.length === 0 ? (
        <p className="slot-empty">Aucune plage. Sélectionnez un ou plusieurs jours, puis une plage horaire (ex. 09:00 → 12:00).</p>
      ) : (
        <ul className="slot-week">
          {byDay.map((entry) => (
            <li key={entry.day}>
              <strong>{entry.day}</strong>
              <div>
                {entry.items.map((range) => (
                  <button
                    key={formatRange(range)}
                    type="button"
                    className="slot-range"
                    aria-label={`Retirer ${formatRange(range)}`}
                    onClick={() => save(ranges.filter((item) => formatRange(item) !== formatRange(range)))}
                  >
                    {range.from} → {range.to}
                    <span className="material-symbols-outlined" aria-hidden="true">
                      close
                    </span>
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
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
