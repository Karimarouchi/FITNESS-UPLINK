import { useEffect, useMemo, useState, type ComponentType } from "react";
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
import { shortDate } from "@/features/marketplace/format";

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

  async function openDossier(id: string) {
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
    { id: "", label: "Comptes suivis", value: counts.total, hint: `${groupsCount(items)} rôles · ${counts.toReview} avec des pièces à valider`, icon: Users, tone: "" },
    { id: "pending", label: "En attente", value: counts.pending, hint: "Badge non encore attribué", icon: Hourglass, tone: "is-amber" },
    { id: "verified", label: "Vérifiés", value: counts.verified, hint: "Badge visible sur le profil", icon: BadgeCheck, tone: "is-green" },
    { id: "rejected", label: "Refusés", value: counts.rejected, hint: "Corrections demandées", icon: CircleX, tone: "is-rose" },
  ];

  return (
    <div className="bo-page">
      <div className="bo-head">
        <div>
          <h1>Vérifications</h1>
          <p>Contrôlez les dossiers par type de compte. Le badge « Vérifié » n’apparaît que lorsque chaque contrôle est validé.</p>
        </div>
      </div>

      <div className="bo-kpis">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              type="button"
              className={`bo-kpi vf-kpi${status === kpi.id ? " is-selected" : ""}`}
              onClick={() => setStatus(kpi.id)}
            >
              <div className="bo-kpi-top">
                <span className="bo-kpi-label">{kpi.label}</span>
                <span className={`bo-kpi-icon ${kpi.tone}`}>
                  <Icon size={18} />
                </span>
              </div>
              <span className="bo-kpi-value">{loading ? "–" : kpi.value}</span>
              <span className="bo-kpi-hint">{kpi.hint}</span>
            </button>
          );
        })}
      </div>

      <div className="bo-card vf-toolbar-card">
        <div className="bo-toolbar">
          <div className="bo-seg">
            {STATUS_TABS.map((tab) => (
              <button key={tab.id || "all"} type="button" className={status === tab.id ? "is-active" : ""} onClick={() => setStatus(tab.id)}>
                {tab.label}
                <span className="bo-seg-count">{tab.id ? counts[tab.id] : counts.total}</span>
              </button>
            ))}
          </div>
          <select className="bo-select vf-kind" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>
            <option value="">Tous les types</option>
            <option value="COMPANY">Entreprises</option>
            <option value="PROFESSIONAL">Professionnels</option>
          </select>
          <div className="bo-toolbar-search">
            <Search size={16} />
            <input className="bo-input" value={query} placeholder="Nom, e-mail ou rôle" onChange={(event) => setQuery(event.target.value)} />
          </div>
          <div className="bo-toolbar-spacer" />
          <button type="button" className="bo-btn bo-btn--ghost bo-btn--sm" disabled={!groups.length} onClick={() => setAll(!allOpen)}>
            {allOpen ? <ChevronsDownUp size={15} /> : <ChevronsUpDown size={15} />}
            {allOpen ? "Tout replier" : "Tout déplier"}
          </button>
        </div>
      </div>

      {flash ? (
        <div className="bo-alert vf-flash">
          <Check size={16} />
          <span>{flash}</span>
        </div>
      ) : null}
      {error ? <p className="bo-error">{error}</p> : null}

      {loading ? (
        <div className="vf-groups">
          {[0, 1, 2].map((index) => (
            <div key={index} className="bo-skeleton" style={{ height: 76, borderRadius: 14 }} />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bo-card">
          <div className="bo-empty">
            <span className="bo-empty-icon">
              <ShieldCheck size={24} />
            </span>
            <span className="bo-empty-title">Aucun dossier</span>
            <p>{searching || status || kind ? "Aucun compte ne correspond à ces filtres." : "Aucun compte à vérifier pour le moment."}</p>
          </div>
        </div>
      ) : (
        <div className="vf-groups">
          {groups.map((group) => {
            const Icon = group.icon;
            const expanded = isOpen(group);
            const ratio = group.items.length ? group.verified / group.items.length : 0;
            return (
              <section key={group.key} className={`vf-group${expanded ? " is-open" : ""}`}>
                <button
                  type="button"
                  className="vf-group-head"
                  aria-expanded={expanded}
                  onClick={() => setOpen((current) => ({ ...current, [group.key]: !expanded }))}
                >
                  <span className={`vf-group-icon ${group.tone}`}>
                    <Icon size={20} />
                  </span>
                  <span className="vf-group-title">
                    <strong>{group.label}</strong>
                    <span>
                      {group.items.length} compte{group.items.length > 1 ? "s" : ""} · {group.kind === "COMPANY" ? "Entreprise" : "Professionnel"}
                    </span>
                  </span>
                  <span className="vf-group-stats">
                    {group.toReview ? <span className="bo-pill is-info">{group.toReview} à examiner</span> : null}
                    {group.pending ? <span className="bo-pill is-warn">{group.pending} en attente</span> : null}
                    {group.rejected ? <span className="bo-pill is-danger">{group.rejected} refusé{group.rejected > 1 ? "s" : ""}</span> : null}
                  </span>
                  <span className="vf-group-progress" title={`${group.verified} sur ${group.items.length} vérifiés`}>
                    <span className="vf-group-progress-label">
                      {group.verified}/{group.items.length} vérifiés
                    </span>
                    <span className="bo-bar">
                      <span style={{ width: `${Math.round(ratio * 100)}%`, background: "var(--bo-success)" }} />
                    </span>
                  </span>
                  <ChevronDown size={18} className="vf-group-chevron" />
                </button>
                {expanded ? (
                  <div className="vf-group-body">
                    {group.items.map((item) => (
                      <AccountRow key={item.id} item={item} loading={loadingId === item.id} onOpen={() => void openDossier(item.id)} />
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
          onRejectReason={setRejectReason}
          onStartReject={(key) => {
            setRejectKey(key);
            setRejectReason("");
          }}
          onCancelReject={() => setRejectKey(null)}
          onChange={(key, next, reason) => void changeCheck(key, next, reason)}
          onClose={() => setDossier(null)}
        />
      ) : null}
    </div>
  );
}

function groupsCount(items: VerificationAccount[]) {
  return new Set(items.map(groupKey)).size;
}

function AccountRow({ item, loading, onOpen }: { item: VerificationAccount; loading: boolean; onOpen: () => void }) {
  const progress = progressOf(item.checks);
  const meta = STATUS_META[item.verificationStatus];
  const needsAction = progress.toReview > 0;
  return (
    <div className="vf-row">
      <ProfileAvatar uploadId={item.avatarUploadId} name={item.displayName} size={42} />
      <div className="vf-row-main">
        <div className="vf-row-title">
          <strong>{item.displayName}</strong>
          {item.verificationStatus === "verified" ? <BadgeCheck size={16} className="vf-verified-icon" /> : null}
          <span className={`bo-pill ${meta.pill}`}>{meta.label}</span>
          {!item.onboardingCompleted ? <span className="bo-pill no-dot">Inscription incomplète</span> : null}
        </div>
        <div className="vf-row-sub">
          <Mail size={13} />
          <span>{item.email}</span>
          <span className="vf-dot" />
          <span>Inscrit le {shortDate(item.createdAt)}</span>
        </div>
        <div className="vf-checks">
          {item.checks.map((check) => {
            const state = checkState(check);
            const Icon = CHECK_META[state].icon;
            return (
              <span key={check.key} className={`vf-check is-${state}`} title={`${check.label} : ${CHECK_META[state].label}`}>
                <Icon size={13} />
                {check.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="vf-row-progress">
        <span>
          <strong>{progress.done}</strong>/{progress.total} contrôles
        </span>
        <span className="bo-bar">
          <span style={{ width: `${Math.round(progress.ratio * 100)}%`, background: "var(--bo-success)" }} />
        </span>
      </div>
      <button type="button" className={`bo-btn bo-btn--sm ${needsAction ? "bo-btn--primary" : "bo-btn--ghost"}`} disabled={loading} onClick={onOpen}>
        {loading ? <Loader2 size={15} className="bo-spin" /> : <FileText size={15} />}
        {needsAction ? "Examiner" : "Voir le dossier"}
      </button>
    </div>
  );
}

type DossierDrawerProps = {
  dossier: VerificationDossier;
  busyKey: string | null;
  rejectKey: string | null;
  rejectReason: string;
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
  onRejectReason,
  onStartReject,
  onCancelReject,
  onChange,
  onClose,
}: DossierDrawerProps) {
  const account = dossier.account;
  const meta = STATUS_META[account.verificationStatus];
  const progress = progressOf(account.checks);
  return (
    <BoDrawer
      title="Dossier de vérification"
      subtitle={`${account.role?.label ?? (account.kind === "COMPANY" ? "Entreprise" : "Professionnel")} · ${progress.done}/${progress.total} contrôles validés`}
      onClose={onClose}
      width={720}
    >
      <div className="vf-profile">
        <ProfileAvatar uploadId={account.avatarUploadId} name={account.displayName} size={60} />
        <div className="vf-profile-main">
          <div className="vf-row-title">
            <strong>{account.displayName}</strong>
            {account.verificationStatus === "verified" ? <BadgeCheck size={18} className="vf-verified-icon" /> : null}
            <span className={`bo-pill ${meta.pill}`}>{meta.label}</span>
          </div>
          <div className="vf-row-sub">
            <Mail size={13} />
            <span>{account.email}</span>
            {account.country ? (
              <>
                <span className="vf-dot" />
                <span>{account.country.name}</span>
              </>
            ) : null}
            <span className="vf-dot" />
            <span>Inscrit le {shortDate(account.createdAt)}</span>
          </div>
          <div className="vf-steps">
            {account.checks.map((check) => (
              <span key={check.key} className={`vf-step is-${checkState(check)}`} title={`${check.label} : ${CHECK_META[checkState(check)].label}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="bo-alert vf-guide">
        <ShieldCheck size={16} />
        <span>
          {account.kind === "PROFESSIONAL"
            ? "Validez l’identité seulement si photo, téléphone et ville sont fournis, puis le CV, les diplômes et les certifications s’ils sont présents."
            : "Validez séparément l’existence de l’entreprise, les documents légaux et le représentant légal."}
        </span>
      </div>

      <div className="vf-sections">
        {dossier.sections.map((section) => {
          const state = checkState(section);
          const StateIcon = CHECK_META[state].icon;
          const busy = busyKey === section.key;
          const rejecting = rejectKey === section.key;
          const facts = section.facts.map(splitFact);
          return (
            <section key={section.key} className={`vf-section is-${state}`}>
              <header className="vf-section-head">
                <span className={`vf-section-icon is-${state}`}>
                  <StateIcon size={18} />
                </span>
                <div className="vf-section-title">
                  <strong>
                    {section.label}
                    {section.required ? <em>Obligatoire</em> : null}
                  </strong>
                  {section.hint ? <span>{section.hint}</span> : null}
                </div>
                <span className={`vf-check is-${state}`}>{sectionLabel(section)}</span>
              </header>

              <div className="vf-section-body">
                {facts.length ? (
                  <dl className="vf-facts">
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
                  <p className="vf-missing">Aucun élément renseigné dans cette section.</p>
                ) : null}

                {section.people.length ? (
                  <div className="vf-people">
                    {section.people.map((person, index) => (
                      <div key={`${person.name}-${index}`} className="vf-person">
                        <span className="vf-person-avatar">
                          <UserRound size={16} />
                        </span>
                        <div>
                          <strong>{person.name}</strong>
                          {person.title ? <span>{person.title}</span> : null}
                          <div className="vf-person-meta">
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
                  <div className="vf-files">
                    {section.files.map((file) => (
                      <DocumentPreview key={file.id} file={file} />
                    ))}
                  </div>
                ) : null}

                {section.reviewStatus === "rejected" && section.rejectionReason ? (
                  <div className="bo-alert is-danger">
                    <CircleX size={16} />
                    <span>
                      <strong>Motif du refus :</strong> {section.rejectionReason}
                    </span>
                  </div>
                ) : null}

                {rejecting ? (
                  <label className="bo-field vf-reject">
                    <span className="bo-field-label">Motif du refus (obligatoire)</span>
                    <textarea
                      className="bo-textarea"
                      rows={3}
                      maxLength={500}
                      autoFocus
                      value={rejectReason}
                      placeholder="Expliquez ce qui doit être corrigé…"
                      onChange={(event) => onRejectReason(event.target.value)}
                    />
                  </label>
                ) : null}
              </div>

              <footer className="vf-section-actions">
                {rejecting ? (
                  <>
                    <button type="button" className="bo-btn bo-btn--ghost bo-btn--sm" onClick={onCancelReject}>
                      Annuler
                    </button>
                    <button
                      type="button"
                      className="bo-btn bo-btn--danger-solid bo-btn--sm"
                      disabled={busy || !rejectReason.trim()}
                      onClick={() => onChange(section.key, "rejected", rejectReason)}
                    >
                      <X size={15} />
                      Confirmer le refus
                    </button>
                  </>
                ) : (
                  <>
                    {section.reviewStatus !== "pending" ? (
                      <button type="button" className="bo-btn bo-btn--ghost bo-btn--sm" disabled={busy} onClick={() => onChange(section.key, "pending")}>
                        <RotateCcw size={14} />
                        Remettre en attente
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="bo-btn bo-btn--danger bo-btn--sm"
                      disabled={section.reviewStatus === "rejected" || busy}
                      onClick={() => onStartReject(section.key)}
                    >
                      <X size={15} />
                      Refuser
                    </button>
                    <button
                      type="button"
                      className="bo-btn bo-btn--primary bo-btn--sm"
                      disabled={!section.complete || section.reviewStatus === "verified" || busy}
                      onClick={() => onChange(section.key, "verified")}
                    >
                      {busy ? <Loader2 size={15} className="bo-spin" /> : <Check size={15} />}
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
