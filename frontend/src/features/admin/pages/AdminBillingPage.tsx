import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clapperboard,
  CreditCard,
  Gift,
  Info,
  Loader2,
  Percent,
  Plus,
  TriangleAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { DashSelect } from "@/components/admin/dash/DashSelect";
import { UsersModal } from "@/features/users/UsersModal";
import {
  fetchAdminEntitlements,
  fetchAdminPlans,
  fetchSubscribers,
  fetchTestCards,
  fetchVat,
  planPrice,
  renewNow,
  saveAdminPlan,
  saveTestCard,
  saveVat,
  type AdminSubscriber,
  type BillingPlan,
  type EntitlementDto,
  type PriceDto,
} from "@/features/billing/api";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";
import "@/shared/styles/backoffice-billing.css";

type IconType = ComponentType<{ size?: number }>;

const AUDIENCES = [
  {
    code: "TALENT",
    title: "Membres, coachs, candidats",
    lead: "Une seule grille d’offres pour les trois rôles talent.",
    roles: ["Candidat", "Membre", "Coach"],
    icon: Users,
    tone: "is-orange",
  },
  {
    code: "BUSINESS",
    title: "Employeurs et organisations",
    lead: "Salles, académies, fournisseurs et prestataires partagent ce catalogue.",
    roles: ["Employeur", "Salle", "Académie", "Fournisseur", "Prestataire"],
    icon: Building2,
    tone: "is-violet",
  },
  {
    code: "CREATORS",
    title: "Créateurs et événements",
    lead: "Catalogue des experts et des organisateurs.",
    roles: ["Créateur expert", "Organisateur"],
    icon: Clapperboard,
    tone: "is-green",
  },
] as const satisfies readonly { code: string; title: string; lead: string; roles: readonly string[]; icon: IconType; tone: string }[];

const ROLE_TONES = ["is-blue", "is-orange", "is-violet", "is-neutral", "is-ink"];

