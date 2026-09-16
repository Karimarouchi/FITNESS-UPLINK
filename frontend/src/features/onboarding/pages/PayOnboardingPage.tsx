import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CreditCardForm } from "@/components/ui/credit-card-form";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/shared/api/client";
import { useAuth } from "@/features/auth/AuthContext";
import { destinationFor } from "@/features/auth/types";
import { billingError, checkout, fetchCatalog, planPrice, type BillingPlan } from "@/features/billing/api";
import { fetchMe } from "@/features/auth/api";
import { OnboardingBrand } from "../OnboardingFrame";
import { LocaleSwitch, useOnboardingLocale } from "../LocaleContext";
import "./pay-stage.css";

export function PayOnboardingPage({ account = false }: { account?: boolean }) {
  const { user, updateUser } = useAuth();
  const { t } = useOnboardingLocale();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [cgv, setCgv] = useState(false);
  const [plan, setPlan] = useState<BillingPlan | null>(null);
  const planId = sessionStorage.getItem("fu-plan-id") || user?.pendingPlan || user?.selectedPlan;
  const currency = sessionStorage.getItem("fu-currency") || "TND";
  const interval =
    sessionStorage.getItem("fu-plan-interval") ||
    (account ? user?.pendingPlanInterval : user?.selectedPlanInterval) ||
    "MONTHLY";
  const yearly = interval === "YEARLY";
  const holder = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim().toUpperCase();
  const price = plan ? planPrice(plan, currency, yearly) : null;

  useEffect(() => {
    fetchCatalog()
      .then((catalog) => setPlan(catalog.plans.find((row) => row.id === planId) ?? null))
      .catch(() => setPlan(null));
  }, [planId]);

  async function onPay(card: { number: string; holder: string; month: string; year: string; cvv: string }) {
    if (!planId) {
      setError("Choisissez d’abord une offre.");
      return;
    }
    if (!cgv) {
      setError("Acceptez les CGV pour continuer.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await checkout({
        planId,
        interval,
        currency,
        cardNumber: card.number,
        holder: card.holder,
        month: card.month,
        year: card.year,
        cvv: card.cvv,
        acceptCgv: true,
      });
      const next = await fetchMe();
      updateUser(next);
      navigate(account ? "/app/billing" : destinationFor(next), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? billingError(err.message) : t.paySaveError);
    } finally {
      setSubmitting(false);
    }
  }

  if (account && !planId) {
    return <Navigate to="/app/profile/plan" replace />;
  }

  const body = (
    <main className={account ? "ob-pay ob-pay--app pay-stage" : "ob-pay pay-stage"}>
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
        {account ? null : (
          <>
            <p className="pay-kicker">Étape finale · Essai 7 jours</p>
            <h1 className="ob-plans-title pay-title">{t.payTitle}</h1>
            <p className="ob-plans-lead pay-lead">
              La carte s’anime pendant que vous tapez. 4242… accepte, 4000…0002 refuse.
            </p>
          </>
        )}
        {plan ? (
          <motion.div
            className="pay-plan"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.45 }}
          >
            <span>{plan.familyLabel}</span>
            <strong>{plan.name}</strong>
            <em>
              {price ? `${price.amount} ${currency}` : "—"} {yearly ? "/ an" : "/ mois"}
            </em>
          </motion.div>
        ) : null}
      </motion.div>

      <motion.label
        className={`pay-cgv${cgv ? " is-on" : ""}`}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28, duration: 0.45 }}
      >
        <input type="checkbox" checked={cgv} onChange={(event) => setCgv(event.target.checked)} />
        <span className="pay-cgv-box" aria-hidden="true" />
        <span>
          <strong>J’accepte les CGV</strong>
          <em>Sans acceptation, le paiement reste bloqué.</em>
        </span>
      </motion.label>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <CreditCardForm
          defaultHolder={holder}
          maskMiddle
          disabled={submitting || !cgv}
          submitLabel={submitting ? t.paySaving : "Démarrer l’essai"}
          incompleteLabel={t.payIncomplete}
          onSubmit={(state) => void onPay(state)}
        />
      </motion.div>
      {error ? <p className="auth-error text-center pay-error">{error}</p> : null}
    </main>
  );

  if (account) {
    return (
      <section>
        <div className="page-head">
          <div>
            <h1>Paiement</h1>
            <p className="sub">Saisissez une carte de test pour activer l’essai.</p>
          </div>
          <Button variant="outline" to="/app/profile/plan">
            Changer d’offre
          </Button>
        </div>
        {body}
      </section>
    );
  }

  return (
    <div className="fu-public ob-shell ob-shell--wide pay-shell">
      <header className="ob-profile-nav">
        <button className="ob-nav-back" type="button" onClick={() => navigate("/onboarding/plans")}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-label-caps uppercase">{t.back}</span>
        </button>
        <OnboardingBrand />
        <div className="flex items-center gap-3">
          <LocaleSwitch />
          <div className="ob-step-label">{t.stepPayment}</div>
        </div>
      </header>
      {body}
    </div>
  );
}
