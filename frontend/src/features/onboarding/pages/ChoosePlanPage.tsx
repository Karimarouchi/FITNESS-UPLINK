import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ApiError } from "@/shared/api/client";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/features/auth/AuthContext";
import { fetchCatalog, planPrice, type BillingPlan } from "@/features/billing/api";
import { OnboardingBrand } from "../OnboardingFrame";
import { LocaleSwitch, useOnboardingLocale } from "../LocaleContext";
import { selectPlan } from "../api";
import "./pay-stage.css";
import "./plan-stage.css";

const ease = [0.22, 1, 0.36, 1] as const;

export function ChoosePlanPage({ account = false }: { account?: boolean }) {
  const { user, updateUser } = useAuth();
  const { t } = useOnboardingLocale();
  const navigate = useNavigate();
  const [yearly, setYearly] = useState(user?.selectedPlanInterval === "YEARLY");
  const [currency, setCurrency] = useState(sessionStorage.getItem("fu-currency") || "TND");
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [family, setFamily] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCatalog()
      .then((catalog) => {
        setPlans(catalog.plans);
        setFamily(catalog.familyLabel);
        if (!catalog.currencies.includes(currency)) {
          setCurrency(catalog.currencies[0] ?? "TND");
        }
      })
      .catch(() => setError("Impossible de charger les offres."));
  }, [currency]);

  async function onChoose(plan: BillingPlan) {
    setSelected(plan.id);
    setError(null);
    setSubmitting(true);
    const interval = yearly ? "YEARLY" : "MONTHLY";
    sessionStorage.setItem("fu-currency", currency);
    sessionStorage.setItem("fu-plan-id", plan.id);
    sessionStorage.setItem("fu-plan-interval", interval);
    try {
      const next = await selectPlan(plan.id, interval);
      updateUser(next);
      navigate(account ? "/app/profile/payment" : "/onboarding/payment", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.planSaveError);
      setSubmitting(false);
    }
  }

  const grid = (
    <main className={account ? "ob-plans ob-plans--app plan-stage" : "ob-plans plan-stage"}>
      <div className="pay-orbs" aria-hidden="true">
        <span className="pay-orb pay-orb--lime" />
        <span className="pay-orb pay-orb--blue" />
        <span className="pay-orb pay-orb--soft" />
      </div>
      <motion.div
        className="ob-plans-head"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease }}
      >
        {account ? null : (
          <>
            <p className="pay-kicker">Choisissez votre accès</p>
            <p className="plan-trial">7 jours d’essai · carte requise</p>
          </>
        )}
        <h1 className="ob-plans-title">{account ? "Changer d’offre" : t.planTitle}</h1>
        <p className="ob-plans-lead">
          {family ? `Catalogue ${family}. ` : null}
          Carte obligatoire pour lancer l’essai de 7 jours. Aucun accès sans carte.
        </p>
        <div className="ob-plans-tools">
          <label className={`ob-plans-switch${yearly ? " is-on" : ""}`}>
            <input type="checkbox" checked={yearly} onChange={(event) => setYearly(event.target.checked)} />
            <span className="ob-plans-switch-track" aria-hidden>
              <span className="ob-plans-switch-knob" />
            </span>
            <span>{t.planYearly}</span>
          </label>
          <select className="custom-input plan-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {["TND", "EUR", "USD"].map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </motion.div>
      {error ? <p className="auth-error text-center">{error}</p> : null}
      <motion.div
        className="ob-plan-grid"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.12, delayChildren: 0.18 } },
        }}
      >
        {plans.map((plan) => {
          const price = planPrice(plan, currency, yearly);
          return (
            <motion.article
              key={plan.id}
              className={`ob-plan-card${plan.featured ? " is-featured" : ""}${selected === plan.id ? " is-selected" : ""}`}
              variants={{
                hidden: { opacity: 0, y: 40, rotateX: 8, scale: 0.96 },
                show: { opacity: 1, y: 0, rotateX: 0, scale: 1 },
              }}
              transition={{ duration: 0.6, ease }}
              whileHover={{ y: -12, transition: { duration: 0.28 } }}
              style={{ transformPerspective: 900 }}
            >
              <span className="plan-shine" aria-hidden="true" />
              {plan.featured ? <span className="ob-plan-badge">{t.planRecommended}</span> : null}
              <h2>{plan.name}</h2>
              <p className="ob-plan-tag">{plan.tagline}</p>
              <p className="ob-plan-price">
                <AnimatePresence mode="wait">
                  <motion.strong
                    key={`${price?.amount ?? "none"}-${yearly}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.22 }}
                  >
                    {price ? price.amount : "—"}
                  </motion.strong>
                </AnimatePresence>
                <span>
                  {" "}
                  {currency}
                  {t.planPerMonth}
                </span>
              </p>
              {yearly && price ? (
                <p className="ob-plan-year">{t.planBilledYearly.replace("{amount}", String(price.amount))}</p>
              ) : (
                <p className="ob-plan-year">&nbsp;</p>
              )}
              <button
                type="button"
                className={plan.featured ? "ob-plan-cta ob-plan-cta--lime" : "ob-plan-cta"}
                disabled={submitting || !price}
                onClick={() => void onChoose(plan)}
              >
                {submitting && selected === plan.id ? t.planSaving : t.planCta}
              </button>
              <motion.ul
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.045, delayChildren: 0.12 } },
                }}
              >
                {plan.entitlements.map((item) => (
                  <motion.li
                    key={item.code}
                    className="is-ok"
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      show: { opacity: 1, x: 0 },
                    }}
                  >
                    <span className="material-symbols-outlined">check</span>
                    {item.label}
                    {item.limitValue != null ? ` (${item.limitValue})` : ""}
                  </motion.li>
                ))}
              </motion.ul>
            </motion.article>
          );
        })}
      </motion.div>
    </main>
  );

  if (account) {
    return (
      <section>
        <div className="page-head">
          <div>
            <h1>Changer d’offre</h1>
            <p className="sub">Les prix viennent du back-office. L’essai démarre après la carte.</p>
          </div>
          <Button variant="outline" to="/app/billing">
            Facturation
          </Button>
        </div>
        {grid}
      </section>
    );
  }

  return (
    <div className="fu-public ob-shell ob-shell--wide pay-shell">
      <header className="ob-profile-nav">
        <button className="ob-nav-back" type="button" onClick={() => navigate("/onboarding/profile")}>
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="font-label-caps uppercase">{t.back}</span>
        </button>
        <OnboardingBrand />
        <div className="flex items-center gap-3">
          <LocaleSwitch />
          <div className="ob-step-label">{t.stepPlan}</div>
        </div>
      </header>
      {grid}
    </div>
  );
}
