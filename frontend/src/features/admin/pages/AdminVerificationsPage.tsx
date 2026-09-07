import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
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
import { isSuperAdmin } from "@/features/auth/types";
import { useAuth } from "@/features/auth/AuthContext";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { DocumentPreview } from "@/shared/components/DocumentPreview";

const GROUPS = [
  { id: "all", label: "Tous" },
  { id: "candidates", label: "Candidats" },
  { id: "business", label: "Employeurs" },
];

const STATUSES = [
  { id: "", label: "Tous les statuts" },
  { id: "pending", label: "En attente" },
  { id: "verified", label: "Vérifiés" },
  { id: "rejected", label: "Refusés" },
];

function statusLabel(status: VerificationStatus) {
  if (status === "verified") {
    return "Vérifié";
  }
  if (status === "rejected") {
    return "Refusé";
  }
  return "En attente";
}

function statusTone(status: VerificationStatus) {
  if (status === "verified") {
    return "verified" as const;
  }
  if (status === "rejected") {
    return "refused" as const;
  }
  return "pending" as const;
}

function kindLabel(kind: VerificationAccount["kind"]) {
  return kind === "COMPANY" ? "Employeur" : "Candidat";
}

function checkChip(check: Pick<VerificationCheck, "complete" | "reviewStatus">) {
  if (check.reviewStatus === "verified") {
    return { className: "check-chip ok", label: "Validé" };
  }
  if (check.reviewStatus === "rejected") {
    return { className: "check-chip no", label: "Refusé" };
  }
  if (check.complete) {
    return { className: "check-chip wait", label: "À valider" };
  }
  return { className: "check-chip empty", label: "Non fourni" };
}

function sectionStatusLabel(section: VerificationSection) {
  if (section.reviewStatus === "verified") {
    return "Validé";
  }
  if (section.reviewStatus === "rejected") {
    return "Refusé";
  }
  if (!section.complete) {
    return section.required ? "Incomplet" : "Non fourni";
  }
  return "À valider";
}

