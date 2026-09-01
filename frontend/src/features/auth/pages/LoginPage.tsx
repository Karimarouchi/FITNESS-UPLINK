import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "../AuthContext";
import { AUTH_HERO } from "../components/AuthHeroImage";
import { destinationFor } from "../types";
import { LIMITS, trimValue, validateEmail, validateLoginPassword } from "../validation";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const emailError = useMemo(() => validateEmail(email), [email]);
  const passwordError = useMemo(() => validateLoginPassword(password), [password]);
  const formValid = !emailError && !passwordError;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email) ?? undefined,
      password: validateLoginPassword(password) ?? undefined,
    };
    setFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(trimValue(email).toLowerCase(), password, rememberMe);
      navigate(destinationFor(user), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-hero auth-hero--login">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url('${AUTH_HERO}')` }}
        />
        <div className="absolute inset-0 network-pattern opacity-50 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-transparent to-transparent opacity-80" />
        <div className="relative z-10">
          <div className="flex items-center gap-1 font-headline-md tracking-tight text-on-primary">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              hexagon
            </span>
            FITNESS UPLINK
          </div>
        </div>
        <div className="relative z-10 max-w-lg">
          <h1 className="font-display-lg text-on-primary leading-tight mb-3">
            Your fitness industry.
            <br />
            <span className="text-secondary-fixed-dim">Connected.</span>
          </h1>
          <p className="font-body-lg text-primary-fixed-dim">
            The premium platform for global health tech stakeholders and performance athletes.
          </p>
        </div>
      </section>

      <section className="auth-panel auth-panel--login">
        <div className="auth-form">
          <div className="mb-6 flex items-center gap-1 font-headline-md tracking-tight text-primary lg:hidden">
            <span className="material-symbols-outlined text-secondary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              hexagon
            </span>
            FITNESS UPLINK
          </div>
          <div className="mb-8">
            <h2 className="font-display-lg-mobile text-on-surface mb-1">Welcome back</h2>
            <p className="font-body-md text-on-surface-variant">Access your Fitness Uplink account.</p>
          </div>
          <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
            <div>
              <label className="auth-label" htmlFor="email">
                Email Address
              </label>
              <input
                className={`auth-input${fieldErrors.email ? " is-invalid" : ""}`}
                id="email"
                name="email"
                placeholder="name@company.com"
                required
                type="email"
                inputMode="email"
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
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={LIMITS.passwordMax}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                />
                <button
                  className="auth-eye"
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <span className="material-symbols-outlined text-[22px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
              {fieldErrors.password ? <p className="auth-field-error">{fieldErrors.password}</p> : null}
            </div>
            <div className="flex items-center justify-between gap-4">
              <label className="flex items-center gap-2 font-body-md text-on-surface-variant cursor-pointer select-none">
                <input
                  className="h-4 w-4 accent-secondary"
                  id="remember"
                  name="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Remember me
              </label>
              <span className="font-label-caps uppercase text-outline">Forgot password?</span>
            </div>
            {error ? <p className="auth-error">{error}</p> : null}
            <button className="auth-btn mt-1" type="submit" disabled={submitting || !formValid}>
              {submitting ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <div className="mt-8 border-t border-surface-variant pt-6 text-center">
            <p className="font-body-md text-on-surface-variant">
              New to Fitness Uplink?{" "}
              <Link className="font-semibold text-secondary hover:text-secondary-container" to="/signup">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
