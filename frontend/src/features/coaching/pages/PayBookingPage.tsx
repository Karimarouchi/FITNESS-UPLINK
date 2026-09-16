import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCardForm } from "@/components/ui/credit-card-form";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchBooking, payBooking, type Booking } from "../api";
import "@/features/onboarding/pages/pay-stage.css";

export function PayBookingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [missing, setMissing] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchBooking(id)
      .then((row) => {
        setBooking(row);
        setLoaded(true);
      })
      .catch(() => {
        setMissing(true);
        setLoaded(true);
      });
  }, [id]);

  const amount = booking?.priceAmount ?? "";
  const currency = booking?.priceCurrency ?? "TND";
  const serviceName = booking?.serviceName ?? "Séance";
  const coachName = booking?.coachDisplayName ?? "Coach";
  const scheduledAt = booking?.scheduledAt;
  const holder = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim().toUpperCase();

  if (!id) {
    return <Navigate to="/app/coaching/bookings" replace />;
  }
  if (missing) {
    return <Navigate to="/app/coaching/bookings" replace />;
  }
  if (!loaded) {
    return null;
  }
  if (booking && booking.status !== "AWAITING_PAYMENT") {
    return <Navigate to="/app/coaching/bookings" replace />;
  }

  async function onPay(card: { number: string }) {
    if (!booking) return;
    setError(null);
    setSubmitting(true);
    try {
      await payBooking(booking.id, card.number);
      navigate("/app/coaching/bookings", { replace: true });
    } catch (err) {
      const raw = err instanceof ApiError ? err.message : "Paiement refusé.";
      setError(raw === "PAYMENT_FAILED" ? "Carte refusée. Pour le test, utilisez 4242 4242 4242 4242." : raw);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="pay-shell" style={{ borderRadius: 24, minHeight: "70vh", padding: "28px 20px 48px" }}>
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
          <p className="pay-kicker">Paiement séance</p>
          <h1 className="ob-plans-title pay-title">Régler la séance</h1>
          <p className="ob-plans-lead pay-lead">Le montant est celui fixé par le coach. 4242… accepte, 4000…0002 refuse.</p>
          <motion.div className="pay-plan" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}>
            <span>{coachName}</span>
            <strong>{serviceName}</strong>
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
          <Button variant="outline" to="/app/coaching/bookings">
            Mes réservations
          </Button>
        </div>
      </main>
    </section>
  );
}
