import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import "./credit-card-form.css";
import "./payment-vantage.css";

export type CardState = {
  number: string;
  holder: string;
  month: string;
  year: string;
  cvv: string;
};

export type CardValidity = {
  number: boolean;
  holder: boolean;
  month: boolean;
  year: boolean;
  cvv: boolean;
  allValid: boolean;
};

export type CreditCardFormProps = {
  defaultNumber?: string;
  defaultHolder?: string;
  defaultMonth?: string;
  defaultYear?: string;
  defaultCVV?: string;
  maskMiddle?: boolean;
  ring1?: string;
  ring2?: string;
  showSubmit?: boolean;
  submitLabel?: string;
  incompleteLabel?: string;
  brandLabel?: string;
  labels?: {
    number?: string;
    holder?: string;
    expire?: string;
    month?: string;
    year?: string;
    cvv?: string;
    holderPlaceholder?: string;
    invalidNumber?: string;
  };
  onChange?: (state: CardState, validity: CardValidity) => void;
  onSubmit?: (state: CardState, validity: CardValidity) => void;
  className?: string;
  disabled?: boolean;
};

function formatNumberSpaces(num: string): string {
  return num.replace(/\s+/g, "").replace(/(\d{4})(?=\d)/g, "$1 ");
}

function clampDigits(value: string, maxLen: number) {
  return value.replace(/\D/g, "").slice(0, maxLen);
}

