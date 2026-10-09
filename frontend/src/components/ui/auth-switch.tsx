import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { destinationFor, safeRedirectTarget } from "@/features/auth/types";
import { readPendingSignup, storePendingSignup } from "@/features/auth/api";
import { executeRecaptcha, loadRecaptcha, recaptchaEnabled } from "@/features/auth/recaptcha";
import {
  LIMITS,
  passwordRules,
  trimValue,
  validateConfirmPassword,
  validateEmail,
  validateLoginPassword,
  validateName,
  validatePassword,
} from "@/features/auth/validation";
import "./auth-switch.css";

type Mode = "login" | "signup";

function BackHome() {
  return (
    <Link className="fu-back" to="/">
      <ArrowLeft size={16} />
      Retour à l’accueil
    </Link>
  );
}

function PasswordRule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={`auth-rule ${ok ? "is-ok" : ""}`}>
      <span className="material-symbols-outlined">{ok ? "check_circle" : "radio_button_unchecked"}</span>
      <span>{label}</span>
    </div>
  );
}

export function AuthSwitch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pathMode: Mode | null =
    location.pathname === "/signup" ? "signup" : location.pathname === "/login" ? "login" : null;
  const [internalMode, setInternalMode] = useState<Mode>(pathMode ?? "login");
  const mode: Mode = pathMode ?? internalMode;
  const isSignup = mode === "signup";
  const { login, signup } = useAuth();

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginRememberMe, setLoginRememberMe] = useState(false);
  const [loginShowPw, setLoginShowPw] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginFieldErrors, setLoginFieldErrors] = useState<Record<string, string | undefined>>({});
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [pendingDraft] = useState(readPendingSignup);
  const [firstName, setFirstName] = useState(pendingDraft?.firstName ?? "");
  const [lastName, setLastName] = useState(pendingDraft?.lastName ?? "");
  const [signupEmail, setSignupEmail] = useState(pendingDraft?.email ?? "");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signupShowPw, setSignupShowPw] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupFieldErrors, setSignupFieldErrors] = useState<Record<string, string | undefined>>({});
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  const rules = useMemo(() => passwordRules(signupPassword), [signupPassword]);
  const firstNameError = useMemo(() => validateName(firstName), [firstName]);
  const lastNameError = useMemo(() => validateName(lastName), [lastName]);
  const signupEmailError = useMemo(() => validateEmail(signupEmail), [signupEmail]);
  const signupPwError = useMemo(() => validatePassword(signupPassword, signupEmail), [signupPassword, signupEmail]);
  const confirmError = useMemo(
    () => validateConfirmPassword(signupPassword, confirmPassword),
    [signupPassword, confirmPassword],
  );
  const loginEmailError = useMemo(() => validateEmail(loginEmail), [loginEmail]);
  const loginPwError = useMemo(() => validateLoginPassword(loginPassword), [loginPassword]);
  const signupValid =
    !firstNameError && !lastNameError && !signupEmailError && !signupPwError && !confirmError && acceptedTerms;

  useEffect(() => {
    loadRecaptcha().catch(() => undefined);
  }, []);

  function switchMode(next: Mode) {
    if (next === mode) return;
    setLoginError(null);
    setSignupError(null);
    if (pathMode) {
      navigate(next === "signup" ? "/signup" : "/login", { replace: true });
      return;
    }
    setInternalMode(next);
  }

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(loginEmail) ?? undefined,
      password: validateLoginPassword(loginPassword) ?? undefined,
    };
    setLoginFieldErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) return;
    setLoginError(null);
    setLoginSubmitting(true);
    try {
      const user = await login(trimValue(loginEmail).toLowerCase(), loginPassword, loginRememberMe);
      const redirect = safeRedirectTarget(searchParams.get("redirect"));
      navigate(redirect ?? destinationFor(user), { replace: true });
    } catch (err) {
      setLoginError(
        err instanceof ApiError && (err.status === 403 || /disabled/i.test(err.message))
          ? "Ce compte a été bloqué."
          : err instanceof ApiError
            ? err.message
            : "Impossible de se connecter.",
      );
    } finally {
      setLoginSubmitting(false);
    }
  }

  async function onSignup(event: FormEvent) {
    event.preventDefault();
    const nextErrors: Record<string, string | undefined> = {
      firstName: validateName(firstName) ?? undefined,
      lastName: validateName(lastName) ?? undefined,
      email: validateEmail(signupEmail) ?? undefined,
      password: validatePassword(signupPassword, signupEmail) ?? undefined,
      confirmPassword: validateConfirmPassword(signupPassword, confirmPassword) ?? undefined,
      terms: acceptedTerms ? undefined : "You must accept the Terms and Privacy Policy.",
    };
    setSignupFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;
    setSignupError(null);
    setSignupSubmitting(true);
    try {
      const recaptchaToken = await executeRecaptcha("signup");
      const pending = await signup({
        firstName: trimValue(firstName),
        lastName: trimValue(lastName),
        email: trimValue(signupEmail).toLowerCase(),
        password: signupPassword,
        confirmPassword,
        acceptedTerms,
        recaptchaToken,
      });
      storePendingSignup({
        email: pending.email,
        firstName: trimValue(firstName),
        lastName: trimValue(lastName),
        resendAt: Date.now() + pending.resendInSeconds * 1000,
      });
      navigate("/signup/verify", { replace: true });
    } catch (err) {
      setSignupError(err instanceof ApiError ? err.message : "Unable to create account");
    } finally {
      setSignupSubmitting(false);
    }
  }

  return (
    <div className={cn("fu-switch fu-auth", isSignup && "is-signup")} lang="fr">
      <div className="fu-blob" aria-hidden>
        <div className="fu-blob-photo" />
        <div className="fu-blob-glow" />
        <div className="fu-blob-pattern network-pattern" />
        <div className="fu-blob-fade" />
      </div>

      <div className="fu-forms">
        <div className="fu-forms-inner">
          <form className="fu-form fu-form--signin" onSubmit={onLogin} noValidate>
            <BackHome />
            <p className="fu-form-kicker">Espace membre</p>
            <h2 className="fu-form-title">Bon retour.</h2>
            <p className="fu-form-sub">Connectez-vous pour retrouver votre réseau, vos séances et vos opportunités.</p>

            <div className="fu-control">
              <label className="auth-label" htmlFor="login-email">
                Adresse e-mail
              </label>
              <div className="fu-field">
                <Mail className="fu-field-icon" size={16} />
                <input
                  className={cn("auth-input fu-input", loginFieldErrors.email && "is-invalid")}
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={LIMITS.email}
                  placeholder="nom@entreprise.com"
                  value={loginEmail}
                  onChange={(event) => {
                    setLoginEmail(event.target.value);
                    setLoginFieldErrors((current) => ({ ...current, email: undefined }));
                  }}
                  onBlur={() =>
                    setLoginFieldErrors((current) => ({ ...current, email: validateEmail(loginEmail) ?? undefined }))
                  }
                />
              </div>
              {loginFieldErrors.email ? <p className="auth-field-error">{loginFieldErrors.email}</p> : null}
            </div>

            <div className="fu-control">
              <label className="auth-label" htmlFor="login-password">
                Mot de passe
              </label>
              <div className="fu-field">
                <Lock className="fu-field-icon" size={16} />
                <input
                  className={cn("auth-input fu-input fu-input--pw", loginFieldErrors.password && "is-invalid")}
                  id="login-password"
                  type={loginShowPw ? "text" : "password"}
                  autoComplete="current-password"
                  maxLength={LIMITS.passwordMax}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(event) => {
                    setLoginPassword(event.target.value);
                    setLoginFieldErrors((current) => ({ ...current, password: undefined }));
                  }}
                />
                <button
                  className="auth-eye"
                  type="button"
                  onClick={() => setLoginShowPw((value) => !value)}
                  aria-label={loginShowPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {loginShowPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {loginFieldErrors.password ? <p className="auth-field-error">{loginFieldErrors.password}</p> : null}
            </div>

            <div className="fu-row">
              <label className="fu-check">
                <input
                  type="checkbox"
                  checked={loginRememberMe}
                  onChange={(event) => setLoginRememberMe(event.target.checked)}
                />
                Se souvenir de moi
              </label>
              <Link className="fu-link" to="/forgot-password">
                Mot de passe oublié ?
              </Link>
            </div>

            {loginError ? <p className="auth-error">{loginError}</p> : null}

            <button
              className="auth-btn fu-submit"
              type="submit"
              disabled={loginSubmitting || Boolean(loginEmailError) || Boolean(loginPwError)}
            >
              {loginSubmitting ? "Connexion…" : "Se connecter"}
              <ArrowRight size={18} />
            </button>

            <p className="fu-switch-hint">
              Pas encore membre ?{" "}
              <button type="button" onClick={() => switchMode("signup")}>
                Créer un compte
              </button>
            </p>
          </form>

          <form className="fu-form fu-form--signup" onSubmit={onSignup} noValidate>
            <BackHome />
            <p className="fu-form-kicker">Rejoindre le réseau</p>
            <h2 className="fu-form-title">Créez votre compte.</h2>
            <p className="fu-form-sub">Gratuit, en moins d’une minute.</p>

            <div className="fu-signup-id">
              <div className="fu-control">
                <label className="auth-label" htmlFor="first-name">
                  Prénom
                </label>
                <input
                  className={cn("auth-input", signupFieldErrors.firstName && "is-invalid")}
                  id="first-name"
                  type="text"
                  autoComplete="given-name"
                  maxLength={LIMITS.name}
                  placeholder="Jane"
                  value={firstName}
                  onChange={(event) => {
                    setFirstName(event.target.value);
                    setSignupFieldErrors((current) => ({ ...current, firstName: undefined }));
                  }}
                  onBlur={() =>
                    setSignupFieldErrors((current) => ({
                      ...current,
                      firstName: validateName(firstName) ?? undefined,
                    }))
                  }
                />
                {signupFieldErrors.firstName ? (
                  <p className="auth-field-error">{signupFieldErrors.firstName}</p>
                ) : null}
              </div>
              <div className="fu-control">
                <label className="auth-label" htmlFor="last-name">
                  Nom
                </label>
                <input
                  className={cn("auth-input", signupFieldErrors.lastName && "is-invalid")}
                  id="last-name"
                  type="text"
                  autoComplete="family-name"
                  maxLength={LIMITS.name}
                  placeholder="Doe"
                  value={lastName}
                  onChange={(event) => {
                    setLastName(event.target.value);
                    setSignupFieldErrors((current) => ({ ...current, lastName: undefined }));
                  }}
                  onBlur={() =>
                    setSignupFieldErrors((current) => ({ ...current, lastName: validateName(lastName) ?? undefined }))
                  }
                />
                {signupFieldErrors.lastName ? <p className="auth-field-error">{signupFieldErrors.lastName}</p> : null}
              </div>
              <div className="fu-control fu-signup-email">
                <label className="auth-label" htmlFor="signup-email">
                  Adresse e-mail
                </label>
                <div className="fu-field">
                  <Mail className="fu-field-icon" size={16} />
                  <input
                    className={cn("auth-input fu-input", signupFieldErrors.email && "is-invalid")}
                    id="signup-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    maxLength={LIMITS.email}
                    placeholder="jane.doe@exemple.com"
                    value={signupEmail}
                    onChange={(event) => {
                      setSignupEmail(event.target.value);
                      setSignupFieldErrors((current) => ({ ...current, email: undefined }));
                    }}
                    onBlur={() =>
                      setSignupFieldErrors((current) => ({ ...current, email: validateEmail(signupEmail) ?? undefined }))
                    }
                  />
                </div>
                {signupFieldErrors.email ? <p className="auth-field-error">{signupFieldErrors.email}</p> : null}
              </div>
            </div>

            <div className="fu-signup-pw fu-signup-pw--split">
              <div className="fu-control">
                <label className="auth-label" htmlFor="signup-password">
                  Mot de passe
                </label>
                <div className="fu-field">
                  <Lock className="fu-field-icon" size={16} />
                  <input
                    className={cn("auth-input fu-input fu-input--pw", signupFieldErrors.password && "is-invalid")}
                    id="signup-password"
                    type={signupShowPw ? "text" : "password"}
                    autoComplete="new-password"
                    maxLength={LIMITS.passwordMax}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(event) => {
                      setSignupPassword(event.target.value);
                      setSignupFieldErrors((current) => ({ ...current, password: undefined }));
                    }}
                  />
                  <button
                    className="auth-eye"
                    type="button"
                    onClick={() => setSignupShowPw((value) => !value)}
                    aria-label={signupShowPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {signupShowPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {signupFieldErrors.password ? <p className="auth-field-error">{signupFieldErrors.password}</p> : null}
              </div>
              <div className="fu-control">
                <label className="auth-label" htmlFor="confirm-password">
                  Confirmation
                </label>
                <input
                  className={cn("auth-input", signupFieldErrors.confirmPassword && "is-invalid")}
                  id="confirm-password"
                  type={signupShowPw ? "text" : "password"}
                  autoComplete="new-password"
                  maxLength={LIMITS.passwordMax}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setSignupFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                  }}
                  onBlur={() =>
                    setSignupFieldErrors((current) => ({
                      ...current,
                      confirmPassword: validateConfirmPassword(signupPassword, confirmPassword) ?? undefined,
                    }))
                  }
                />
                {signupFieldErrors.confirmPassword ? (
                  <p className="auth-field-error">{signupFieldErrors.confirmPassword}</p>
                ) : null}
              </div>
            </div>

            <div className="auth-rules fu-rules">
              <PasswordRule ok={rules.length} label="8–128 caractères" />
              <PasswordRule ok={rules.uppercase} label="Majuscule" />
              <PasswordRule ok={rules.lowercase} label="Minuscule" />
              <PasswordRule ok={rules.number} label="Chiffre" />
              <PasswordRule ok={rules.special} label="Caractère spécial" />
              <PasswordRule ok={rules.noSpace} label="Sans espace" />
            </div>

            <div className="fu-signup-foot">
              <label className="fu-check fu-check--terms">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => {
                    setAcceptedTerms(event.target.checked);
                    setSignupFieldErrors((current) => ({ ...current, terms: undefined }));
                  }}
                />
                <span>
                  J’accepte les <span className="text-secondary">Conditions</span> et la{" "}
                  <span className="text-secondary">Politique de confidentialité</span>.
                </span>
              </label>
              {signupFieldErrors.terms ? <p className="auth-field-error">{signupFieldErrors.terms}</p> : null}
              {signupError ? <p className="auth-error">{signupError}</p> : null}
              {recaptchaEnabled() ? (
                <p className="fu-recaptcha">
                  This site is protected by reCAPTCHA and the Google{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
                    Privacy Policy
                  </a>{" "}
                  and{" "}
                  <a href="https://policies.google.com/terms" target="_blank" rel="noreferrer">
                    Terms of Service
                  </a>{" "}
                  apply.
                </p>
              ) : null}
              <button className="auth-btn fu-submit" type="submit" disabled={signupSubmitting || !signupValid}>
                {signupSubmitting ? "Envoi du code…" : "Créer mon compte"}
                <ArrowRight size={18} />
              </button>
              <p className="fu-switch-hint">
                Déjà membre ?{" "}
                <button type="button" onClick={() => switchMode("login")}>
                  Se connecter
                </button>
              </p>
            </div>
          </form>
        </div>
      </div>

      <div className="fu-panels">
        <div className="fu-panel fu-panel--left">
          <div className="fu-panel-content">
            <p className="fu-panel-kicker">Nouveau sur le réseau ?</p>
            <h2 className="fu-panel-title">
              Plus de mouvement.
              <br />
              <span>Plus de réseau.</span>
            </h2>
            <p className="fu-panel-copy">
              Recrutement, coaching, formations, matériel et événements : rejoignez le circuit du fitness en quelques
              secondes.
            </p>
            <button type="button" className="fu-ghost" onClick={() => switchMode("signup")}>
              Créer mon compte
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <div className="fu-panel fu-panel--right">
          <div className="fu-panel-content">
            <p className="fu-panel-kicker">Déjà membre ?</p>
            <h2 className="fu-panel-title">
              Content de
              <br />
              <span>vous revoir.</span>
            </h2>
            <p className="fu-panel-copy">
              Connectez-vous pour retrouver votre dossier, vos séances, vos devis et vos opportunités.
            </p>
            <button type="button" className="fu-ghost" onClick={() => switchMode("login")}>
              Se connecter
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthSwitch;
