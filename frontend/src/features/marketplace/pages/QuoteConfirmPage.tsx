import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { OtpInput, type OtpInputHandle, type OtpStatus } from "@/components/ui/otp-input";
import { ApiError } from "@/shared/api/client";
import { confirmGuestQuoteRequest } from "../api";

export function QuoteConfirmPage() {
  const [params] = useSearchParams();
  const requestId = params.get("requestId");
  const codeFromLink = params.get("code");
  const [status, setStatus] = useState<OtpStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const otpRef = useRef<OtpInputHandle>(null);
  const autoTried = useRef(false);

  async function confirm(code: string) {
    if (!requestId) return;
    setError(null);
    try {
      await confirmGuestQuoteRequest(requestId, code);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      otpRef.current?.clear();
      setError(err instanceof ApiError ? err.message : "Code invalide ou expiré.");
    }
  }

  useEffect(() => {
    if (codeFromLink && !autoTried.current) {
      autoTried.current = true;
      void confirm(codeFromLink);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeFromLink]);

  if (!requestId) {
    return (
      <section style={{ padding: 48 }}>
        <p className="jobs-empty">
          <strong>Lien invalide.</strong>
        </p>
      </section>
    );
  }

  return (
    <section style={{ padding: 48, display: "flex", justifyContent: "center" }}>
      <div className="panel" style={{ maxWidth: 420, width: "100%" }}>
        <div className="panel-head">
          <h2>Confirmer votre demande de devis</h2>
        </div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          {done ? (
            <p>Votre demande est confirmée, le fournisseur a été notifié.</p>
          ) : (
            <>
              <p style={{ textAlign: "center" }}>Entrez le code à 6 chiffres reçu par e-mail.</p>
              <OtpInput
                ref={otpRef}
                autoFocus
                status={status}
                label="Code"
                errorMessage={error ?? ""}
                successMessage="Demande confirmée"
                onChange={() => {
                  if (status === "error") {
                    setStatus("idle");
                    setError(null);
                  }
                }}
                onComplete={(code) => void confirm(code)}
                onSuccessAnimationEnd={() => setDone(true)}
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
