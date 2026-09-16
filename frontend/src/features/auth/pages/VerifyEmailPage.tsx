import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OtpInput, type OtpInputHandle, type OtpStatus } from "@/components/ui/otp-input";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "../AuthContext";
import { AuthHeroImage } from "../components/AuthHeroImage";
import { changeEmail, resendVerification, verifyEmail } from "../api";
import { destinationFor, type AuthUser } from "../types";
import { LIMITS, validateEmail } from "../validation";

export function VerifyEmailPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const otpRef = useRef<OtpInputHandle>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [editingEmail, setEditingEmail] = useState(false);
  const [nextEmail, setNextEmail] = useState(user?.email ?? "");
  const [savingEmail, setSavingEmail] = useState(false);
  const busy = useRef(false);
  const verifiedUser = useRef<AuthUser | null>(null);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  async function onComplete(code: string) {
    if (busy.current || status === "success") {
      return;
    }
    busy.current = true;
    setError(null);
    setSubmitting(true);
    try {
      const next = await verifyEmail(code);
      verifiedUser.current = next;
      setStatus("success");
    } catch (err) {
      setStatus("error");
      otpRef.current?.clear();
      setError(err instanceof ApiError ? err.message : "Impossible de vérifier cet email.");
      busy.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || resending) {
      return;
    }
    setError(null);
    setResending(true);
    try {
      await resendVerification();
      setInfo("Un nouveau code a été envoyé.");
      setStatus("idle");
      otpRef.current?.clear();
      busy.current = false;
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de renvoyer le code.");
    } finally {
      setResending(false);
    }
  }

  async function onChangeEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const emailError = validateEmail(nextEmail);
    if (emailError) {
      setError(emailError);
      return;
    }
    setError(null);
    setSavingEmail(true);
    try {
      const next = await changeEmail(nextEmail.trim().toLowerCase());
      updateUser(next);
      setEditingEmail(false);
      setStatus("idle");
      otpRef.current?.clear();
      busy.current = false;
      setInfo(`Un nouveau code a été envoyé à ${next.email}.`);
      setCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de changer cet email.");
    } finally {
      setSavingEmail(false);
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
            <h2 className="font-display-lg-mobile text-on-surface mb-1">Vérifiez votre email</h2>
            <p className="font-body-md text-on-surface-variant">
              Un code à 6 chiffres est en cours d’envoi à <strong>{user?.email}</strong>. Entrez-le dès que vous le recevez.
            </p>
          </div>
          {editingEmail ? (
            <form className="flex flex-col gap-5 mb-8" onSubmit={onChangeEmail} noValidate>
              <div>
                <label className="auth-label" htmlFor="next-email">
                  Nouvel email
                </label>
                <input
                  className="auth-input"
                  id="next-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={LIMITS.email}
                  value={nextEmail}
                  onChange={(event) => {
                    setNextEmail(event.target.value);
                    setError(null);
                  }}
                />
              </div>
              {error ? <p className="auth-error">{error}</p> : null}
              <button className="auth-btn" type="submit" disabled={savingEmail || Boolean(validateEmail(nextEmail))}>
                {savingEmail ? "Envoi..." : "Envoyer le code"}
              </button>
              <button
                type="button"
                className="font-semibold text-secondary hover:text-secondary-container"
                onClick={() => {
                  setEditingEmail(false);
                  setNextEmail(user?.email ?? "");
                  setError(null);
                }}
              >
                Annuler
              </button>
            </form>
          ) : (
            <>
              <div className="flex flex-col gap-5">
                <label className="auth-label">Code</label>
                <OtpInput
                  ref={otpRef}
                  autoFocus
                  disabled={submitting || status === "success"}
                  status={status}
                  label="Code"
                  hint=""
                  successMessage="Email vérifié"
                  errorMessage={error ?? ""}
                  onChange={() => {
                    if (status === "error") {
                      setStatus("idle");
                      setError(null);
                    }
                  }}
                  onComplete={(code) => void onComplete(code)}
                  onSuccessAnimationEnd={() => {
                    const next = verifiedUser.current;
                    if (!next) {
                      return;
                    }
                    updateUser(next);
                    navigate(destinationFor(next), { replace: true });
                  }}
                />
                {submitting && status !== "success" ? (
                  <p className="font-body-md text-center text-on-surface-variant">Vérification...</p>
                ) : null}
                {info && status !== "error" ? (
                  <p className="font-body-md text-on-surface-variant text-center">{info}</p>
                ) : null}
              </div>
              <div className="mt-8 border-t border-surface-variant pt-6 text-center">
                <p className="font-body-md text-on-surface-variant">
                  Vous n&apos;avez pas reçu le code ?{" "}
                  <button
                    type="button"
                    className="font-semibold text-secondary hover:text-secondary-container disabled:text-outline"
                    onClick={() => void onResend()}
                    disabled={cooldown > 0 || resending || status === "success"}
                  >
                    {cooldown > 0 ? `Renvoyer (${cooldown}s)` : resending ? "Envoi..." : "Renvoyer le code"}
                  </button>
                </p>
                <p className="font-body-md text-on-surface-variant mt-4">
                  Email incorrect ?{" "}
                  <button
                    type="button"
                    className="font-semibold text-secondary hover:text-secondary-container"
                    disabled={status === "success"}
                    onClick={() => {
                      setEditingEmail(true);
                      setNextEmail(user?.email ?? "");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    Modifier l&apos;email
                  </button>
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
