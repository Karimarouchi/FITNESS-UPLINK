import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCardForm } from "@/components/ui/credit-card-form";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchRegistration, payRegistration, type Registration, academyErrorMessage } from "../api";
import "@/features/onboarding/pages/pay-stage.css";

export function PayRegistrationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchRegistration(id)
      .then((row) => {
        setRegistration(row);
        setLoaded(true);
      })
      .catch(() => {
        setMissing(true);
        setLoaded(true);
      });
  }, [id]);

  const holder = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim().toUpperCase();

  if (!id || missing) {
    return <Navigate to="/app/academy/registrations" replace />;
  }
  if (!loaded) {
    return null;
  }
  if (registration && registration.status !== "PENDING_PAYMENT") {
    return <Navigate to="/app/academy/registrations" replace />;
  }

  async function onPay(card: { number: string }) {
    if (!registration) return;
    setError(null);
    setSubmitting(true);
    try {
      await payRegistration(registration.id, card.number);
      navigate("/app/academy/registrations", { replace: true });
    } catch (err) {
      setError(academyErrorMessage(err, "Paiement refusé."));
    } finally {
      setSubmitting(false);
    }
  }

  const amount = registration?.priceAmount ?? "";
  const currency = registration?.priceCurrency ?? "TND";
  const title = registration?.formationTitle ?? "Formation";
  const scheduledAt = registration?.scheduledAt;

  return (
    <section className="pay-shell" style={{ minHeight: "70vh", padding: "48px 20px 64px" }}>
      <main className="ob-pay pay-stage" style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="pay-orbs" aria-hidden="true">
          <span className="pay-orb pay-orb--lime" />
          <span className="pay-orb pay-orb--blue" />
          <span className="pay-orb pay-orb--soft" />
        </div>
        <motion.div
          className="ob-pay-head pay-head"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="pay-kicker">Paiement formation</p>
          <h1 className="ob-plans-title pay-title">Régler l'inscription</h1>
          <p className="ob-plans-lead pay-lead">Le montant est celui fixé par l'organisme. 4242… accepte, 4000…0002 refuse.</p>
          <motion.div className="pay-plan" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
            <span>{title}</span>
            <em>
              {amount} {currency}
              {scheduledAt
                ? ` · ${new Date(scheduledAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}`
                : ""}
            </em>
          </motion.div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.55 }}>
          <CreditCardForm
            defaultHolder={holder}
            defaultNumber="4242424242424242"
            maskMiddle
            disabled={submitting}
            submitLabel={submitting ? "Paiement…" : `Payer ${amount} ${currency}`}
            onSubmit={(state) => void onPay(state)}
          />
        </motion.div>
        {error ? <p className="auth-error text-center pay-error">{error}</p> : null}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Button variant="outline" to="/app/academy/registrations">
            Mes formations
          </Button>
        </div>
      </main>
    </section>
  );
}
