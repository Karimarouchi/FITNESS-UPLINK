import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "../AuthContext";
import { AuthHeroImage } from "../components/AuthHeroImage";
import {
  LIMITS,
  passwordRules,
  trimValue,
  validateConfirmPassword,
  validateEmail,
  validateName,
  validatePassword,
} from "../validation";

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`auth-rule ${ok ? "is-ok" : ""}`}>
      <span className="material-symbols-outlined">{ok ? "check_circle" : "radio_button_unchecked"}</span>
      <span>{label}</span>
    </div>
  );
}

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  const rules = useMemo(() => passwordRules(password), [password]);
  const firstNameError = useMemo(() => validateName(firstName), [firstName]);
  const lastNameError = useMemo(() => validateName(lastName), [lastName]);
  const emailError = useMemo(() => validateEmail(email), [email]);
  const passwordError = useMemo(() => validatePassword(password, email), [password, email]);
  const confirmError = useMemo(
    () => validateConfirmPassword(password, confirmPassword),
    [password, confirmPassword],
  );
  const formValid =
    !firstNameError && !lastNameError && !emailError && !passwordError && !confirmError && acceptedTerms;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      firstName: validateName(firstName) ?? undefined,
      lastName: validateName(lastName) ?? undefined,
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password, email) ?? undefined,
      confirmPassword: validateConfirmPassword(password, confirmPassword) ?? undefined,
      terms: acceptedTerms ? undefined : "You must accept the Terms and Privacy Policy.",
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await signup({
        firstName: trimValue(firstName),
        lastName: trimValue(lastName),
        email: trimValue(email).toLowerCase(),
        password,
        confirmPassword,
        acceptedTerms,
      });
      navigate("/onboarding/role", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-hero auth-hero--signup">
        <AuthHeroImage className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute top-8 left-8 z-10 xl:top-10 xl:left-10">
          <span className="font-headline-md tracking-tight text-white drop-shadow-md">FITNESS UPLINK</span>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </section>

      <section className="auth-panel auth-panel--signup">
        <div className="auth-form auth-form--wide">
          <div className="mb-10 font-headline-md tracking-tight text-primary lg:hidden">FITNESS UPLINK</div>
          <div className="mb-8">
            <h1 className="font-display-lg-mobile text-primary mb-2">Create your Fitness Uplink account</h1>
            <p className="font-body-md text-on-surface-variant">
              Join the global network of high-performance athletes.
            </p>
          </div>
          <form className="flex w-full flex-col gap-6" onSubmit={onSubmit} noValidate>
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="auth-label" htmlFor="firstName">
                  First Name
                </label>
                <input
                  className={`auth-input${fieldErrors.firstName ? " is-invalid" : ""}`}
                  id="firstName"
                  name="firstName"
                  placeholder="Jane"
                  type="text"
                  required
                  autoComplete="given-name"
                  maxLength={LIMITS.name}
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    setFieldErrors((current) => ({ ...current, firstName: undefined }));
                  }}
                  onBlur={() =>
                    setFieldErrors((current) => ({ ...current, firstName: validateName(firstName) ?? undefined }))
                  }
                />
                {fieldErrors.firstName ? <p className="auth-field-error">{fieldErrors.firstName}</p> : null}
              </div>
              <div>
                <label className="auth-label" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  className={`auth-input${fieldErrors.lastName ? " is-invalid" : ""}`}
                  id="lastName"
                  name="lastName"
                  placeholder="Doe"
                  type="text"
                  required
                  autoComplete="family-name"
                  maxLength={LIMITS.name}
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    setFieldErrors((current) => ({ ...current, lastName: undefined }));
                  }}
                  onBlur={() =>
                    setFieldErrors((current) => ({ ...current, lastName: validateName(lastName) ?? undefined }))
                  }
                />
                {fieldErrors.lastName ? <p className="auth-field-error">{fieldErrors.lastName}</p> : null}
              </div>
            </div>
            <div>
              <label className="auth-label" htmlFor="email">
                Email Address
              </label>
              <input
                className={`auth-input${fieldErrors.email ? " is-invalid" : ""}`}
                id="email"
                name="email"
                placeholder="jane.doe@example.com"
                type="email"
                inputMode="email"
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={LIMITS.email}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((current) => ({ ...current, email: undefined }));
                }}
                onBlur={() => setFieldErrors((current) => ({ ...current, email: validateEmail(email) ?? undefined }))}
              />
              {fieldErrors.email ? <p className="auth-field-error">{fieldErrors.email}</p> : null}
            </div>
            <div>
              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <div className="auth-password-wrap">
                <input
                  className={`auth-input auth-input--password${fieldErrors.password ? " is-invalid" : ""}`}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  maxLength={LIMITS.passwordMax}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                />
                <button
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="auth-eye"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              <div className="auth-rules">
                <Rule ok={rules.length} label="8–128 characters" />
                <Rule ok={rules.uppercase} label="1 uppercase" />
                <Rule ok={rules.number} label="1 number" />
                <Rule ok={rules.special} label="1 special" />
                <Rule ok={rules.noSpace} label="No spaces" />
              </div>
              {fieldErrors.password ? <p className="auth-field-error">{fieldErrors.password}</p> : null}
            </div>
            <div>
              <label className="auth-label" htmlFor="confirmPassword">
                Confirm password
              </label>
              <input
                className={`auth-input${fieldErrors.confirmPassword ? " is-invalid" : ""}`}
                id="confirmPassword"
                name="confirmPassword"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                maxLength={LIMITS.passwordMax}
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                }}
                onBlur={() =>
                  setFieldErrors((current) => ({
                    ...current,
                    confirmPassword: validateConfirmPassword(password, confirmPassword) ?? undefined,
                  }))
                }
              />
              {fieldErrors.confirmPassword ? <p className="auth-field-error">{fieldErrors.confirmPassword}</p> : null}
            </div>
            <label className="flex items-start gap-3 pt-1 font-body-md text-on-surface-variant cursor-pointer">
              <input
                className="mt-1 h-4 w-4 shrink-0 accent-secondary"
                id="terms"
                name="terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(event) => {
                  setAcceptedTerms(event.target.checked);
                  setFieldErrors((current) => ({ ...current, terms: undefined }));
                }}
              />
              <span>
                I agree to the <span className="text-secondary">Terms</span> and{" "}
                <span className="text-secondary">Privacy Policy</span>.
              </span>
            </label>
            {fieldErrors.terms ? <p className="auth-field-error">{fieldErrors.terms}</p> : null}
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="auth-btn auth-btn--body" type="submit" disabled={submitting || !formValid}>
              {submitting ? "Creating account..." : "Continue"}
              <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </form>
          <div className="mt-8 text-center">
            <p className="font-body-md text-on-surface-variant">
              Already have an account?{" "}
              <Link className="font-bold text-secondary hover:underline underline-offset-4" to="/login">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
