import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { OtpInput, type OtpInputHandle, type OtpStatus } from "@/components/ui/otp-input";
import { ApiError } from "@/shared/api/client";
import { confirmGuestQuoteRequest, createGuestQuoteRequest, resendGuestQuoteRequest } from "./api";

type Step = "form" | "confirm" | "done";

export function GuestQuoteForm({ productId, productName }: { productId: string; productName: string }) {
  const [step, setStep] = useState<Step>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("idle");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRef = useRef<OtpInputHandle>(null);

  async function submit() {
    if (!fullName.trim() || !email.trim() || !message.trim()) {
      setError("Indiquez votre nom, votre e-mail et votre besoin.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const result = await createGuestQuoteRequest(productId, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        message: message.trim(),
      });
      setRequestId(result.id);
      setStep("confirm");
      setResendCooldown(60);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d’envoyer la demande.");
    } finally {
      setSending(false);
    }
  }

  async function onComplete(code: string) {
    if (!requestId) return;
    setError(null);
    try {
      await confirmGuestQuoteRequest(requestId, code);
      setOtpStatus("success");
    } catch (err) {
      setOtpStatus("error");
      otpRef.current?.clear();
      setError(err instanceof ApiError ? err.message : "Code invalide.");
    }
  }

  async function resend() {
    if (!requestId || resendCooldown > 0) return;
    try {
      await resendGuestQuoteRequest(requestId);
      setResendCooldown(60);
      otpRef.current?.clear();
      setOtpStatus("idle");
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de renvoyer le code.");
    }
  }

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Demander un devis pour {productName}</h2>
      </div>
      <div className="panel-body">
        {step === "form" ? (
          <>
            <div className="two-col">
              <label className="field">
                <span>Votre nom</span>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </label>
              <label className="field">
                <span>Téléphone (optionnel)</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>
            <label className="field">
              <span>E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label className="field">
              <span>Votre besoin</span>
              <textarea className="custom-textarea" rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
            </label>
            {error ? <p className="auth-error mt-6">{error}</p> : null}
            <Button variant="primary" disabled={sending} onClick={() => void submit()}>
              {sending ? "Envoi…" : "Envoyer la demande"}
            </Button>
          </>
        ) : null}

        {step === "confirm" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <p style={{ textAlign: "center" }}>
              Un code à 6 chiffres a été envoyé à <strong>{email}</strong>. Vous pouvez aussi cliquer sur le lien reçu par
              e-mail si vous l’ouvrez sur un autre appareil.
            </p>
            <OtpInput
              ref={otpRef}
              autoFocus
              status={otpStatus}
              label="Code"
              errorMessage={error ?? ""}
              successMessage="Demande confirmée"
              onChange={() => {
                if (otpStatus === "error") {
                  setOtpStatus("idle");
                  setError(null);
                }
              }}
              onComplete={(code) => void onComplete(code)}
              onSuccessAnimationEnd={() => setStep("done")}
            />
            <button
              type="button"
              className="ob-link"
              disabled={resendCooldown > 0}
              onClick={() => void resend()}
            >
              {resendCooldown > 0 ? `Renvoyer le code (${resendCooldown}s)` : "Renvoyer le code"}
            </button>
          </div>
        ) : null}

        {step === "done" ? (
          <p>
            Votre demande a été transmise au fournisseur, il vous recontactera directement à <strong>{email}</strong>.
          </p>
        ) : null}
      </div>
    </div>
  );
}
