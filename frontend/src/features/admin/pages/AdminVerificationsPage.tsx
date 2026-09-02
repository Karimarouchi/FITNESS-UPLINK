import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
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
import { VerificationBadge } from "@/shared/components/VerificationBadge";
import { fetchUploadBlob } from "@/features/onboarding/api";

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

function kindLabel(kind: VerificationAccount["kind"]) {
  return kind === "COMPANY" ? "Employeur" : "Candidat";
}

function checkMark(check: Pick<VerificationCheck, "reviewStatus">) {
  if (check.reviewStatus === "verified") {
    return "✓";
  }
  if (check.reviewStatus === "rejected") {
    return "✕";
  }
  return "○";
}

function checkClass(check: Pick<VerificationCheck, "complete" | "reviewStatus">) {
  if (check.reviewStatus === "verified") {
    return "verify-check is-ok";
  }
  if (check.reviewStatus === "rejected") {
    return "verify-check is-rejected";
  }
  if (check.complete) {
    return "verify-check is-ready";
  }
  return "verify-check";
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

async function openFile(id: string, name: string) {
  const blob = await fetchUploadBlob(id);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
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
      setItems((current) =>
        current.map((item) => (item.id === updated.account.id ? updated.account : item)),
      );
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
    return [item.displayName, item.email, item.role?.label ?? "", kindLabel(item.kind)]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
  const candidates = visible.filter((item) => item.kind === "PROFESSIONAL");
  const employers = visible.filter((item) => item.kind === "COMPANY");

  function renderList(list: VerificationAccount[]) {
    return (
      <ul className="verify-list">
        {list.map((item) => (
          <li key={item.id} className="verify-row">
            <ProfileAvatar uploadId={item.avatarUploadId} name={item.displayName} size={48} />
            <div className="verify-copy">
              <div className="talent-card-title">
                <strong>{item.displayName}</strong>
                <VerificationBadge verified={item.verificationStatus === "verified"} compact />
              </div>
              <p>
                {item.email} · {kindLabel(item.kind)} · {item.role?.label ?? "—"} · {statusLabel(item.verificationStatus)}
                {item.onboardingCompleted ? "" : " · Dossier incomplet"}
              </p>
              <div className="verify-checks">
                {item.checks.map((check) => (
                  <span key={check.key} className={checkClass(check)}>
                    {checkMark(check)} {check.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="verify-actions">
              <button className="ob-secondary" type="button" onClick={() => void openDossier(item.id)}>
                Examiner le dossier
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <section className="talent-page talent-page--wide">
      <p className="font-label-caps uppercase text-on-surface-variant">Back-office</p>
      <h1 className="font-display-lg-mobile text-primary mb-4">Vérifications</h1>
      <p className="font-body-md text-on-surface-variant mb-6">
        Validez chaque contrôle séparément. Le badge n’apparaît que lorsque tous les contrôles requis sont validés.
        Candidats : identité, puis diplômes et certifications s’ils sont fournis. Employeurs : existence, documents légaux et représentant légal, chacun de son côté.
      </p>
      <div className="pipeline-row mb-4">
        {GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`pipeline-chip${group === item.id ? " is-active" : ""}`}
            onClick={() => setGroup(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="pipeline-row mb-4">
        {STATUSES.map((item) => (
          <button
            key={item.id || "all-status"}
            type="button"
            className={`pipeline-chip${status === item.id ? " is-active" : ""}`}
            onClick={() => setStatus(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <input
        className="custom-input talent-search"
        value={query}
        placeholder="Rechercher un nom, un e-mail, un rôle…"
        onChange={(event) => setQuery(event.target.value)}
      />
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}
      {loadingDossier ? <p className="font-body-md text-on-surface-variant">Chargement du dossier…</p> : null}
      {group === "all" || group === "candidates" ? (
        <div className="mb-8">
          <h2 className="font-headline-md text-primary mb-3">Candidats ({candidates.length})</h2>
          {candidates.length ? renderList(candidates) : <p className="font-body-md text-on-surface-variant">Aucun candidat.</p>}
        </div>
      ) : null}
      {group === "all" || group === "business" ? (
        <div>
          <h2 className="font-headline-md text-primary mb-3">Employeurs ({employers.length})</h2>
          {employers.length ? renderList(employers) : <p className="font-body-md text-on-surface-variant">Aucun employeur.</p>}
        </div>
      ) : null}

      {dossier ? (
        <div className="fu-backdrop" role="presentation" onClick={() => setDossier(null)}>
          <aside className="fu-drawer verify-drawer" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <button className="ob-link fiche-back" type="button" onClick={() => setDossier(null)}>
              Fermer
            </button>
            <div className="talent-card-title">
              <ProfileAvatar uploadId={dossier.account.avatarUploadId} name={dossier.account.displayName} size={56} />
              <div>
                <h2 className="font-display-lg-mobile text-primary">{dossier.account.displayName}</h2>
                <VerificationBadge verified={dossier.account.verificationStatus === "verified"} compact />
              </div>
            </div>
            <p className="font-body-md text-on-surface-variant">
              {kindLabel(dossier.account.kind)} · {dossier.account.role?.label ?? "—"} · {statusLabel(dossier.account.verificationStatus)}
            </p>
            <p>{dossier.account.email}</p>
            {dossier.account.kind === "PROFESSIONAL" ? (
              <p className="talent-meta">Validez l’identité, puis les diplômes et certifications s’ils sont présents.</p>
            ) : (
              <p className="talent-meta">Validez séparément l’existence, les documents légaux et le représentant légal.</p>
            )}
            {dossier.sections.map((section) => (
              <section key={section.key} className="verify-section">
                <div className="talent-card-title">
                  <h3>{section.label}</h3>
                  <span className={checkClass(section)}>{sectionStatusLabel(section)}</span>
                </div>
                <p className="text-on-surface-variant">{section.hint}</p>
                <ul className="fiche-list">
                  {section.facts.map((fact) => (
                    <li key={fact}>{fact}</li>
                  ))}
                </ul>
                {section.people.length ? (
                  <ul className="fiche-list">
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
                  <div className="fiche-files">
                    {section.files.map((file) => (
                      <button
                        key={file.id}
                        type="button"
                        className="ob-secondary"
                        onClick={() => void openFile(file.id, file.name)}
                      >
                        {file.name || "Ouvrir le document"}
                      </button>
                    ))}
                  </div>
                ) : null}
                <div className="verify-section-actions">
                  <button
                    className="ob-primary"
                    type="button"
                    disabled={!section.complete || section.reviewStatus === "verified" || busyKey === section.key}
                    onClick={() => void changeCheck(section.key, "verified")}
                  >
                    Valider
                  </button>
                  <button
                    className="ob-secondary"
                    type="button"
                    disabled={section.reviewStatus === "rejected" || busyKey === section.key}
                    onClick={() => void changeCheck(section.key, "rejected")}
                  >
                    Refuser
                  </button>
                  {section.reviewStatus !== "pending" ? (
                    <button
                      className="ob-secondary"
                      type="button"
                      disabled={busyKey === section.key}
                      onClick={() => void changeCheck(section.key, "pending")}
                    >
                      Remettre en attente
                    </button>
                  ) : null}
                </div>
              </section>
            ))}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
