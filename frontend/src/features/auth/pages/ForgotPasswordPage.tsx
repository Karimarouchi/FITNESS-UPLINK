import { type FormEvent, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { AuthHeroImage } from "../components/AuthHeroImage";
import { forgotPassword, resetPassword, verifyResetCode } from "../api";
import {
  LIMITS,
  passwordRules,
  trimValue,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
} from "../validation";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeValid, setCodeValid] = useState(false);
  const [checkingCode, setCheckingCode] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [shakeCode, setShakeCode] = useState(false);

  const emailError = useMemo(() => validateEmail(email), [email]);
  const passwordError = useMemo(() => validatePassword(password, email), [password, email]);
  const confirmError = useMemo(
    () => validateConfirmPassword(password, confirmPassword),
    [password, confirmPassword],
  );
  const rules = useMemo(() => passwordRules(password), [password]);

  async function onRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (emailError) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(trimValue(email).toLowerCase());
      setInfo("Si un compte existe, un code a été envoyé.");
      setStep("code");
      setCode("");
      setCodeValid(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le code.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onCheckCode(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmedCode = code.replace(/\D/g, "");
    if (trimmedCode.length !== 6 || checkingCode || codeValid) {
      return;
    }
    setError(null);
    setCheckingCode(true);
    try {
      await verifyResetCode(trimValue(email).toLowerCase(), trimmedCode);
      setCodeValid(true);
    } catch (err) {
      setCodeValid(false);
      setShakeCode(true);
      window.setTimeout(() => setShakeCode(false), 500);
      setError(err instanceof ApiError ? err.message : "Code invalide.");
    } finally {
      setCheckingCode(false);
    }
  }

  async function onReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedCode = code.replace(/\D/g, "");
    if (!codeValid || trimmedCode.length !== 6 || passwordError || confirmError) {
      setError("Vérifiez le code et le nouveau mot de passe.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword({
        email: trimValue(email).toLowerCase(),
        code: trimmedCode,
        password,
        confirmPassword,
      });
      navigate("/login", { replace: true, state: { reset: true } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de réinitialiser le mot de passe.");
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
      </section>
      <section className="auth-panel">
        <div className="auth-form">
          <div className="mb-8">
            <h2 className="font-display-lg-mobile text-on-surface mb-1">Mot de passe oublié</h2>
            <p className="font-body-md text-on-surface-variant">
              {step === "email"
                ? "Entrez votre email pour recevoir un code de réinitialisation."
                : `Un code a été envoyé à ${trimValue(email).toLowerCase()}.`}
            </p>
          </div>
          {step === "email" ? (
            <form className="flex flex-col gap-5" onSubmit={onRequestCode} noValidate>
              <div>
                <label className="auth-label" htmlFor="email">
                  Email
                </label>
                <input
                  className="auth-input"
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={LIMITS.email}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              {error ? <p className="auth-error">{error}</p> : null}
              <button className="auth-btn mt-1" type="submit" disabled={submitting || Boolean(emailError)}>
                {submitting ? "Envoi..." : "Envoyer le code"}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-5">
              {info && !codeValid ? <p className="font-body-md text-on-surface-variant">{info}</p> : null}
              <form className="flex flex-col gap-5" onSubmit={onCheckCode} noValidate>
                <div>
                  <label className="auth-label" htmlFor="code">
                    Code
                  </label>
                  <input
                    className={`auth-input${shakeCode ? " auth-input--shake" : ""}${codeValid ? " is-ok" : ""}`}
                    id="code"
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    readOnly={codeValid}
                    onChange={(event) => {
                      const next = event.target.value.replace(/\D/g, "").slice(0, 6);
                      setCode(next);
                      setCodeValid(false);
                      setError(null);
                    }}
                  />
                </div>
                {!codeValid ? (
                  <button className="auth-btn mt-1" type="submit" disabled={checkingCode || code.length !== 6}>
                    {checkingCode ? "Vérification..." : "Vérifier le code"}
                  </button>
                ) : (
                  <p className="auth-code-ok">Code confirmé</p>
                )}
              </form>
              {codeValid ? (
                <form className="auth-reveal flex flex-col gap-5" onSubmit={onReset} noValidate>
                  <div>
                    <label className="auth-label" htmlFor="password">
                      Nouveau mot de passe
                    </label>
                    <div className="auth-password-wrap">
                      <input
                        className="auth-input auth-input--password"
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        maxLength={LIMITS.passwordMax}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
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
                    <div className="mt-3 flex flex-col gap-1">
                      <Rule ok={rules.length} label="8 caractères minimum" />
                      <Rule ok={rules.uppercase} label="Une majuscule" />
                      <Rule ok={rules.number} label="Un chiffre" />
                      <Rule ok={rules.special} label="Un caractère spécial" />
                    </div>
                  </div>
                  <div>
                    <label className="auth-label" htmlFor="confirmPassword">
                      Confirmer
                    </label>
                    <input
                      className="auth-input"
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      maxLength={LIMITS.passwordMax}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                  {error ? <p className="auth-error">{error}</p> : null}
                  <button
                    className="auth-btn mt-1"
                    type="submit"
                    disabled={submitting || Boolean(passwordError) || Boolean(confirmError)}
                  >
                    {submitting ? "Mise à jour..." : "Réinitialiser"}
                  </button>
                </form>
              ) : error ? (
                <p className="auth-error">{error}</p>
              ) : null}
            </div>
          )}
          <div className="mt-8 border-t border-surface-variant pt-6 text-center">
            <Link className="font-semibold text-secondary hover:text-secondary-container" to="/login">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`auth-rule ${ok ? "is-ok" : ""}`}>
      <span className="material-symbols-outlined">{ok ? "check_circle" : "radio_button_unchecked"}</span>
      <span>{label}</span>
    </div>
  );
}
