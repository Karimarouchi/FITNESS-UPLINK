import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/Button";
import { academyErrorMessage, confirmTicket, lookupTicket, type Checkin } from "../api";
import "@/shared/styles/backoffice-coaching.css";
import "./academy-tickets.css";

const READER_ID = "academy-qr-reader";

/** Door check-in: scan a member's QR ticket, see at once whether they paid, and cash in on-site payments. */
export function CheckinPage() {
  const [result, setResult] = useState<Checkin | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScan = useRef<string>("");

  const lookup = useCallback(async (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    setError(null);
    setBusy(true);
    try {
      const data = await lookupTicket(value);
      setToken(value);
      setResult(data);
    } catch (err) {
      setResult(null);
      setToken(null);
      setError(academyErrorMessage(err, "Billet introuvable."));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const scanner = new Html5Qrcode(READER_ID);
    scannerRef.current = scanner;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (text) => {
          if (text === lastScan.current) return;
          lastScan.current = text;
          void lookup(text);
        },
        () => undefined,
      )
      .catch(() => setCameraError("Caméra indisponible : saisissez le code du billet ci-dessous."));
    return () => {
      const current = scannerRef.current;
      scannerRef.current = null;
      if (current?.isScanning) {
        void current.stop().then(() => current.clear()).catch(() => undefined);
      }
    };
  }, [lookup]);

  async function confirm() {
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      setResult(await confirmTicket(token));
    } catch (err) {
      setError(academyErrorMessage(err, "Impossible de valider ce billet."));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setResult(null);
    setToken(null);
    setError(null);
    setManual("");
    lastScan.current = "";
  }

  const tone = !result
    ? ""
    : result.checkedInAt || !result.canConfirm
      ? "is-no"
      : result.paid
        ? "is-ok"
        : "is-due";

  return (
    <section className="cg-skin">
      <div className="page-head">
        <div>
          <h1>Contrôle à l’entrée</h1>
          <p className="sub">Scannez le QR code d’un participant pour vérifier son paiement et valider sa présence.</p>
        </div>
      </div>

      <div className="sc-reader">
        <div id={READER_ID} />
      </div>
      {cameraError ? <p className="empty-hint">{cameraError}</p> : null}

      <form
        className="sc-manual"
        onSubmit={(event) => {
          event.preventDefault();
          void lookup(manual);
        }}
      >
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Code du billet" aria-label="Code du billet" />
        <Button variant="mini" type="submit" disabled={busy || !manual.trim()}>
          Vérifier
        </Button>
      </form>

      {error ? <p className="auth-error" style={{ marginTop: 16 }}>{error}</p> : null}

      {result ? (
        <div className={`sc-result ${tone}`} role="status">
          <h2>
            {result.checkedInAt
              ? "Déjà validé"
              : !result.canConfirm
                ? "Entrée refusée"
                : result.paid
                  ? "Payé · entrée OK"
                  : "À payer sur place"}
          </h2>
          <p>
            <b>{result.memberName}</b> · {result.formationTitle}
          </p>
          <p>{new Date(result.scheduledAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</p>
          {!result.paid && result.canConfirm ? (
            <p className="sc-pay">
              {result.amountDue} {result.currency}
            </p>
          ) : null}
          {result.checkedInAt ? (
            <p>Validé à {new Date(result.checkedInAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.</p>
          ) : null}
          {!result.canConfirm && !result.checkedInAt && result.blockReason ? (
            <p>{academyErrorMessage({ message: result.blockReason }, result.blockReason)}</p>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {result.canConfirm ? (
              <Button variant="primary" onClick={() => void confirm()} disabled={busy}>
                {result.paid ? "Valider l’entrée" : "Encaisser et valider"}
              </Button>
            ) : null}
            <Button variant="outline" onClick={reset}>
              Scanner suivant
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
