import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
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

const AUDIENCES = [
  {
    code: "TALENT",
    title: "Membres, coachs, candidats",
    lead: "Une seule grille d’offres pour les trois rôles talent.",
    roles: ["Candidat", "Membre", "Coach"],
    icon: "badge",
  },
  {
    code: "BUSINESS",
    title: "Employeurs et organisations",
    lead: "Salles, académies, fournisseurs et prestataires partagent ce catalogue.",
    roles: ["Employeur", "Salle", "Académie", "Fournisseur", "Prestataire"],
    icon: "apartment",
  },
  {
    code: "CREATORS",
    title: "Créateurs et événements",
    lead: "Catalogue des experts et des organisateurs.",
    roles: ["Créateur expert", "Organisateur"],
    icon: "movie",
  },
] as const;

export function AdminBillingPage() {
  const [params, setParams] = useSearchParams();
  const family = params.get("family");
  const tools = params.get("view") === "tools";
  const audience = AUDIENCES.find((item) => item.code === family) ?? null;

  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [catalog, setCatalog] = useState<EntitlementDto[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [subs, setSubs] = useState<AdminSubscriber[]>([]);
  const [cards, setCards] = useState<{ id: string; last4: string; outcome: string; label: string }[]>([]);
  const [vat, setVat] = useState<{ iso2: string; rate: number }[]>([]);
  const [pan, setPan] = useState("4242424242424242");
  const [currency, setCurrency] = useState("TND");
  const [yearly, setYearly] = useState(false);

  useEffect(() => {
    Promise.all([fetchAdminPlans(), fetchAdminEntitlements(), fetchSubscribers(), fetchTestCards(), fetchVat()])
      .then(([nextPlans, ents, people, testCards, taxes]) => {
        setPlans(nextPlans);
        setCatalog(ents.filter((row) => row.code !== "billing.unlock_all"));
        setSubs(people);
        setCards(testCards);
        setVat(taxes.map((row) => ({ iso2: row.iso2, rate: Number(row.rate) })));
      })
      .catch(() => setError("Impossible de charger le back-office billing."));
  }, []);

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
    const saved = await saveAdminPlan(plan.id, {
      prices: patch.prices ?? plan.prices,
      trialDays: patch.trialDays,
      entitlements: (patch.entitlements ?? plan.entitlements).map((row) => ({
        code: row.code,
        limitValue: row.limitValue,
      })),
    });
    setPlans((current) => current.map((row) => (row.id === saved.id ? saved : row)));
    setFlash("Enregistré.");
    setError(null);
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

  function openFamily(code: string) {
    setFlash(null);
    setParams({ family: code });
  }

  if (tools) {
    return (
      <section className="hire-page bill-page" dir="ltr">
        <div className="page-head">
          <div>
            <button className="bill-back" type="button" onClick={() => setParams({})}>
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_back
              </span>
              Catalogues
            </button>
            <h1>Outils de paiement</h1>
            <p className="sub">Abonnés, cartes de test et TVA. Les prix se règlent dans chaque catalogue.</p>
          </div>
          <Button variant="outline" type="button" onClick={() => void renewNow()}>
            Lancer les prélèvements dus
          </Button>
        </div>
        {flash ? <p className="fu-flash">{flash}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}
        <ToolsPanel
          subs={subs}
          cards={cards}
          vat={vat}
          pan={pan}
          setPan={setPan}
          onAddCard={() => void addCard()}
          onVat={(iso2, rate) => setVat((current) => current.map((item) => (item.iso2 === iso2 ? { ...item, rate } : item)))}
          onSaveVat={(iso2, rate) => void saveVat(iso2, rate)}
        />
      </section>
    );
  }

  if (!audience) {
    return (
      <section className="hire-page bill-page" dir="ltr">
        <div className="page-head">
          <div>
            <p className="font-label-caps uppercase text-on-surface-variant">Facturation</p>
            <h1>Offres par audience</h1>
            <p className="sub">Choisissez qui paie. Vous entrez ensuite dans Starter, Pro et Business pour cocher les fonctions.</p>
          </div>
        </div>
        {error ? <p className="auth-error">{error}</p> : null}
        <div className="bill-hub">
          {AUDIENCES.map((item) => {
            const count = plans.filter((plan) => plan.family === item.code).length;
            return (
              <button key={item.code} className="bill-hub-card" type="button" onClick={() => openFamily(item.code)}>
                <span className="bill-hub-mark" aria-hidden="true">
                  <span className="material-symbols-outlined">{item.icon}</span>
                </span>
                <span className="bill-hub-copy">
                  <strong>{item.title}</strong>
                  <em>{item.lead}</em>
                  <span className="bill-hub-roles">
                    {item.roles.map((role) => (
                      <span key={role}>{role}</span>
                    ))}
                  </span>
                </span>
                <span className="bill-hub-go">
                  {count} offres
                  <span className="material-symbols-outlined" aria-hidden="true">
                    arrow_forward
                  </span>
                </span>
              </button>
            );
          })}
          <button className="bill-hub-card bill-hub-card--tools" type="button" onClick={() => setParams({ view: "tools" })}>
            <span className="bill-hub-mark" aria-hidden="true">
              <span className="material-symbols-outlined">payments</span>
            </span>
            <span className="bill-hub-copy">
              <strong>Abonnés, cartes et TVA</strong>
              <em>Suivi des comptes, cartes de test et taux par pays.</em>
            </span>
            <span className="bill-hub-go">
              Ouvrir
              <span className="material-symbols-outlined" aria-hidden="true">
                arrow_forward
              </span>
            </span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="hire-page bill-page" dir="ltr">
      <div className="page-head">
        <div>
          <button className="bill-back" type="button" onClick={() => setParams({})}>
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_back
            </span>
            Catalogues
          </button>
          <h1>{audience.title}</h1>
          <p className="sub">
            {audience.roles.join(" · ")}. Cochez une fonction dans la colonne de l’offre qui doit l’avoir.
          </p>
        </div>
        <div className="bill-toolbar">
          <label className={`bill-switch${yearly ? " is-on" : ""}`}>
            <input type="checkbox" checked={yearly} onChange={(event) => setYearly(event.target.checked)} />
            <span className="bill-switch-track" aria-hidden>
              <span className="bill-switch-knob" />
            </span>
            <span>Prix annuel</span>
          </label>
          <select className="custom-input" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            <option>TND</option>
            <option>EUR</option>
            <option>USD</option>
          </select>
        </div>
      </div>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      {familyPlans.length === 0 ? (
        <p className="empty-hint">Chargement des offres…</p>
      ) : (
      <div className="bill-matrix">
        <div className="bill-matrix-head">
          <div className="bill-fn-col">
            <span className="bill-fn-kicker">Fonctions</span>
            <strong>Livrées aujourd’hui</strong>
          </div>
          {familyPlans.map((plan) => {
            const price = planPrice(plan, currency, yearly);
            return (
              <div key={plan.id} className={`bill-plan-col${plan.featured ? " is-featured" : ""}`}>
                {plan.featured ? <span className="bill-plan-badge">Mise en avant</span> : null}
                <strong>{plan.name}</strong>
                <em>{plan.tagline}</em>
                <label className="bill-price">
                  <span className="bill-price-curr">{currency}</span>
                  <input
                    type="number"
                    key={`${plan.id}-${currency}-${yearly}`}
                    defaultValue={price?.amount ?? ""}
                    onBlur={(event) => void setAmount(plan, event.target.value)}
                  />
                  <span>{yearly ? "/ an" : "/ mois"}</span>
                </label>
                <label className="bill-price">
                  <span className="bill-price-curr">Essai</span>
                  <input
                    type="number"
                    min={0}
                    key={`${plan.id}-trial`}
                    defaultValue={plan.trialDays}
                    onBlur={(event) => void setTrialDays(plan, event.target.value)}
                  />
                  <span>{plan.trialDays > 1 ? "jours" : "jour"}</span>
                </label>
              </div>
            );
          })}
        </div>
        {catalog.map((item) => (
          <div key={item.code} className="bill-matrix-row">
            <div className="bill-fn-col">
              <strong>{item.label}</strong>
              <em>{item.hint}</em>
            </div>
            {familyPlans.map((plan) => {
              const current = plan.entitlements.find((row) => row.code === item.code);
              return (
                <label key={plan.id} className={`bill-cell${plan.featured ? " is-featured" : ""}`}>
                  <input type="checkbox" checked={Boolean(current)} onChange={() => void toggle(plan, item)} />
                  <span className="bill-tick" aria-hidden="true" />
                  {current && item.limitKind === "COUNT" ? (
                    <input
                      type="number"
                      className="bill-limit"
                      defaultValue={current.limitValue ?? ""}
                      placeholder="∞"
                      onBlur={(event) => void setLimit(plan, item.code, event.target.value)}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : null}
                </label>
              );
            })}
          </div>
        ))}
      </div>
      )}
    </section>
  );
}

function ToolsPanel({
  subs,
  cards,
  vat,
  pan,
  setPan,
  onAddCard,
  onVat,
  onSaveVat,
}: {
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
      <Panel title="Abonnés">
        {subs.length === 0 ? (
          <p className="empty-hint">Aucun abonné pour le moment.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Compte</th>
                <th>Offre</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.displayName}</strong>
                    <span> {row.email}</span>
                  </td>
                  <td>{row.planName}</td>
                  <td>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
      <Panel title="Cartes de test" body>
        <p className="settings-mail-lead">Prestataire TEST uniquement. Le vrai PSP remplacera ces numéros plus tard.</p>
        <ul>
          {cards.map((card) => (
            <li key={card.id}>
              •••• {card.last4} · {card.outcome} · {card.label}
            </li>
          ))}
        </ul>
        <div className="mail-fields">
          <div className="field field--full">
            <label htmlFor="test-pan">Ajouter une carte</label>
            <input id="test-pan" value={pan} onChange={(event) => setPan(event.target.value)} />
          </div>
        </div>
        <Button variant="primary" type="button" onClick={onAddCard}>
          Enregistrer
        </Button>
      </Panel>
      <Panel title="TVA par pays">
        <table>
          <thead>
            <tr>
              <th>Pays</th>
              <th>Taux %</th>
            </tr>
          </thead>
          <tbody>
            {vat.map((row) => (
              <tr key={row.iso2}>
                <td>{row.iso2}</td>
                <td>
                  <input
                    type="number"
                    className="custom-input"
                    value={row.rate}
                    onBlur={(event) => onSaveVat(row.iso2, Number(event.target.value))}
                    onChange={(event) => onVat(row.iso2, Number(event.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
