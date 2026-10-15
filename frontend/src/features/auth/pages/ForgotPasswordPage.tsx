import { type FormEvent, useEffect, useMemo, useState } from "react";
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
import "../auth-extras.css";

const RESEND_SECONDS = 60;

const STEPS = [
  { icon: "mail", label: "E-mail" },
  { icon: "pin", label: "Code" },
  { icon: "lock_reset", label: "Mot de passe" },
];

const PERKS = [
  { icon: "shield_lock", title: "Accès sécurisé", text: "Un code à usage unique est envoyé par e-mail." },
  { icon: "bolt", title: "Rapide", text: "Trois étapes, moins d’une minute." },
  { icon: "fitness_center", title: "Votre espace vous attend", text: "Retrouvez vos séances, offres et contacts." },
];

/** True when the server blocked the reset (too many wrong codes or code requests). */
function isBlock(err: unknown) {
  return err instanceof ApiError && err.status === 429 && /bloqu/i.test(err.message);
}

/** The API answers in English for throttling; show it in French. */
function friendlyError(err: unknown, fallback: string) {
  if (!(err instanceof ApiError)) {
    return fallback;
  }
  if (/too many/i.test(err.message)) {
    return "Trop de tentatives. Patientez quelques minutes avant de réessayer.";
  }
  return err.message || fallback;
}

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
  const [cooldown, setCooldown] = useState(0);
  const [blocked, setBlocked] = useState<string | null>(null);

  const emailError = useMemo(() => validateEmail(email), [email]);
  const passwordError = useMemo(() => validatePassword(password, email), [password, email]);
  const confirmError = useMemo(
    () => validateConfirmPassword(password, confirmPassword),
    [password, confirmPassword],
  );
  const rules = useMemo(() => passwordRules(password), [password]);
  const strength = [rules.length, rules.uppercase, rules.number, rules.special].filter(Boolean).length;
  const strengthLabel = ["", "Faible", "Moyen", "Bon", "Excellent"][strength];

  const activeStep = step === "email" ? 0 : codeValid ? 2 : 1;

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

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
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (isBlock(err)) setBlocked((err as ApiError).message);
      setError(friendlyError(err, "Impossible d'envoyer le code."));
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || submitting) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await forgotPassword(trimValue(email).toLowerCase());
      setInfo("Un nouveau code vient d’être envoyé.");
      setCode("");
      setCodeValid(false);
      setCooldown(RESEND_SECONDS);
    } catch (err) {
      if (isBlock(err)) setBlocked((err as ApiError).message);
      setError(friendlyError(err, "Impossible de renvoyer le code."));
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
      if (isBlock(err)) setBlocked((err as ApiError).message);
      setError(friendlyError(err, "Code invalide."));
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
      if (isBlock(err)) setBlocked((err as ApiError).message);
      setError(friendlyError(err, "Impossible de réinitialiser le mot de passe."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-hero auth-hero--signup">
        <AuthHeroImage className="absolute inset-0 h-full w-full object-cover" />
        <div className="fgx-hero-shade" />
        <div className="absolute top-8 left-8 z-10 xl:top-10 xl:left-10">
          <span className="font-headline-md tracking-tight text-white drop-shadow-md">FITNESS UPLINK</span>
        </div>
        <div className="fgx-hero-copy">
          <p className="fgx-hero-kicker">Compte professionnel</p>
          <h2>
            Reprenez la main
            <br />
            <span>sur votre compte.</span>
          </h2>
          <ul>
            {PERKS.map((perk, index) => (
              <li key={perk.title} style={{ animationDelay: `${0.35 + index * 0.15}s` }}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  {perk.icon}
                </span>
                <div>
                  <strong>{perk.title}</strong>
                  <small>{perk.text}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-form fgx-form">
          <ol className="fgx-steps" aria-label="Étapes">
            {STEPS.map((item, index) => (
              <li key={item.label} className={index < activeStep ? "is-done" : index === activeStep ? "is-current" : ""}>
                <span className="fgx-dot">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {index < activeStep ? "check" : item.icon}
                  </span>
                </span>
                <small>{item.label}</small>
              </li>
            ))}
          </ol>

          <div className="fgx-head" key={activeStep}>
            <span className="fgx-badge material-symbols-outlined" aria-hidden="true">
              {STEPS[activeStep].icon}
            </span>
            <h2 className="font-display-lg-mobile text-on-surface mb-1">
              {blocked ? "Accès bloqué" : activeStep === 2 ? "Nouveau mot de passe" : activeStep === 1 ? "Entrez votre code" : "Mot de passe oublié"}
            </h2>
            <p className="font-body-md text-on-surface-variant">
              {blocked
                ? "Par sécurité, cette étape est suspendue pour un moment."
                : step === "email"
                ? "Entrez votre email pour recevoir un code de réinitialisation."
                : codeValid
                  ? "Choisissez un mot de passe solide que vous n’utilisez nulle part ailleurs."
                  : `Un code à 6 chiffres a été envoyé à ${trimValue(email).toLowerCase()}.`}
            </p>
          </div>

          {blocked ? (
            <div className="fgx-locked fgx-step" role="alert">
              <span className="material-symbols-outlined" aria-hidden="true">
                lock_clock
              </span>
              <strong>Réinitialisation temporairement bloquée</strong>
              <p>{blocked}</p>
              <small>
                C’est une protection de votre compte : trop de codes demandés ou trop de codes erronés. Vous pourrez
                réessayer à la fin du délai.
              </small>
            </div>
          ) : step === "email" ? (
            <form className="flex flex-col gap-5 fgx-step" onSubmit={onRequestCode} noValidate>
              <div>
                <label className="auth-label" htmlFor="email">
                  Email
                </label>
                <div className="fgx-field">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    mail
                  </span>
                  <input
                    className="auth-input"
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    maxLength={LIMITS.email}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>
              {error ? <p className="auth-error fgx-alert" role="alert">{error}</p> : null}
              <button className="auth-btn mt-1" type="submit" disabled={submitting || Boolean(emailError)}>
                {submitting ? "Envoi..." : "Envoyer le code"}
              </button>
              <p className="fgx-note">
                <span className="material-symbols-outlined" aria-hidden="true">
                  info
                </span>
                Pour votre sécurité, nous ne confirmons pas si une adresse est enregistrée.
              </p>
            </form>
          ) : (
            <div className="flex flex-col gap-5 fgx-step">
              {info && !codeValid ? <p className="fgx-info">{info}</p> : null}
              <form className="flex flex-col gap-5" onSubmit={onCheckCode} noValidate>
                <div>
                  <label className="auth-label" htmlFor="code">
                    Code
                  </label>
                  <div className="fgx-field">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      pin
                    </span>
                    <input
                      className={`auth-input fgx-code${shakeCode ? " auth-input--shake" : ""}${codeValid ? " is-ok" : ""}`}
                      id="code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="••••••"
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
                </div>
                {!codeValid ? (
                  <>
                    <button className="auth-btn mt-1" type="submit" disabled={checkingCode || code.length !== 6}>
                      {checkingCode ? "Vérification..." : "Vérifier le code"}
                    </button>
                    <div className="fgx-resend">
                      <span>Vous n’avez rien reçu ? Vérifiez vos courriers indésirables.</span>
                      <button type="button" onClick={() => void onResend()} disabled={cooldown > 0 || submitting}>
                        {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          setError(null);
                          setInfo(null);
                        }}
                      >
                        Changer d’adresse
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="auth-code-ok fgx-ok">
                    <span className="material-symbols-outlined" aria-hidden="true">
                      verified
                    </span>
                    Code confirmé
                  </p>
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
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {showPassword ? "visibility_off" : "visibility"}
                        </span>
                      </button>
                    </div>
                    <div className="fgx-meter" data-level={strength} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                      <span />
                      <small>{strengthLabel}</small>
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
                  {error ? <p className="auth-error fgx-alert" role="alert">{error}</p> : null}
                  <button
                    className="auth-btn mt-1"
                    type="submit"
                    disabled={submitting || Boolean(passwordError) || Boolean(confirmError)}
                  >
                    {submitting ? "Mise à jour..." : "Réinitialiser"}
                  </button>
                </form>
              ) : error ? (
                <p className="auth-error fgx-alert" role="alert">{error}</p>
              ) : null}
            </div>
          )}
          <div className="mt-8 border-t border-surface-variant pt-6 text-center">
            <Link className="fgx-back" to="/login">
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
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