export function CreditCardForm({
  defaultNumber = "",
  defaultHolder = "",
  defaultMonth = "",
  defaultYear = "",
  defaultCVV = "",
  maskMiddle = true,
  ring1 = "#d6ff3f",
  ring2 = "#0040e0",
  showSubmit = true,
  submitLabel = "Payer",
  incompleteLabel = "Complétez tous les champs",
  brandLabel = "FITNESS UPLINK",
  labels,
  onChange,
  onSubmit,
  className = "",
  disabled = false,
}: CreditCardFormProps) {
  const [number, setNumber] = useState(clampDigits(defaultNumber, 19));
  const [holder, setHolder] = useState(defaultHolder.toUpperCase());
  const [month, setMonth] = useState(defaultMonth);
  const [year, setYear] = useState(defaultYear);
  const [cvv, setCVV] = useState(clampDigits(defaultCVV, 4));
  const [focusField, setFocusField] = useState<null | "number" | "holder" | "expire" | "cvv">(null);

  const copy = {
    number: labels?.number ?? "Numéro de carte",
    holder: labels?.holder ?? "Titulaire",
    expire: labels?.expire ?? "Date d’expiration",
    month: labels?.month ?? "Mois",
    year: labels?.year ?? "Année",
    cvv: labels?.cvv ?? "CVV",
    holderPlaceholder: labels?.holderPlaceholder ?? "NOM SUR LA CARTE",
    invalidNumber: labels?.invalidNumber ?? "Le numéro de carte est invalide",
  };

  const flip = focusField === "cvv";
  const years = useMemo(() => {
    const start = new Date().getFullYear();
    return Array.from({ length: 10 }, (_, i) => String(start + i));
  }, []);

  const validity: CardValidity = useMemo(() => {
    // Test phase: only the shape matters (16 digits) — no real card-issuer checksum.
    const numberValid = /^\d{16}$/.test(number);
    const holderValid = holder.trim().length >= 2;
    const monthValid = Boolean(month) && +month >= 1 && +month <= 12;
    const yearValid = Boolean(year) && +year >= new Date().getFullYear();
    const cvvValid = /^\d{3,4}$/.test(cvv);
    return {
      number: numberValid,
      holder: holderValid,
      month: monthValid,
      year: yearValid,
      cvv: cvvValid,
      allValid: numberValid && holderValid && monthValid && yearValid && cvvValid,
    };
  }, [number, holder, month, year, cvv]);

  useEffect(() => {
    onChange?.({ number, holder, month, year, cvv }, validity);
  }, [number, holder, month, year, cvv, validity, onChange]);

  const displayDigits = useMemo(() => number.slice(0, 16).split(""), [number]);
  const displayedSlots = useMemo(() => {
    const arr: { textTop: string; filled: boolean }[] = [];
    for (let i = 0; i < 16; i += 1) {
      let content = "#";
      if (i < displayDigits.length) {
        const digit = displayDigits[i];
        const shouldMask = maskMiddle && i >= 4 && i <= 11;
        content = shouldMask ? "*" : digit;
      }
      arr.push({ textTop: content, filled: i < displayDigits.length });
    }
    return arr;
  }, [displayDigits, maskMiddle]);

  const highlightClass =
    focusField === "number"
      ? "is-number"
      : focusField === "holder"
        ? "is-holder"
        : focusField === "expire"
          ? "is-expire"
          : focusField === "cvv"
            ? "is-cvv"
            : "is-hidden";

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validity.allValid || disabled) {
      return;
    }
    onSubmit?.({ number, holder, month, year, cvv }, validity);
  }

  const ringStyle = { "--ring1": ring1, "--ring2": ring2 } as CSSProperties;

  return (
    <section className={`ccp ${className}`}>
      <div className="ccp-wrap">
        <div className="ccp-float">
        <section className={`ccp-card${flip ? " is-flip" : ""}`}>
          <div className={`ccp-highlight ${highlightClass}`} />

          <section className="ccp-front" style={ringStyle}>
            <span className="ccp-shine" aria-hidden="true" />
            <div className="ccp-header">
              <div className="ccp-brand">
                <span className="ccp-chip" aria-hidden="true" />
                <span>{brandLabel}</span>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" height="40" width="60" viewBox="-96 -98.908 832 593.448" aria-hidden>
                <path fill="#ff5f00" d="M224.833 42.298h190.416v311.005H224.833z" />
                <path
                  d="M244.446 197.828a197.448 197.448 0 0175.54-155.475 197.777 197.777 0 100 311.004 197.448 197.448 0 01-75.54-155.53z"
                  fill="#eb001b"
                />
                <path
                  d="M621.101 320.394v-6.372h2.747v-1.319h-6.537v1.319h2.582v6.373zm12.691 0v-7.69h-1.978l-2.307 5.493-2.308-5.494h-1.977v7.691h1.428v-5.823l2.143 5h1.483l2.143-5v5.823z"
                  fill="#f79e1b"
                />
                <path
                  d="M640 197.828a197.777 197.777 0 01-320.015 155.474 197.777 197.777 0 000-311.004A197.777 197.777 0 01640 197.773z"
                  fill="#f79e1b"
                />
              </svg>
            </div>

            <div className="ccp-number" aria-label={copy.number}>
              {displayedSlots.map((slot, idx) => (
                <span key={idx} className="ccp-slot">
                  <span className={`ccp-digit${slot.filled ? " is-filled" : ""}`}>
                    <span className="ccp-row">#</span>
                    <span className="ccp-row">{slot.textTop}</span>
                  </span>
                </span>
              ))}
            </div>

            <div className="ccp-footer">
              <div className="ccp-holder">
                <div className="ccp-section-title">{copy.holder}</div>
                <div>{holder || copy.holderPlaceholder}</div>
              </div>
              <div>
                <div className="ccp-section-title">{copy.expire}</div>
                <span>{month || "MM"}</span>/<span>{year ? year.slice(-2) : "YY"}</span>
              </div>
            </div>
          </section>

          <section className="ccp-back" style={ringStyle}>
            <div className="ccp-hide-line" />
            <div className="ccp-cvv">
              <span>{copy.cvv}</span>
              <div className="ccp-cvv-field">{"*".repeat(cvv.length)}</div>
            </div>
          </section>
        </section>
        </div>

        <form className="ccp-form" onSubmit={handleSubmit} noValidate>
          <div>
            <label htmlFor="ccp-number">{copy.number}</label>
            <input
              id="ccp-number"
              inputMode="numeric"
              autoComplete="cc-number"
              placeholder="1234 5678 9012 3456"
              value={formatNumberSpaces(number)}
              disabled={disabled}
              onChange={(event) => setNumber(clampDigits(event.target.value, 19))}
              onFocus={() => setFocusField("number")}
              onBlur={() => setFocusField(null)}
              aria-invalid={!validity.number}
            />
            {!validity.number && number.length >= 13 ? <small className="ccp-err">{copy.invalidNumber}</small> : null}
          </div>

          <div>
            <label htmlFor="ccp-holder">{copy.holder}</label>
            <input
              id="ccp-holder"
              type="text"
              autoComplete="cc-name"
              placeholder={copy.holderPlaceholder}
              value={holder}
              disabled={disabled}
              onChange={(event) => setHolder(event.target.value.toUpperCase())}
              onFocus={() => setFocusField("holder")}
              onBlur={() => setFocusField(null)}
              aria-invalid={!validity.holder}
            />
          </div>

          <div className="ccp-group">
            <div>
              <label>{copy.expire}</label>
              <div className="ccp-date">
                <select
                  id="ccp-month"
                  value={month || ""}
                  disabled={disabled}
                  onChange={(event) => setMonth(event.target.value)}
                  onFocus={() => setFocusField("expire")}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.month}
                >
                  <option value="" disabled>
                    {copy.month}
                  </option>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  id="ccp-year"
                  value={year || ""}
                  disabled={disabled}
                  onChange={(event) => setYear(event.target.value)}
                  onFocus={() => setFocusField("expire")}
                  onBlur={() => setFocusField(null)}
                  aria-invalid={!validity.year}
                >
                  <option value="" disabled>
                    {copy.year}
                  </option>
                  {years.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="ccp-cvv">{copy.cvv}</label>
              <input
                id="ccp-cvv"
                inputMode="numeric"
                autoComplete="cc-csc"
                placeholder="***"
                value={cvv}
                disabled={disabled}
                onChange={(event) => setCVV(clampDigits(event.target.value, 4))}
                onFocus={() => setFocusField("cvv")}
                onBlur={() => setFocusField(null)}
                aria-invalid={!validity.cvv}
              />
            </div>
          </div>

          {showSubmit ? (
            <button className="ccp-submit" type="submit" disabled={!validity.allValid || disabled}>
              {validity.allValid ? submitLabel : incompleteLabel}
            </button>
          ) : null}
        </form>
      </div>
    </section>
  );
}

export default CreditCardForm;