const CURRENCIES = [
  { value: "TND", label: "TND" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
];

const SUBSCRIBER_STATUS: Record<string, { label: string; tone: string }> = {
  TRIAL: { label: "Essai", tone: "is-info" },
  ACTIVE: { label: "Actif", tone: "is-success" },
  PAST_DUE: { label: "Impayé", tone: "is-warn" },
  CANCELLED: { label: "Résilié", tone: "is-neutral" },
  SUSPENDED: { label: "Suspendu", tone: "is-danger" },
  EXPIRED: { label: "Expiré", tone: "is-neutral" },
};

const CARD_OUTCOME: Record<string, { label: string; tone: string }> = {
  SUCCESS: { label: "Paiement accepté", tone: "is-success" },
};

type SaveState = "idle" | "saving" | "saved" | "error";

export function AdminBillingPage() {
  const [params, setParams] = useSearchParams();
  const family = params.get("family");
  const tools = params.get("view") === "tools";
  const audience = AUDIENCES.find((item) => item.code === family) ?? null;

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [catalog, setCatalog] = useState<EntitlementDto[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [subs, setSubs] = useState<AdminSubscriber[]>([]);
  const [cards, setCards] = useState<{ id: string; last4: string; outcome: string; label: string }[]>([]);
  const [vat, setVat] = useState<{ iso2: string; rate: number }[]>([]);
  const [pan, setPan] = useState("4242424242424242");
  const [currency, setCurrency] = useState("TND");
  const [yearly, setYearly] = useState(false);
  const [confirmRenew, setConfirmRenew] = useState(false);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    Promise.all([fetchAdminPlans(), fetchAdminEntitlements(), fetchSubscribers(), fetchTestCards(), fetchVat()])
      .then(([nextPlans, ents, people, testCards, taxes]) => {
        setPlans(nextPlans);
        setCatalog(ents.filter((row) => row.code !== "billing.unlock_all"));
        setSubs(people);
        setCards(testCards);
        setVat(taxes.map((row) => ({ iso2: row.iso2, rate: Number(row.rate) })));
      })
      .catch(() => setError("Impossible de charger le back-office billing."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 5000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const familyPlans = useMemo(
    () =>
      plans
        .filter((plan) => plan.family === audience?.code)
        .sort((left, right) => ["STARTER", "PRO", "BUSINESS"].indexOf(left.code) - ["STARTER", "PRO", "BUSINESS"].indexOf(right.code)),
    [plans, audience],
  );

  async function persist(
    plan: BillingPlan,
    patch: { entitlements?: BillingPlan["entitlements"]; prices?: PriceDto[]; trialDays?: number },
  ) {
    setSaveState("saving");
    try {
      const saved = await saveAdminPlan(plan.id, {
        prices: patch.prices ?? plan.prices,
        trialDays: patch.trialDays,
        entitlements: (patch.entitlements ?? plan.entitlements).map((row) => ({
          code: row.code,
          limitValue: row.limitValue,
        })),
      });
      setPlans((current) => current.map((row) => (row.id === saved.id ? saved : row)));
      setFlash(`Offre ${saved.name} enregistrée.`);
      setError(null);
      setSaveState("saved");
    } catch (failure) {
      setSaveState("error");
      throw failure;
    }
  }

  async function toggle(plan: BillingPlan, item: EntitlementDto) {
    const on = plan.entitlements.some((row) => row.code === item.code);
    const next = on
      ? plan.entitlements.filter((row) => row.code !== item.code)
      : [
          ...plan.entitlements,
          {
            code: item.code,
            label: item.label,
            hint: item.hint,
            limitKind: item.limitKind,
            limitValue: item.limitKind === "COUNT" ? 1 : item.limitValue,
          },
        ];
    try {
      await persist(plan, { entitlements: next });
    } catch {
      setError("Enregistrement impossible.");
    }
  }

  async function setLimit(plan: BillingPlan, code: string, raw: string) {
    const limitValue = raw.trim() === "" ? null : Number(raw);
    const current = plan.entitlements.find((row) => row.code === code)?.limitValue ?? null;
    if (limitValue === current) {
      return;
    }
    const next = plan.entitlements.map((row) => (row.code === code ? { ...row, limitValue } : row));
    try {
      await persist(plan, { entitlements: next });
    } catch {
      setError("Limite impossible à enregistrer.");
    }
  }

  async function setAmount(plan: BillingPlan, raw: string) {
    const amount = Number(raw);
    if (Number.isNaN(amount)) {
      return;
    }
    const interval = yearly ? "YEARLY" : "MONTHLY";
    const existing = plan.prices.find((row) => row.currency === currency && row.interval === interval);
    // a blur that changed nothing (or an untouched empty field) must not write a price
    if (existing ? existing.amount === amount : raw.trim() === "") {
      return;
    }
    const prices = existing
      ? plan.prices.map((row) => (row.currency === currency && row.interval === interval ? { ...row, amount } : row))
      : [...plan.prices, { currency, interval, amount }];
    try {
      await persist(plan, { prices });
    } catch {
      setError("Prix impossible à enregistrer.");
    }
  }

  async function setTrialDays(plan: BillingPlan, raw: string) {
    const trialDays = Number(raw);
    if (!Number.isFinite(trialDays) || trialDays < 0) {
      return;
    }
    if (Math.round(trialDays) === plan.trialDays) {
      return;
    }
    try {
      await persist(plan, { trialDays: Math.round(trialDays) });
    } catch {
      setError("Essai gratuit impossible à enregistrer.");
    }
  }

  async function addCard() {
    try {
      await saveTestCard({ pan, outcome: "SUCCESS", label: "Carte test", enabled: true });
      setCards(await fetchTestCards());
      setFlash("Carte test enregistrée.");
      setError(null);
    } catch {
      setError("Carte invalide.");
    }
  }

  function saveVatRate(iso2: string, rate: number) {
    saveVat(iso2, rate)
      .then(() => {
        setFlash(`TVA ${iso2} enregistrée.`);
        setError(null);
      })
      .catch(() => setError("Taux de TVA impossible à enregistrer."));
  }

  async function runRenewal() {
    setRenewing(true);
    try {
      await renewNow();
      setFlash("Prélèvements dus lancés.");
      setError(null);
    } catch {
      setError("Impossible de lancer les prélèvements.");
    } finally {
      setRenewing(false);
      setConfirmRenew(false);
    }
  }

  function openFamily(code: string) {
    setFlash(null);
    setSaveState("idle");
    setParams({ family: code });
  }

  const feedback = (
    <>
      {flash ? (
        <div className="bo-users-alert" role="status">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="Masquer le message">
            <X size={16} />
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );

  if (tools) {
    return (
      <section className="bo-dash bo-users bo-bm bo-bs">
        <header className="bo-dash-head">
          <div>
            <BackButton onClick={() => setParams({})} />
            <h1>Outils de paiement</h1>
            <p>Abonnés, cartes de test et TVA. Les prix se règlent dans chaque catalogue.</p>
          </div>
          <button type="button" className="bo-users-btn bs-renew" onClick={() => setConfirmRenew(true)}>
            Lancer les prélèvements dus
          </button>
        </header>
        {feedback}
        <ToolsPanel
          loading={loading}
          subs={subs}
          cards={cards}
          vat={vat}
          pan={pan}
          setPan={setPan}
          onAddCard={() => void addCard()}
          onVat={(iso2, rate) => setVat((current) => current.map((item) => (item.iso2 === iso2 ? { ...item, rate } : item)))}
          onSaveVat={saveVatRate}
        />
        {confirmRenew ? (
          <UsersModal
            title="Lancer les prélèvements dus ?"
            onClose={() => setConfirmRenew(false)}
            footer={
              <>
                <button type="button" className="um-btn" data-autofocus onClick={() => setConfirmRenew(false)}>
                  Annuler
                </button>
                <button type="button" className="um-btn is-primary" disabled={renewing} onClick={() => void runRenewal()}>
                  {renewing ? "Prélèvements en cours…" : "Lancer les prélèvements"}
                </button>
              </>
            }
          >
            <div className="um-warning">
              <span aria-hidden="true">
                <TriangleAlert size={20} />
              </span>
              <p>
                Cette action exécute immédiatement les prélèvements arrivés à échéance et la conversion des essais terminés. Elle agit sur les
                abonnements réels.
              </p>
            </div>
          </UsersModal>
        ) : null}
      </section>
    );
  }

  if (!audience) {
    return (
      <section className="bo-dash bo-users bo-bm bo-bs">
        <header className="bo-dash-head">
          <div>
            <h1>Offres par audience</h1>
            <p>Gérez les offres, prix et avantages par type d’audience sur Uplink Fitness.</p>
          </div>
        </header>
        {feedback}
        <div className="bs-hub">
          {AUDIENCES.map((item) => {
            const count = plans.filter((plan) => plan.family === item.code).length;
            const Icon: IconType = item.icon;
            return (
              <button key={item.code} className="bs-hub-card" type="button" onClick={() => openFamily(item.code)}>
                <span className={`bs-tile ${item.tone}`} aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span className="bs-hub-copy">
                  <strong>{item.title}</strong>
                  <em>{item.lead}</em>
                  <span className="bs-hub-roles">
                    {item.roles.map((role, index) => (
                      <span key={role} className={`bo-users-role ${ROLE_TONES[index % ROLE_TONES.length]}`}>
                        {role}
                      </span>
                    ))}
                  </span>
                </span>
                <span className="bs-hub-go">
                  <span className="bs-hub-count">
                    {loading ? <span className="bo-skeleton bs-count-skel" /> : <strong>{count}</strong>}
                    <small>offre{count > 1 ? "s" : ""}</small>
                  </span>
                  <span className="bs-hub-arrow" aria-hidden="true">
                    <ArrowRight size={16} />
                  </span>
                </span>
              </button>
            );
          })}
          <button className="bs-hub-card" type="button" onClick={() => setParams({ view: "tools" })}>
            <span className="bs-tile is-blue" aria-hidden="true">
              <CreditCard size={22} />
            </span>
            <span className="bs-hub-copy">
              <strong>Abonnés, cartes et TVA</strong>
              <em>Suivi des comptes, cartes de test et taux par pays.</em>
              <span className="bs-hub-roles">
                <span className="bo-users-role is-blue">Abonnés</span>
                <span className="bo-users-role is-orange">Cartes de test</span>
                <span className="bo-users-role is-violet">TVA</span>
              </span>
            </span>
            <span className="bs-hub-go">
              <span className="bs-hub-count">
                {loading ? <span className="bo-skeleton bs-count-skel" /> : <strong>{subs.length}</strong>}
                <small>abonné{subs.length > 1 ? "s" : ""}</small>
              </span>
              <span className="bs-hub-arrow" aria-hidden="true">
                <ArrowRight size={16} />
              </span>
            </span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bo-dash bo-users bo-bm bo-bs">
      <header className="bo-dash-head">
        <div>
          <BackButton onClick={() => setParams({})} />
          <h1>{audience.title}</h1>
          <p>{audience.roles.join(" · ")}. Cochez une fonction dans la colonne de l’offre qui doit l’avoir.</p>
        </div>
        <div className="bs-toolbar">
          <label className={`bs-switch${yearly ? " is-on" : ""}`}>
            <input type="checkbox" role="switch" checked={yearly} onChange={(event) => setYearly(event.target.checked)} />
            <span className="bs-switch-track" aria-hidden="true">
              <span className="bs-switch-knob" />
            </span>
            <span>Prix annuel</span>
          </label>
          <DashSelect label="Devise" value={currency} options={CURRENCIES} onChange={setCurrency} />
        </div>
      </header>

      <p className="bo-dash-note bs-note" role="note">
        <Info size={16} aria-hidden="true" />
        <span>Chaque modification est enregistrée immédiatement et s’applique à tous les abonnés de l’offre.</span>
        <SaveBadge state={saveState} />
      </p>
      {feedback}

      {familyPlans.length === 0 ? (
        <div className="bo-dash-card bs-matrix-card" aria-busy={loading}>
          {loading ? (
            <div className="bs-matrix-skel">
              <div className="bo-skeleton" />
              <div className="bo-skeleton" />
              <div className="bo-skeleton" />
            </div>
          ) : (
            <div className="bo-users-empty">
              <span>
                <UserRound size={22} aria-hidden="true" />
              </span>
              <strong>Aucune offre</strong>
              <p>Aucune offre n’est définie pour cette audience.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bo-dash-card bs-matrix-card">
          <div className="bs-matrix-wrap">
            <table className="bs-matrix">
              <caption className="bm-sr">
                Offres {audience.title} : fonctions incluses, prix et essai gratuit
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="bs-fn-head">
                    <span>Fonctionnalités</span>
                    <small>Livrées aujourd’hui</small>
                  </th>
                  {familyPlans.map((plan) => {
                    const price = planPrice(plan, currency, yearly);
                    return (
                      <th key={plan.id} scope="col" className={`bs-plan-head${plan.featured ? " is-featured" : ""}`}>
                        <span className="bs-plan-top">{plan.featured ? <span className="bs-plan-badge">Mise en avant</span> : null}</span>
                        <strong>{plan.name}</strong>
                        <em>{plan.tagline}</em>
                        <label className="bs-money">
                          <span className="bs-money-cur">{currency}</span>
                          <input
                            type="number"
                            aria-label={`Prix ${yearly ? "annuel" : "mensuel"} de l’offre ${plan.name} en ${currency}`}
                            key={`${plan.id}-${currency}-${yearly}`}
                            defaultValue={price?.amount ?? ""}
                            onBlur={(event) => void setAmount(plan, event.target.value)}
                          />
                          <span className="bs-money-per">{yearly ? "/ an" : "/ mois"}</span>
                        </label>
                        <label className="bs-trial">
                          <Gift size={15} aria-hidden="true" />
                          <span>Essai</span>
                          <input
                            type="number"
                            min={0}
                            aria-label={`Jours d’essai gratuit de l’offre ${plan.name}`}
                            key={`${plan.id}-trial`}
                            defaultValue={plan.trialDays}
                            onBlur={(event) => void setTrialDays(plan, event.target.value)}
                          />
                          <span>{plan.trialDays > 1 ? "jours" : "jour"}</span>
                        </label>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {catalog.map((item) => (
                  <tr key={item.code}>
                    <th scope="row" className="bs-fn">
                      <strong>{item.label}</strong>
                      {item.hint ? <em>{item.hint}</em> : null}
                    </th>
                    {familyPlans.map((plan) => {
                      const current = plan.entitlements.find((row) => row.code === item.code);
                      return (
                        <td key={plan.id} className={plan.featured ? "is-featured" : undefined}>
                          <label className="bs-cell">
                            <input
                              type="checkbox"
                              aria-label={`${item.label} — offre ${plan.name}`}
                              checked={Boolean(current)}
                              onChange={() => void toggle(plan, item)}
                            />
                            {current && item.limitKind === "COUNT" ? (
                              <input
                                type="number"
                                className="bs-limit"
                                aria-label={`Limite de ${item.label}, offre ${plan.name} (vide : illimité)`}
                                defaultValue={current.limitValue ?? ""}
                                placeholder="∞"
                                onBlur={(event) => void setLimit(plan, item.code, event.target.value)}
                                onClick={(event) => event.stopPropagation()}
                              />
                            ) : null}
                          </label>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="bs-back" onClick={onClick}>
      <ArrowLeft size={16} aria-hidden="true" />
      Catalogues
    </button>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  const timer = useRef<number | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    if (state === "idle") {
      setVisible(false);
      return;
    }
    setVisible(true);
    if (state === "saved") {
      timer.current = window.setTimeout(() => setVisible(false), 4000);
    }
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [state]);

  if (!visible) return null;
  return (
    <span className={`bs-save is-${state}`} role="status">
      {state === "saving" ? <Loader2 size={14} className="bs-spin" aria-hidden="true" /> : null}
      {state === "saving" ? "Enregistrement…" : state === "saved" ? "Enregistré" : "Échec de l’enregistrement"}
    </span>
  );
}

function formatDay(value: string | null) {
  return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
}

function CardHead({ icon, title, count, tone }: { icon: ReactNode; title: string; count?: number; tone: string }) {
  return (
    <div className="bs-card-head">
      <span className={`bo-dash-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
      {count !== undefined ? <span className="bs-card-count">{count}</span> : null}
    </div>
  );
}

function ToolsPanel({
  loading,
  subs,
  cards,
  vat,
  pan,
  setPan,
  onAddCard,
  onVat,
  onSaveVat,
}: {
  loading: boolean;
  subs: AdminSubscriber[];
  cards: { id: string; last4: string; outcome: string; label: string }[];
  vat: { iso2: string; rate: number }[];
  pan: string;
  setPan: (value: string) => void;
  onAddCard: () => void;
  onVat: (iso2: string, rate: number) => void;
  onSaveVat: (iso2: string, rate: number) => void;
}) {
  return (
    <>
      <div className="bo-dash-card bo-users-card">
        <CardHead icon={<Users size={22} />} title="Abonnés" count={subs.length} tone="is-blue" />
        {subs.length === 0 ? (
          <div className="bo-users-empty">
            <span>
              <Users size={22} aria-hidden="true" />
            </span>
            <strong>{loading ? "Chargement…" : "Aucun abonné"}</strong>
            <p>{loading ? "Récupération des abonnements." : "Aucun abonné pour le moment."}</p>
          </div>
        ) : (
          <div className="bm-table-wrap">
            <table className="bm-table">
              <caption className="bm-sr">Abonnés</caption>
              <thead>
                <tr>
                  <th scope="col">Compte</th>
                  <th scope="col">Offre</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Fin de période</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((row) => {
                  const status = SUBSCRIBER_STATUS[row.status] ?? { label: row.status, tone: "is-neutral" };
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="bo-users-person">
                          <div>
                            <strong>{row.displayName}</strong>
                            <small>{row.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="bo-users-role is-blue">{row.planName}</span>
                      </td>
                      <td>
                        <span className={`bo-users-status ${status.tone}`}>{status.label}</span>
                      </td>
                      <td className="is-date">{formatDay(row.currentPeriodEnd ?? row.trialEndsAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bo-dash-card bo-users-card">
        <CardHead icon={<CreditCard size={22} />} title="Cartes de test" count={cards.length} tone="" />
        <p className="bs-lead">Prestataire TEST uniquement. Le vrai PSP remplacera ces numéros plus tard.</p>
        {cards.length > 0 ? (
          <ul className="bs-cards">
            {cards.map((card) => {
              const outcome = CARD_OUTCOME[card.outcome] ?? { label: card.outcome, tone: "is-neutral" };
              return (
                <li key={card.id}>
                  <span className="bs-card-pan">•••• {card.last4}</span>
                  <span className="bs-card-label">{card.label}</span>
                  <span className={`bo-users-status ${outcome.tone}`}>{outcome.label}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="bs-add">
          <label htmlFor="test-pan">Ajouter une carte</label>
          <div className="bs-add-row">
            <input id="test-pan" className="bm-input" value={pan} onChange={(event) => setPan(event.target.value)} inputMode="numeric" />
            <button type="button" className="bm-btn" onClick={onAddCard}>
              <Plus size={16} aria-hidden="true" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      <div className="bo-dash-card bo-users-card">
        <CardHead icon={<Percent size={22} />} title="TVA par pays" count={vat.length} tone="is-rose" />
        <div className="bm-table-wrap">
          <table className="bm-table bs-vat">
            <caption className="bm-sr">TVA par pays</caption>
            <thead>
              <tr>
                <th scope="col">Pays</th>
                <th scope="col">Taux (%)</th>
              </tr>
            </thead>
            <tbody>
              {vat.map((row) => (
                <tr key={row.iso2}>
                  <td>
                    <strong className="bs-iso">{row.iso2}</strong>
                  </td>
                  <td>
                    <span className="bs-rate">
                      <input
                        type="number"
                        className="bm-input"
                        aria-label={`Taux de TVA ${row.iso2} en pourcentage`}
                        value={row.rate}
                        onBlur={(event) => onSaveVat(row.iso2, Number(event.target.value))}
                        onChange={(event) => onVat(row.iso2, Number(event.target.value))}
                      />
                      <span aria-hidden="true">%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
