const NAME_PATTERN = /^[\p{L}][\p{L} .'\-]{0,79}$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CITY_PATTERN = /^[\p{L}0-9 .,'\-]{2,80}$/u;

export const LIMITS = {
  name: 80,
  email: 255,
  passwordMin: 8,
  passwordMax: 128,
  city: 80,
  phone: 32,
  about: 250,
} as const;

export function trimValue(value: string) {
  return value.replace(/^\s+|\s+$/g, "");
}

export function hasControlChars(value: string, allowNewlines = false) {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code < 32 && !(allowNewlines && (code === 10 || code === 13))) {
      return true;
    }
  }
  return false;
}

export function validateName(value: string): string | null {
  const trimmed = trimValue(value);
  if (!trimmed) {
    return "This field is required";
  }
  if (trimmed.length > LIMITS.name) {
    return `Maximum ${LIMITS.name} characters`;
  }
  if (hasControlChars(trimmed) || !NAME_PATTERN.test(trimmed)) {
    return "Use letters only, with optional spaces, hyphens or apostrophes";
  }
  return null;
}

export function validateContactEmail(value: string, required: boolean): string | null {
  const trimmed = trimValue(value).toLowerCase();
  if (!trimmed) {
    return required ? "Email is required" : null;
  }
  if (trimmed.length > LIMITS.email) {
    return `Maximum ${LIMITS.email} characters`;
  }
  if (/\s/.test(value) || !EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address";
  }
  return null;
}

export function validateUrl(value: string, required: boolean): string | null {
  const trimmed = trimValue(value);
  if (!trimmed) {
    return required ? "Le site internet est obligatoire" : null;
  }
  if (trimmed.length > 200) {
    return `Maximum 200 characters`;
  }
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "Indiquez un site http:// ou https://";
    }
    if (!parsed.hostname || !parsed.hostname.includes(".")) {
      return "Indiquez un site internet valide";
    }
    return null;
  } catch {
    return "Indiquez un site internet valide";
  }
}

export function validateEmail(value: string): string | null {
  const trimmed = trimValue(value).toLowerCase();
  if (!trimmed) {
    return "Email is required";
  }
  if (trimmed.length > LIMITS.email) {
    return `Maximum ${LIMITS.email} characters`;
  }
  if (/\s/.test(value) || !EMAIL_PATTERN.test(trimmed)) {
    return "Enter a valid email address";
  }
  return null;
}

export function passwordRules(password: string) {
  return {
    length: password.length >= LIMITS.passwordMin && password.length <= LIMITS.passwordMax,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
    noSpace: password.length > 0 && !/\s/.test(password),
  };
}

export function validatePassword(password: string, email = ""): string | null {
  if (!password) {
    return "Password is required";
  }
  if (password.length > LIMITS.passwordMax) {
    return `Maximum ${LIMITS.passwordMax} characters`;
  }
  const rules = passwordRules(password);
  if (!rules.length || !rules.uppercase || !rules.lowercase || !rules.number || !rules.special || !rules.noSpace) {
    return "Use 8–128 characters, with uppercase, lowercase, a number, a special character, and no spaces";
  }
  const local = trimValue(email).split("@")[0]?.toLowerCase();
  if (local && local.length >= 3 && password.toLowerCase().includes(local)) {
    return "Password must not contain your email";
  }
  return null;
}

export function validateLoginPassword(password: string): string | null {
  if (!password) {
    return "Password is required";
  }
  if (password.length > LIMITS.passwordMax) {
    return `Maximum ${LIMITS.passwordMax} characters`;
  }
  return null;
}

export function validateConfirmPassword(password: string, confirm: string): string | null {
  if (!confirm) {
    return "Confirm your password";
  }
  if (password !== confirm) {
    return "Passwords do not match";
  }
  return null;
}

export function validateRequiredText(value: string, label: string, maxLength?: number | null): string | null {
  const trimmed = trimValue(value);
  if (!trimmed) {
    return `${label} is required`;
  }
  if (maxLength && trimmed.length > maxLength) {
    return `Maximum ${maxLength} characters`;
  }
  if (hasControlChars(trimmed)) {
    return `${label} contains invalid characters`;
  }
  return null;
}

export function validateOptionalText(value: string, label: string, maxLength?: number | null): string | null {
  const trimmed = trimValue(value);
  if (!trimmed) {
    return null;
  }
  if (maxLength && trimmed.length > maxLength) {
    return `Maximum ${maxLength} characters`;
  }
  if (hasControlChars(trimmed)) {
    return `${label} contains invalid characters`;
  }
  return null;
}

export function validateCity(value: string, required: boolean): string | null {
  const trimmed = trimValue(value);
  if (!trimmed) {
    return required ? "City is required" : null;
  }
  if (trimmed.length > LIMITS.city || !CITY_PATTERN.test(trimmed)) {
    return "Enter a valid city";
  }
  return null;
}

export function validatePhone(value: string, required: boolean): string | null {
  const trimmed = trimValue(value);
  if (!trimmed) {
    return required ? "Phone number is required" : null;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 6 || digits.length > 15 || !/^[+0-9() .\-]+$/.test(trimmed)) {
    return "Enter a valid phone number";
  }
  return null;
}

export function validateDateOfBirth(value: string, required: boolean): string | null {
  const trimmed = trimValue(value);
  if (!trimmed) {
    return required ? "Date of birth is required" : null;
  }
  const date = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Enter a valid date";
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) {
    return "Date of birth cannot be in the future";
  }
  const min = new Date(today);
  min.setFullYear(min.getFullYear() - 120);
  if (date < min) {
    return "Enter a valid date of birth";
  }
  const maxUnderage = new Date(today);
  maxUnderage.setFullYear(maxUnderage.getFullYear() - 13);
  if (date > maxUnderage) {
    return "You must be at least 13 years old";
  }
  return null;
}

export function validateTextarea(value: string, required: boolean, maxLength?: number | null): string | null {
  const trimmed = trimValue(value);
  if (!trimmed) {
    return required ? "This field is required" : null;
  }
  if (maxLength && trimmed.length > maxLength) {
    return `Maximum ${maxLength} characters`;
  }
  if (hasControlChars(trimmed, true)) {
    return "This field contains invalid characters";
  }
  return null;
}
