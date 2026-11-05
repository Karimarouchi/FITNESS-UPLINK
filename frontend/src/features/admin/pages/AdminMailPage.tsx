import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircle2, FileText, Mail, Send, Server, TriangleAlert, X } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import {
  fetchMailEvents,
  fetchMailSettings,
  saveMailSettings,
  sendMailTest,
  type MailEvent,
  type MailSettings,
} from "../mailApi";
import { fetchMailTemplates, saveMailTemplate, type MailTemplate } from "@/features/recruitment/mailPrefsApi";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";

const PURPOSE_LABEL: Record<string, string> = {
  VERIFY_EMAIL: "Vérification",
  RESET_PASSWORD: "Reset mot de passe",
  WELCOME: "Bienvenue",
  TEST: "Test SMTP",
  HIRE_CONTACTED: "Candidat contacté",
  HIRE_MESSAGE: "Nouveau message",
  HIRE_INTERVIEW: "Entretien prévu",
  DOCUMENT_REJECTED: "Document refusé",
  DOCUMENT_VERIFIED: "Document validé",
};

const FILTERS = [
  { id: "", label: "Tous" },
  { id: "FAILED", label: "Échecs" },
  { id: "SENT", label: "Envoyés" },
];

export function AdminMailPage() {
  const [settings, setSettings] = useState<MailSettings | null>(null);
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [events, setEvents] = useState<MailEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<MailTemplate[]>([]);

  function applySettings(next: MailSettings) {
    setSettings(next);
    setFromName(next.fromName);
    setFromEmail(next.fromEmail);
    setSmtpHost(next.smtpHost || "smtp.gmail.com");
    setSmtpPort(next.smtpPort != null ? String(next.smtpPort) : "587");
    setSmtpUsername(next.smtpUsername || next.fromEmail || "");
    setSmtpPassword("");
  }

  function loadEvents(nextStatus = status) {
    return fetchMailEvents(nextStatus).then((page) => {
      setEvents(page.items);
      setTotal(page.total);
    });
  }

  useEffect(() => {
    Promise.all([fetchMailSettings(), fetchMailEvents(""), fetchMailTemplates().catch(() => [])])
      .then(([nextSettings, page, rows]) => {
        applySettings(nextSettings);
        setEvents(page.items);
        setTotal(page.total);
        setTemplates(rows);
        setError(null);
      })
      .catch(() => setError("Impossible de charger la configuration e-mail."));
  }, []);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      const next = await saveMailSettings({
        fromName: fromName.trim(),
        fromEmail: fromEmail.trim(),
        smtpHost: smtpHost.trim(),
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpUsername: smtpUsername.trim(),
        smtpPassword: smtpPassword.trim() || undefined,
      });
      applySettings(next);
      setFlash("Configuration e-mail enregistrée.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function onTest() {
    setBusy(true);
    setError(null);
    setFlash(null);
    try {
      await sendMailTest();
      setFlash("E-mail de test envoyé vers votre compte admin.");
      await loadEvents();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de l'envoi test.");
      await loadEvents();
    } finally {
      setBusy(false);
    }
  }

  async function onFilter(next: string) {
    setStatus(next);
    try {
      await loadEvents(next);
    } catch {
      setError("Impossible de charger le journal.");
    }
  }

  return (
    <section className="bo-dash bo-users bo-bm bo-ml">
      <header className="bo-dash-head">
        <div>
          <h1>E-mails</h1>
          <p>Expéditeur, SMTP et journal des envois. Le mot de passe n’est jamais réaffiché.</p>
        </div>
      </header>

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

      <form className="ml-form" onSubmit={(event) => void onSave(event)}>
        <div className="bo-dash-card bo-users-card">
          <CardHead icon={<Mail size={22} />} title="Expéditeur" tone="is-blue" />
          <div className="ml-grid">
            <Field id="mail-from-name" label="Nom affiché">
              <input
                id="mail-from-name"
                className="bm-input"
                value={fromName}
                onChange={(event) => setFromName(event.target.value)}
                required
              />
            </Field>
            <Field id="mail-from-email" label="Adresse d’envoi">
              <input
                id="mail-from-email"
                className="bm-input"
                type="email"
                value={fromEmail}
                onChange={(event) => setFromEmail(event.target.value)}
                required
              />
            </Field>
          </div>
        </div>

        <div className="bo-dash-card bo-users-card">
          <CardHead
            icon={<Server size={22} />}
            title="Serveur SMTP"
            tone=""
            end={
              settings ? (
                <span className={`bo-users-status ${settings.passwordConfigured ? "is-success" : "is-danger"}`}>
                  {settings.passwordConfigured ? "SMTP prêt" : "SMTP non configuré"}
                </span>
              ) : null
            }
          />
          <div className="ml-grid">
            {settings && !settings.passwordConfigured ? (
              <p className="ml-warning ml-full" role="alert">
                <TriangleAlert size={16} aria-hidden="true" />
                <span>
                  Aucun mot de passe SMTP. Collez l’app password Gmail ci-dessous puis Enregistrer, sinon les envois
                  échoueront.
                </span>
              </p>
            ) : null}
            <Field id="mail-smtp-host" label="Hôte SMTP">
              <input
                id="mail-smtp-host"
                className="bm-input"
                value={smtpHost}
                onChange={(event) => setSmtpHost(event.target.value)}
                placeholder="smtp.gmail.com"
              />
            </Field>
            <Field id="mail-smtp-port" label="Port">
              <input
                id="mail-smtp-port"
                className="bm-input"
                value={smtpPort}
                onChange={(event) => setSmtpPort(event.target.value)}
                placeholder="587"
                inputMode="numeric"
              />
            </Field>
            <Field id="mail-smtp-user" label="Utilisateur SMTP">
              <input
                id="mail-smtp-user"
                className="bm-input"
                value={smtpUsername}
                onChange={(event) => setSmtpUsername(event.target.value)}
                placeholder="compte Gmail"
                autoComplete="off"
              />
            </Field>
            <Field id="mail-smtp-password" label="Mot de passe SMTP">
              <input
                id="mail-smtp-password"
                className="bm-input"
                type="password"
                autoComplete="new-password"
                placeholder={settings?.passwordConfigured ? "Laisser vide pour conserver" : "App password Gmail"}
                value={smtpPassword}
                onChange={(event) => setSmtpPassword(event.target.value)}
              />
            </Field>
            <p className="ml-hint ml-full">
              Avec Gmail, l’adresse d’envoi doit être le compte SMTP ou un alias validé. Le mot de passe n’est jamais
              réaffiché.
              {settings?.usingEnvSmtp ? " Source actuelle : serveur." : " Source actuelle : enregistrée dans l’interface."}
            </p>
            <div className="ml-actions ml-full">
              <button type="submit" className="bm-btn" disabled={busy}>
                {busy ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button type="button" className="bm-btn is-outline" disabled={busy} onClick={() => void onTest()}>
                <Send size={16} aria-hidden="true" />
                Envoyer un test
              </button>
            </div>
          </div>
        </div>
      </form>

      {templates.length ? (
        <div className="bo-dash-card bo-users-card">
          <CardHead icon={<FileText size={22} />} title="Textes des e-mails Hire" tone="is-rose" count={templates.length} />
          <p className="ml-lead">Modèles par défaut. Un établissement peut les remplacer dans Paramètres.</p>
          {templates.map((item, index) => (
            <div key={item.purpose} className="ml-tpl">
              <h3>{PURPOSE_LABEL[item.purpose] ?? item.purpose}</h3>
              <Field id={`tpl-subject-${item.purpose}`} label="Sujet">
                <input
                  id={`tpl-subject-${item.purpose}`}
                  className="bm-input"
                  value={item.subject}
                  onChange={(event) => {
                    const next = templates.map((row, rowIndex) => (rowIndex === index ? { ...row, subject: event.target.value } : row));
                    setTemplates(next);
                  }}
                />
              </Field>
              <Field id={`tpl-body-${item.purpose}`} label="Texte">
                <textarea
                  id={`tpl-body-${item.purpose}`}
                  className="bm-input ml-textarea"
                  rows={4}
                  value={item.body}
                  onChange={(event) => {
                    const next = templates.map((row, rowIndex) => (rowIndex === index ? { ...row, body: event.target.value } : row));
                    setTemplates(next);
                  }}
                />
              </Field>
              <div className="ml-actions">
                <button
                  type="button"
                  className="bm-btn is-outline"
                  onClick={() => {
                    void saveMailTemplate(item)
                      .then(() => setFlash("Modèle enregistré."))
                      .catch(() => setError("Impossible d’enregistrer ce modèle."));
                  }}
                >
                  Enregistrer ce texte
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="bo-dash-card bo-users-card">
        <div className="bo-users-toolbar">
          <div className="bm-card-title">
            <span className="bo-dash-icon is-blue" aria-hidden="true">
              <Send size={22} />
            </span>
            <div>
              <h2>Journal</h2>
              <p>{total} envoi{total > 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="bo-users-tabs bm-toolbar-end" role="tablist" aria-label="Filtrer le journal">
            {FILTERS.map((item) => (
              <button
                key={item.id || "all"}
                type="button"
                role="tab"
                aria-selected={status === item.id}
                className={status === item.id ? "is-active" : ""}
                onClick={() => void onFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="bm-table-wrap">
          <table className="bm-table">
            <caption className="bm-sr">Journal des envois</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Type</th>
                <th scope="col">Destinataire</th>
                <th scope="col">Statut</th>
                <th scope="col">Durée</th>
                <th scope="col">Erreur</th>
              </tr>
            </thead>
            <tbody>
              {events.map((item) => (
                <tr key={item.id}>
                  <td className="is-date">{new Date(item.createdAt).toLocaleString("fr-FR")}</td>
                  <td>{PURPOSE_LABEL[item.purpose] ?? item.purpose}</td>
                  <td>{item.recipientMasked}</td>
                  <td>
                    <span className={`bo-users-status ${item.status === "FAILED" ? "is-danger" : "is-success"}`}>
                      {item.status === "FAILED" ? "Échec" : "Envoyé"}
                    </span>
                  </td>
                  <td className="is-number">{item.durationMs != null ? `${item.durationMs} ms` : "—"}</td>
                  <td className="ml-error">{item.errorMessage ?? <span className="bo-users-muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 ? (
            <div className="bo-users-empty">
              <span>
                <Mail size={22} aria-hidden="true" />
              </span>
              <strong>Aucun envoi</strong>
              <p>Aucun envoi enregistré pour le moment.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function CardHead({
  icon,
  title,
  tone,
  end,
  count,
}: {
  icon: ReactNode;
  title: string;
  tone: string;
  end?: ReactNode;
  count?: number;
}) {
  return (
    <div className="ml-card-head">
      <span className={`bo-dash-icon ${tone}`} aria-hidden="true">
        {icon}
      </span>
      <h2>{title}</h2>
      {count !== undefined ? <span className="ml-count">{count}</span> : null}
      {end}
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="ml-field">
      <label htmlFor={id}>{label}</label>
      {children}
    </div>
  );
}
