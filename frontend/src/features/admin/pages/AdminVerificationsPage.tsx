import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Navigate } from "react-router-dom";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  CalendarCheck,
  Check,
  ChevronDown,
  ChevronsDownUp,
  ChevronsUpDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  Clapperboard,
  Clock3,
  Dumbbell,
  FileText,
  GraduationCap,
  Hourglass,
  IdCard,
  Loader2,
  Mail,
  RotateCcw,
  Search,
  ShieldCheck,
  Truck,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  fetchVerificationDossier,
  fetchVerifications,
  updateVerificationCheck,
  type VerificationAccount,
  type VerificationCheck,
  type VerificationDossier,
  type VerificationSection,
  type VerificationStatus,
} from "../api";
import { hasPermission } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { useAuth } from "@/features/auth/AuthContext";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { DocumentPreview } from "@/shared/components/DocumentPreview";
import { BoDrawer } from "@/components/ui/BoOverlay";
import { DashSelect } from "@/components/admin/dash/DashSelect";
import { shortDate } from "@/features/marketplace/format";

import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-verifications.css";

type IconType = ComponentType<{ size?: number }>;
type StatusFilter = "" | VerificationStatus;

const ROLE_META: Record<string, { icon: IconType; tone: string; order: number }> = {
  EMPLOYER: { icon: Briefcase, tone: "is-blue", order: 1 },
  SUPPLIER: { icon: Truck, tone: "is-amber", order: 2 },
  GYM: { icon: Dumbbell, tone: "is-green", order: 3 },
  ACADEMY: { icon: GraduationCap, tone: "is-violet", order: 4 },
  SERVICE_PROVIDER: { icon: Wrench, tone: "is-slate", order: 5 },
  EVENT_ORGANIZER: { icon: CalendarCheck, tone: "is-rose", order: 6 },
  EXPERT_CREATOR: { icon: Clapperboard, tone: "is-violet", order: 7 },
  CANDIDATE: { icon: IdCard, tone: "is-blue", order: 8 },
  COACH: { icon: UserRound, tone: "is-green", order: 9 },
};

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: "", label: "Tous" },
  { id: "pending", label: "En attente" },
  { id: "verified", label: "Vérifiés" },
  { id: "rejected", label: "Refusés" },
];

const STATUS_META: Record<VerificationStatus, { label: string; pill: string }> = {
  pending: { label: "En attente", pill: "is-warn" },
  verified: { label: "Vérifié", pill: "is-success" },
  rejected: { label: "Refusé", pill: "is-danger" },
};

type CheckState = "ok" | "no" | "wait" | "empty";

function checkState(check: Pick<VerificationCheck, "complete" | "reviewStatus">): CheckState {
  if (check.reviewStatus === "verified") return "ok";
  if (check.reviewStatus === "rejected") return "no";
  if (check.complete) return "wait";
  return "empty";
}

const CHECK_META: Record<CheckState, { label: string; icon: IconType }> = {
  ok: { label: "Validé", icon: CircleCheck },
  no: { label: "Refusé", icon: CircleX },
  wait: { label: "À valider", icon: Clock3 },
  empty: { label: "Non fourni", icon: CircleDashed },
};

function sectionLabel(section: VerificationSection) {
  const state = checkState(section);
  if (state === "empty" && section.required) return "Incomplet";
  return CHECK_META[state].label;
}

function progressOf(checks: VerificationCheck[]) {
  const total = checks.length;
  const done = checks.filter((check) => check.reviewStatus === "verified").length;
  const toReview = checks.filter((check) => checkState(check) === "wait").length;
  return { total, done, toReview, ratio: total ? done / total : 0 };
}

function groupKey(account: VerificationAccount) {
  return account.role?.code ?? (account.kind === "COMPANY" ? "BUSINESS" : "PROFESSIONAL");
}

function groupLabel(account: VerificationAccount) {
  return account.role?.label ?? (account.kind === "COMPANY" ? "Entreprise" : "Professionnel");
}

function splitFact(fact: string) {
  const index = fact.indexOf(" : ");
  if (index < 0) return { key: null, value: fact };
  return { key: fact.slice(0, index), value: fact.slice(index + 3) };
}