export function AdminVerificationsPage() {
  const { user } = useAuth();
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<VerificationAccount[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [dossier, setDossier] = useState<VerificationDossier | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin(user)) {
      return;
    }
    fetchVerifications(group, status)
      .then((list) => {
        setItems(list);
        setError(null);
      })
      .catch(() => setError("Impossible de charger les comptes."));
  }, [user, group, status]);

  async function openDossier(id: string) {
    setLoadingDossier(true);
    try {
      setDossier(await fetchVerificationDossier(id));
    } catch {
      setError("Impossible de charger le dossier.");
    } finally {
      setLoadingDossier(false);
    }
  }

  async function changeCheck(key: string, next: VerificationStatus) {
    if (!dossier) {
      return;
    }
    setBusyKey(key);
    try {
      const updated = await updateVerificationCheck(dossier.account.id, key, next);
      setDossier(updated);
      setItems((current) => current.map((item) => (item.id === updated.account.id ? updated.account : item)));
      const section = updated.sections.find((item) => item.key === key);
      const label = section?.label ?? key;
      setFlash(
        next === "verified"
          ? `${label} validé pour ${updated.account.displayName}.`
          : next === "rejected"
            ? `${label} refusé pour ${updated.account.displayName}.`
            : `${label} remis en attente pour ${updated.account.displayName}.`,
      );
      setError(null);
    } catch {
      setError("Impossible de mettre à jour ce contrôle.");
    } finally {
      setBusyKey(null);
    }
  }

  if (!isSuperAdmin(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const visible = items.filter((item) => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return true;
    }
    return [item.displayName, item.email, item.role?.label ?? "", kindLabel(item.kind)].join(" ").toLowerCase().includes(needle);
  });
  const candidates = visible.filter((item) => item.kind === "PROFESSIONAL");
  const employers = visible.filter((item) => item.kind === "COMPANY");
  const pendingCount = items.filter((item) => item.verificationStatus === "pending").length;

  function renderList(list: VerificationAccount[], emptyLabel: string) {
    if (!list.length) {
      return (
        <p className="jobs-empty">
          <strong>Vide</strong>
          <span>{emptyLabel}</span>
        </p>
      );
    }
    return list.map((item) => (
      <div key={item.id} className="verify-account">
        <ProfileAvatar uploadId={item.avatarUploadId} name={item.displayName} size={48} />
        <div className="verify-account-copy">
          <div className="verify-account-title">
            <strong>{item.displayName}</strong>
            {item.verificationStatus === "verified" ? <Badge>Compte vérifié</Badge> : null}
            <StatusPill tone={statusTone(item.verificationStatus)}>{statusLabel(item.verificationStatus)}</StatusPill>
          </div>
          <p className="verify-account-meta">
            {item.email} · {item.role?.label ?? kindLabel(item.kind)}
            {item.onboardingCompleted ? "" : " · Dossier incomplet"}
          </p>
          <div className="verify-account-checks">
            {item.checks.map((check) => {
              const state = checkChip(check);
              return (
                <span key={check.key} className={state.className}>
                  {check.label} · {state.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="verify-account-actions">
          <Button variant="mini" type="button" onClick={() => void openDossier(item.id)}>
            Examiner
          </Button>
        </div>
      </div>
    ));
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Vérifications</h1>
          <p className="sub">
            {pendingCount} dossier{pendingCount > 1 ? "s" : ""} en attente. Validez chaque contrôle séparément : le badge n’apparaît que lorsque tout est validé.
          </p>
        </div>
        <label className="page-search">
          <span className="material-symbols-outlined" aria-hidden="true">
            search
          </span>
          <input value={query} placeholder="Nom, e-mail ou rôle" onChange={(event) => setQuery(event.target.value)} />
        </label>
      </div>

      <div className="filter-pills">
        {GROUPS.map((item) => (
          <button key={item.id} type="button" className={`filter-pill${group === item.id ? " is-active" : ""}`} onClick={() => setGroup(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="filter-pills">
        {STATUSES.map((item) => (
          <button
            key={item.id || "all-status"}
            type="button"
            className={`filter-pill${status === item.id ? " is-active" : ""}`}
            onClick={() => setStatus(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}
      {loadingDossier ? <p className="empty-hint">Chargement du dossier…</p> : null}

      {group === "all" || group === "candidates" ? (
        <Panel title="Candidats" actionLabel={String(candidates.length)}>
          {renderList(candidates, query.trim() ? "Aucun candidat ne correspond à cette recherche." : "Aucun candidat dans ce filtre.")}
        </Panel>
      ) : null}
      {group === "all" || group === "business" ? (
        <Panel title="Employeurs" actionLabel={String(employers.length)}>
          {renderList(employers, query.trim() ? "Aucun employeur ne correspond à cette recherche." : "Aucun employeur dans ce filtre.")}
        </Panel>
      ) : null}

      {dossier ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setDossier(null)}>
          <aside className="fu-drawer verify-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="contract-back" type="button" onClick={() => setDossier(null)}>
              <span className="material-symbols-outlined" aria-hidden="true">
                close
              </span>
              Fermer
            </button>
            <div className="verify-drawer-head">
              <ProfileAvatar uploadId={dossier.account.avatarUploadId} name={dossier.account.displayName} size={56} />
              <div>
                <div className="pn">{dossier.account.displayName}</div>
                <div className="pt">
                  {kindLabel(dossier.account.kind)} · {dossier.account.role?.label ?? "—"}
                </div>
                <div className="tag-row">
                  {dossier.account.verificationStatus === "verified" ? <Badge>Compte vérifié</Badge> : null}
                  <StatusPill tone={statusTone(dossier.account.verificationStatus)}>
                    {statusLabel(dossier.account.verificationStatus)}
                  </StatusPill>
                </div>
                <p className="verify-account-meta">{dossier.account.email}</p>
              </div>
            </div>
            <p className="empty-hint">
              {dossier.account.kind === "PROFESSIONAL"
                ? "Validez l’identité seulement si photo, téléphone et ville sont fournis, puis le CV, les diplômes et les certifications s’ils sont présents."
                : "Validez séparément l’existence, les documents légaux et le représentant légal."}
            </p>
            {dossier.sections.map((section) => {
              const state = checkChip(section);
              return (
                <section key={section.key} className="verify-block">
                  <div className="verify-block-head">
                    <h3>{section.label}</h3>
                    <span className={state.className}>{sectionStatusLabel(section)}</span>
                  </div>
                  <p className="verify-block-hint">{section.hint}</p>
                  {section.facts.length ? (
                    <ul className="verify-facts">
                      {section.facts.map((fact) => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="verify-missing">Aucun élément renseigné dans cette section.</p>
                  )}
                  {section.people.length ? (
                    <ul className="verify-facts">
                      {section.people.map((person, index) => (
                        <li key={`${person.name}-${index}`}>
                          <strong>{person.name}</strong>
                          {person.title ? ` · ${person.title}` : ""}
                          {person.idNumber ? <div>Pièce d’identité : {person.idNumber}</div> : null}
                          {person.email ? <div>{person.email}</div> : null}
                          {person.phone ? <div>{person.phone}</div> : null}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {section.files.length ? (
                    <div className="verify-files">
                      {section.files.map((file) => (
                        <DocumentPreview key={file.id} file={file} />
                      ))}
                    </div>
                  ) : (
                    <p className="verify-missing">Aucun document joint.</p>
                  )}
                  <div className="jobs-actions">
                    <Button
                      variant="primary"
                      type="button"
                      disabled={!section.complete || section.reviewStatus === "verified" || busyKey === section.key}
                      onClick={() => void changeCheck(section.key, "verified")}
                    >
                      Valider
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={section.reviewStatus === "rejected" || busyKey === section.key}
                      onClick={() => void changeCheck(section.key, "rejected")}
                    >
                      Refuser
                    </Button>
                    {section.reviewStatus !== "pending" ? (
                      <Button variant="mini" type="button" disabled={busyKey === section.key} onClick={() => void changeCheck(section.key, "pending")}>
                        Remettre en attente
                      </Button>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
