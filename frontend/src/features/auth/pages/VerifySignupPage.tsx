import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { OtpInput, type OtpInputHandle, type OtpStatus } from "@/components/ui/otp-input";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "../AuthContext";
import { VerifyHero } from "../components/VerifyHero";
import { clearPendingSignup, readPendingSignup, resendSignupCode, storePendingSignup, verifySignup } from "../api";
import { destinationFor, type AuthResponse } from "../types";

function secondsUntil(timestamp: number) {
  return Math.max(0, Math.ceil((timestamp - Date.now()) / 1000));
}

export function VerifySignupPage() {
  const { startSession } = useAuth();
  const navigate = useNavigate();
  const otpRef = useRef<OtpInputHandle>(null);
  const [pending, setPending] = useState(readPendingSignup);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(() => (pending ? secondsUntil(pending.resendAt) : 0));
  const [expired, setExpired] = useState(false);
  const busy = useRef(false);
  const verified = useRef<AuthResponse | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (!pending) {
    return <Navigate to="/signup" replace />;
  }
  const email = pending.email;

  async function onComplete(code: string) {
    if (busy.current || status === "success") return;
    busy.current = true;
    setError(null);
    setSubmitting(true);
    try {
      verified.current = await verifySignup(email, code);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      otpRef.current?.clear();
      const message = err instanceof ApiError ? err.message : "Impossible de vérifier ce code.";
      if (err instanceof ApiError && /expiré\. Recommencez/.test(message)) {
        setExpired(true);
      }
      setError(message);
      busy.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || resending || !pending) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const next = await resendSignupCode(email);
      const stored = { ...pending, resendAt: Date.now() + next.resendInSeconds * 1000 };
      storePendingSignup(stored);
      setPending(stored);
      setInfo("Un nouveau code a été envoyé.");
      setStatus("idle");
      otpRef.current?.clear();
      busy.current = false;
      setCooldown(next.resendInSeconds);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Impossible de renvoyer le code.";
      if (err instanceof ApiError && /expiré\. Recommencez/.test(message)) {
        setExpired(true);
      }
      setError(message);
    } finally {
      setResending(false);
    }
  }

  function restart() {
    navigate("/signup", { replace: true });
  }

  return (
    <div className="auth-shell vf">
      <VerifyHero />
      <section className="auth-panel">
        <div className="auth-form">
          <div className="mb-8">
            <p className="vf-kicker">Vérification</p>
            <h2 className="vf-title">
              Vérifiez votre <span className="vf-nowrap">e-mail.</span>
            </h2>
            <p className="font-body-md text-on-surface-variant">
              Nous avons envoyé un code à 6 chiffres à <strong>{email}</strong>. Votre compte ne sera créé qu’après la
              saisie de ce code.
            </p>
          </div>
          {expired ? (
            <div className="flex flex-col gap-5">
              <p className="auth-error">{error}</p>
              <button
                className="auth-btn"
                type="button"
                onClick={() => {
                  clearPendingSignup();
                  restart();
                }}
              >
                Recommencer l’inscription
              </button>
            </div>
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
                  successMessage="Email vérifié, compte créé"
                  errorMessage={error ?? ""}
                  onChange={() => {
                    if (status === "error") {
                      setStatus("idle");
                      setError(null);
                    }
                  }}
                  onComplete={(code) => void onComplete(code)}
                  onSuccessAnimationEnd={() => {
                    const response = verified.current;
                    if (!response) return;
                    clearPendingSignup();
                    const user = startSession(response);
                    navigate(destinationFor(user), { replace: true });
                  }}
                />
                {submitting && status !== "success" ? (
                  <p className="font-body-md text-center text-on-surface-variant">Vérification...</p>
                ) : null}
                {info && status !== "error" ? <p className="font-body-md text-on-surface-variant text-center">{info}</p> : null}
                {error && status !== "error" ? <p className="auth-error">{error}</p> : null}
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
                    onClick={restart}
                  >
                    Modifier mes informations
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