type RoleGroup = {
  key: string;
  label: string;
  kind: VerificationAccount["kind"];
  icon: IconType;
  tone: string;
  order: number;
  items: VerificationAccount[];
  pending: number;
  verified: number;
  rejected: number;
  toReview: number;
};

export function AdminVerificationsPage() {
  const { user } = useAuth();
  const allowed = hasPermission(user, PERMS.ADMIN_VERIFICATIONS);
  const [status, setStatus] = useState<StatusFilter>("");
  const [kind, setKind] = useState<"" | VerificationAccount["kind"]>("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<VerificationAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [dossier, setDossier] = useState<VerificationDossier | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [rejectKey, setRejectKey] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!allowed) return;
    fetchVerifications("all", "")
      .then((list) => {
        setItems(list);
        setError(null);
      })
      .catch(() => setError("Impossible de charger les comptes."))
      .finally(() => setLoading(false));
  }, [allowed]);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const counts = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((item) => item.verificationStatus === "pending").length,
      verified: items.filter((item) => item.verificationStatus === "verified").length,
      rejected: items.filter((item) => item.verificationStatus === "rejected").length,
      toReview: items.filter((item) => progressOf(item.checks).toReview > 0).length,
    }),
    [items],
  );

  const groups = useMemo<RoleGroup[]>(() => {
    const needle = query.trim().toLowerCase();
    const map = new Map<string, RoleGroup>();
    for (const item of items) {
      if (kind && item.kind !== kind) continue;
      if (status && item.verificationStatus !== status) continue;
      if (needle && ![item.displayName, item.email, item.role?.label ?? ""].join(" ").toLowerCase().includes(needle)) continue;
      const key = groupKey(item);
      let group = map.get(key);
      if (!group) {
        const meta = ROLE_META[key];
        group = {
          key,
          label: groupLabel(item),
          kind: item.kind,
          icon: meta?.icon ?? (item.kind === "COMPANY" ? Building2 : UserRound),
          tone: meta?.tone ?? "is-slate",
          order: meta?.order ?? 50,
          items: [],
          pending: 0,
          verified: 0,
          rejected: 0,
          toReview: 0,
        };
        map.set(key, group);
      }
      group.items.push(item);
      group[item.verificationStatus] += 1;
      if (progressOf(item.checks).toReview > 0) group.toReview += 1;
    }
    const rank = (account: VerificationAccount) =>
      account.verificationStatus === "pending" ? (progressOf(account.checks).toReview > 0 ? 0 : 1) : account.verificationStatus === "rejected" ? 2 : 3;
    return [...map.values()]
      .map((group) => ({
        ...group,
        items: group.items.sort((a, b) => rank(a) - rank(b) || a.displayName.localeCompare(b.displayName)),
      }))
      .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  }, [items, kind, status, query]);

  const searching = query.trim().length > 0;
  const anyPending = groups.some((group) => group.pending > 0);
  function isOpen(group: RoleGroup) {
    if (searching) return open[group.key] ?? true;
    return open[group.key] ?? (anyPending ? group.pending > 0 : group === groups[0]);
  }
  function setAll(next: boolean) {
    setOpen(Object.fromEntries(groups.map((group) => [group.key, next])));
  }
  const allOpen = groups.length > 0 && groups.every(isOpen);

  async function openDossier(id: string, trigger?: HTMLElement | null) {
    opener.current = trigger ?? (document.activeElement as HTMLElement | null);
    setLoadingId(id);
    try {
      setDossier(await fetchVerificationDossier(id));
      setRejectKey(null);
      setRejectReason("");
    } catch {
      setError("Impossible de charger le dossier.");
    } finally {
      setLoadingId(null);
    }
  }

  async function changeCheck(key: string, next: VerificationStatus, reason?: string) {
    if (!dossier) return;
    if (next === "rejected" && !reason?.trim()) {
      setRejectKey(key);
      return;
    }
    setBusyKey(key);
    try {
      const updated = await updateVerificationCheck(dossier.account.id, key, next, reason);
      setDossier(updated);
      setItems((current) => current.map((item) => (item.id === updated.account.id ? updated.account : item)));
      const label = updated.sections.find((item) => item.key === key)?.label ?? key;
      setFlash(
        next === "verified"
          ? `${label} validé pour ${updated.account.displayName}.`
          : next === "rejected"
            ? `${label} refusé pour ${updated.account.displayName}.`
            : `${label} remis en attente pour ${updated.account.displayName}.`,
      );
      setError(null);
      setRejectKey(null);
      setRejectReason("");
    } catch {
      setError("Impossible de mettre à jour ce contrôle. Le motif est obligatoire pour un refus.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!allowed) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const kpis: { id: StatusFilter; label: string; value: number; hint: string; icon: IconType; tone: string }[] = [
    { id: "", label: "Comptes suivis", value: counts.total, hint: `${groupsCount(items)} rôles · ${counts.toReview} avec des pièces à valider`, icon: Users, tone: "blue" },
    { id: "pending", label: "En attente", value: counts.pending, hint: "Badge non encore attribué", icon: Hourglass, tone: "orange" },
    { id: "verified", label: "Vérifiés", value: counts.verified, hint: "Badge visible sur le profil", icon: BadgeCheck, tone: "green" },
    { id: "rejected", label: "Refusés", value: counts.rejected, hint: "Corrections demandées", icon: CircleX, tone: "rose" },
  ];
  const kindOptions: { value: "" | VerificationAccount["kind"]; label: string }[] = [
    { value: "", label: "Tous les types" },
    { value: "COMPANY", label: "Entreprises" },
    { value: "PROFESSIONAL", label: "Professionnels" },
  ];
  const filtersActive = searching || status !== "" || kind !== "";

  return (
    <section className="bo-dash bo-users bo-vx">
      <header className="bo-dash-head">
        <div>
          <h1>Vérifications</h1>
          <p>Contrôlez les dossiers et validez les informations de chaque compte.</p>
        </div>
      </header>

      <div className="bo-dash-kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              type="button"
              className={`bo-dash-kpi vx-kpi${status === kpi.id ? " is-selected" : ""}`}
              aria-pressed={status === kpi.id}
              onClick={() => setStatus(kpi.id)}
            >
              <span className={`bo-dash-icon is-${kpi.tone}`}>
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="bo-dash-kpi-label">{kpi.label}</span>
              {loading ? (
                <span className="bo-skeleton bo-dash-kpi-skel" />
              ) : (
                <>
                  <span className="bo-dash-kpi-value">{kpi.value}</span>
                  <span className="bo-dash-kpi-meta">
                    <small>{kpi.hint}</small>
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      {flash && !dossier ? (
        <div className="bo-users-alert" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash(null)} aria-label="Masquer le message">
            <X size={16} />
          </button>
        </div>
      ) : null}
      {error && !dossier ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="bo-dash-card bo-users-card vx-toolbar-card">
        <div className="bo-users-toolbar">
          <div className="bo-users-tabs" role="tablist" aria-label="Filtrer les dossiers par statut">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id || "all"}
                type="button"
                role="tab"
                aria-selected={status === tab.id}
                className={status === tab.id ? "is-active" : ""}
                onClick={() => setStatus(tab.id)}
              >
                {tab.label}
                <span>{tab.id ? counts[tab.id] : counts.total}</span>
              </button>
            ))}
          </div>
          <label className="bo-users-search">
            <Search size={16} aria-hidden="true" />
            <input value={query} placeholder="Nom, e-mail ou rôle" aria-label="Rechercher un dossier" onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="bo-users-filters">
            <DashSelect label="Type" value={kind} options={kindOptions} onChange={setKind} align="left" />
            <button type="button" className="bo-users-btn" disabled={!groups.length} onClick={() => setAll(!allOpen)}>
              {allOpen ? <ChevronsDownUp size={16} aria-hidden="true" /> : <ChevronsUpDown size={16} aria-hidden="true" />}
              {allOpen ? "Tout replier" : "Tout déplier"}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="vx-groups" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <div key={index} className="bo-skeleton vx-group-skel" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bo-dash-card bo-users-card">
          <div className="bo-users-empty">
            <span>
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            <strong>Aucun dossier</strong>
            <p>{filtersActive ? "Aucun compte ne correspond à ces filtres." : "Aucun compte à vérifier pour le moment."}</p>
            {filtersActive ? (
              <button
                type="button"
                className="bo-users-btn"
                onClick={() => {
                  setQuery("");
                  setStatus("");
                  setKind("");
                }}
              >
                <RotateCcw size={15} aria-hidden="true" />
                Réinitialiser les filtres
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="vx-groups">
          {groups.map((group) => {
            const Icon = group.icon;
            const expanded = isOpen(group);
            const ratio = group.items.length ? group.verified / group.items.length : 0;
            const bodyId = `vx-group-${group.key}`;
            return (
              <section key={group.key} className={`vx-group${expanded ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="vx-group-head"
                  aria-expanded={expanded}
                  aria-controls={bodyId}
                  onClick={() => setOpen((current) => ({ ...current, [group.key]: !expanded }))}
                >
                  <span className={`vx-tile ${group.tone}`}>
                    <Icon size={20} />
                  </span>
                  <span className="vx-group-title">
                    <strong>{group.label}</strong>
                    <span>
                      {group.items.length} compte{group.items.length > 1 ? "s" : ""} · {group.kind === "COMPANY" ? "Entreprise" : "Professionnel"}
                    </span>
                  </span>
                  <span className="vx-group-stats">
                    {group.toReview ? <span className="vx-pill is-info">{group.toReview} à examiner</span> : null}
                    {group.pending ? <span className="vx-pill is-warn">{group.pending} en attente</span> : null}
                    {group.rejected ? <span className="vx-pill is-danger">{group.rejected} refusé{group.rejected > 1 ? "s" : ""}</span> : null}
                  </span>
                  <span className="vx-group-progress" title={`${group.verified} sur ${group.items.length} vérifiés`}>
                    <span className="vx-group-progress-label">
                      {group.verified}/{group.items.length} vérifiés
                    </span>
                    <span className="vx-bar" aria-hidden="true">
                      <span style={{ width: `${Math.round(ratio * 100)}%` }} />
                    </span>
                  </span>
                  <ChevronDown size={18} className="vx-chevron" aria-hidden="true" />
                </button>
                {expanded ? (
                  <div className="vx-group-body" id={bodyId}>
                    {group.items.map((item) => (
                      <AccountRow key={item.id} item={item} loading={loadingId === item.id} onOpen={(trigger) => void openDossier(item.id, trigger)} />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {dossier ? (
        <DossierDrawer
          dossier={dossier}
          busyKey={busyKey}
          rejectKey={rejectKey}
          rejectReason={rejectReason}
          error={error}
          flash={flash}
          onRejectReason={setRejectReason}
          onStartReject={(key) => {
            setRejectKey(key);
            setRejectReason("");
          }}
          onCancelReject={() => setRejectKey(null)}
          onChange={(key, next, reason) => void changeCheck(key, next, reason)}
          onClose={() => {
            setDossier(null);
            setError(null);
            window.setTimeout(() => opener.current?.focus(), 0);
          }}
        />
      ) : null}
    </section>
  );
}

function groupsCount(items: VerificationAccount[]) {
  return new Set(items.map(groupKey)).size;
}

function AccountRow({ item, loading, onOpen }: { item: VerificationAccount; loading: boolean; onOpen: (trigger: HTMLElement) => void }) {
  const progress = progressOf(item.checks);
  const meta = STATUS_META[item.verificationStatus];
  const needsAction = progress.toReview > 0;
  return (
    <div className="vx-row">
      <div className="vx-person">
        <ProfileAvatar uploadId={item.avatarUploadId} name={item.displayName} size={42} />
        <div className="vx-person-main">
          <div className="vx-person-title">
            <strong>{item.displayName}</strong>
            {item.verificationStatus === "verified" ? <BadgeCheck size={16} className="vx-verified" aria-label="Compte vérifié" /> : null}
            <span className={`bo-users-status ${meta.pill}`}>{meta.label}</span>
            {!item.onboardingCompleted ? <span className="vx-chip">Inscription incomplète</span> : null}
          </div>
          <div className="vx-person-sub">
            <span className="vx-mail">
              <Mail size={13} aria-hidden="true" />
              {item.email}
            </span>
            <i aria-hidden="true" />
            <span>Inscrit le {shortDate(item.createdAt)}</span>
          </div>
        </div>
      </div>
      <div className="vx-checks">
        {item.checks.map((check) => {
          const state = checkState(check);
          const Icon = CHECK_META[state].icon;
          return (
            <span key={check.key} className={`vx-check is-${state}`} title={`${check.label} : ${CHECK_META[state].label}`}>
              <Icon size={13} aria-hidden="true" />
              {check.label}
            </span>
          );
        })}
      </div>
      <div className="vx-row-side">
        <div className="vx-row-progress">
          <span>
            <strong>{progress.done}</strong>/{progress.total} contrôles
          </span>
          <span className="vx-bar" aria-hidden="true">
            <span style={{ width: `${Math.round(progress.ratio * 100)}%` }} />
          </span>
        </div>
        <button type="button" className={`vx-open${needsAction ? " is-primary" : ""}`} disabled={loading} onClick={(event) => onOpen(event.currentTarget)}>
          {loading ? <Loader2 size={15} className="vx-spin" aria-hidden="true" /> : <FileText size={15} aria-hidden="true" />}
          {needsAction ? "Examiner" : "Voir le dossier"}
        </button>
      </div>
    </div>
  );
}

type DossierDrawerProps = {
  dossier: VerificationDossier;
  busyKey: string | null;
  rejectKey: string | null;
  rejectReason: string;
  error: string | null;
  flash: string | null;
  onRejectReason: (value: string) => void;
  onStartReject: (key: string) => void;
  onCancelReject: () => void;
  onChange: (key: string, next: VerificationStatus, reason?: string) => void;
  onClose: () => void;
};

function DossierDrawer({
  dossier,
  busyKey,
  rejectKey,
  rejectReason,
  error,
  flash,
  onRejectReason,
  onStartReject,
  onCancelReject,
  onChange,
  onClose,
}: DossierDrawerProps) {
  const account = dossier.account;
  const meta = STATUS_META[account.verificationStatus];
  const progress = progressOf(account.checks);
  const roleLabel = account.role?.label ?? (account.kind === "COMPANY" ? "Entreprise" : "Professionnel");
  return (
    <BoDrawer
      premium
      title="Dossier de vérification"
      onClose={onClose}
      width={720}
      headerContent={
        <div className="vx-drawer-head">
          <ProfileAvatar uploadId={account.avatarUploadId} name={account.displayName} size={52} />
          <div className="vx-drawer-id">
            <span className="vx-eyebrow">Dossier de vérification</span>
            <div className="vx-person-title">
              <h2>{account.displayName}</h2>
              {account.verificationStatus === "verified" ? <BadgeCheck size={18} className="vx-verified" aria-label="Compte vérifié" /> : null}
              <span className={`bo-users-status ${meta.pill}`}>{meta.label}</span>
            </div>
            <div className="vx-person-sub">
              <span>{roleLabel}</span>
              <i aria-hidden="true" />
              <span className="vx-mail">
                <Mail size={13} aria-hidden="true" />
                {account.email}
              </span>
              {account.country ? (
                <>
                  <i aria-hidden="true" />
                  <span>{account.country.name}</span>
                </>
              ) : null}
              <i aria-hidden="true" />
              <span>Inscrit le {shortDate(account.createdAt)}</span>
            </div>
            <div className="vx-drawer-progress">
              <span>
                <strong>{progress.done}</strong>/{progress.total} contrôles validés
              </span>
              <span className="vx-steps" aria-hidden="true">
                {account.checks.map((check) => (
                  <i key={check.key} className={`is-${checkState(check)}`} title={`${check.label} : ${CHECK_META[checkState(check)].label}`} />
                ))}
              </span>
            </div>
          </div>
        </div>
      }
    >
      {flash ? (
        <p className="vx-note is-ok" role="status">
          <CircleCheck size={16} aria-hidden="true" />
          <span>{flash}</span>
        </p>
      ) : null}
      {error ? (
        <p className="vx-note is-error" role="alert">
          <CircleX size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}

      <p className="vx-note">
        <ShieldCheck size={16} aria-hidden="true" />
        <span>
          {account.kind === "PROFESSIONAL"
            ? "Validez l’identité seulement si photo, téléphone et ville sont fournis, puis le CV, les diplômes et les certifications s’ils sont présents."
            : "Validez séparément l’existence de l’entreprise, les documents légaux et le représentant légal."}
        </span>
      </p>

      <div className="vx-sections">
        {dossier.sections.map((section) => {
          const state = checkState(section);
          const StateIcon = CHECK_META[state].icon;
          const busy = busyKey === section.key;
          const rejecting = rejectKey === section.key;
          const facts = section.facts.map(splitFact);
          return (
            <section key={section.key} className={`vx-section is-${state}`}>
              <header className="vx-section-head">
                <span className={`vx-section-icon is-${state}`}>
                  <StateIcon size={18} aria-hidden="true" />
                </span>
                <div className="vx-section-title">
                  <strong>
                    {section.label}
                    {section.required ? <em>Obligatoire</em> : null}
                  </strong>
                  {section.hint ? <span>{section.hint}</span> : null}
                </div>
                <span className={`vx-check is-${state}`}>{sectionLabel(section)}</span>
              </header>

              <div className="vx-section-body">
                {facts.length ? (
                  <dl className="vx-facts">
                    {facts.map((fact, index) =>
                      fact.key ? (
                        <div key={index} className={/^non fourni/i.test(fact.value) ? "is-missing" : undefined}>
                          <dt>{fact.key}</dt>
                          <dd>{fact.value}</dd>
                        </div>
                      ) : (
                        <div key={index} className="is-wide">
                          <dd>{fact.value}</dd>
                        </div>
                      ),
                    )}
                  </dl>
                ) : !section.people.length && !section.files.length ? (
                  <p className="vx-missing">Aucun élément renseigné dans cette section.</p>
                ) : null}

                {section.people.length ? (
                  <div className="vx-people">
                    {section.people.map((person, index) => (
                      <div key={`${person.name}-${index}`} className="vx-rep">
                        <span className="vx-rep-avatar">
                          <UserRound size={16} aria-hidden="true" />
                        </span>
                        <div>
                          <strong>{person.name}</strong>
                          {person.title ? <span>{person.title}</span> : null}
                          <div className="vx-rep-meta">
                            {person.idNumber ? <span>Pièce d’identité : {person.idNumber}</span> : null}
                            {person.email ? <span>{person.email}</span> : null}
                            {person.phone ? <span>{person.phone}</span> : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {section.files.length ? (
                  <div className="vx-files">
                    {section.files.map((file) => (
                      <DocumentPreview key={file.id} file={file} />
                    ))}
                  </div>
                ) : null}

                {section.reviewStatus === "rejected" && section.rejectionReason ? (
                  <p className="vx-note is-error">
                    <CircleX size={16} aria-hidden="true" />
                    <span>
                      <strong>Motif du refus :</strong> {section.rejectionReason}
                    </span>
                  </p>
                ) : null}

                {rejecting ? (
                  <label className="vx-reject">
                    <span>Motif du refus (obligatoire)</span>
                    <textarea
                      rows={3}
                      maxLength={500}
                      autoFocus
                      value={rejectReason}
                      placeholder="Expliquez ce qui doit être corrigé…"
                      onChange={(event) => onRejectReason(event.target.value)}
                    />
                    <small>Le motif sera envoyé au compte par notification et par e-mail.</small>
                  </label>
                ) : null}
              </div>

              <footer className="vx-section-actions">
                {rejecting ? (
                  <>
                    <button type="button" className="um-btn vx-sm" onClick={onCancelReject}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="um-btn is-danger vx-sm"
                      disabled={busy || !rejectReason.trim()}
                      onClick={() => onChange(section.key, "rejected", rejectReason)}
                    >
                      {busy ? <Loader2 size={15} className="vx-spin" aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                      Confirmer le refus
                    </button>
                  </>
                ) : (
                  <>
                    {section.reviewStatus !== "pending" ? (
                      <button type="button" className="um-btn vx-sm" disabled={busy} onClick={() => onChange(section.key, "pending")}>
                        <RotateCcw size={14} aria-hidden="true" />
                        Remettre en attente
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="um-btn is-soft-danger vx-sm"
                      disabled={section.reviewStatus === "rejected" || busy}
                      onClick={() => onStartReject(section.key)}
                    >
                      <X size={15} aria-hidden="true" />
                      Refuser
                    </button>
                    <button
                      type="button"
                      className="um-btn is-primary vx-sm"
                      disabled={!section.complete || section.reviewStatus === "verified" || busy}
                      title={section.complete ? "Valide ce contrôle et notifie le compte" : "Contrôle incomplet : validation impossible"}
                      onClick={() => onChange(section.key, "verified")}
                    >
                      {busy ? <Loader2 size={15} className="vx-spin" aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}
                      Valider
                    </button>
                  </>
                )}
              </footer>
            </section>
          );
        })}
      </div>
    </BoDrawer>
  );
}
