import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
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
    <section>
      <div className="page-head">
        <div>
          <h1>E-mails</h1>
          <div className="sub">Expéditeur, SMTP et journal des envois. Le mot de passe n’est jamais réaffiché.</div>
        </div>
      </div>
      {flash ? <p className="fu-flash">{flash}</p> : null}
      {error ? <p className="auth-error">{error}</p> : null}

      <form onSubmit={(event) => void onSave(event)}>
        <Panel title="Expéditeur" body>
          <div className="mail-fields">
            <div className="field">
              <label htmlFor="mail-from-name">Nom affiché</label>
              <input
                id="mail-from-name"
                value={fromName}
                onChange={(event) => setFromName(event.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="mail-from-email">Adresse d’envoi</label>
              <input
                id="mail-from-email"
                type="email"
                value={fromEmail}
                onChange={(event) => setFromEmail(event.target.value)}
                required
              />
            </div>
          </div>
        </Panel>

        <Panel title="Serveur SMTP" body>
          <div className="mail-fields">
            <p className="field--full">
              {settings?.passwordConfigured ? (
                <span className="status-pill verified">SMTP prêt</span>
              ) : (
                <span className="status-pill refused">SMTP non configuré</span>
              )}
            </p>
            {settings && !settings.passwordConfigured ? (
              <p className="auth-error field--full">
                Aucun mot de passe SMTP. Collez l’app password Gmail ci-dessous puis Enregistrer, sinon les envois
                échoueront.
              </p>
            ) : null}
            <div className="field">
              <label htmlFor="mail-smtp-host">Hôte SMTP</label>
              <input
                id="mail-smtp-host"
                value={smtpHost}
                onChange={(event) => setSmtpHost(event.target.value)}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div className="field">
              <label htmlFor="mail-smtp-port">Port</label>
              <input
                id="mail-smtp-port"
                value={smtpPort}
                onChange={(event) => setSmtpPort(event.target.value)}
                placeholder="587"
                inputMode="numeric"
              />
            </div>
            <div className="field">
              <label htmlFor="mail-smtp-user">Utilisateur SMTP</label>
              <input
                id="mail-smtp-user"
                value={smtpUsername}
                onChange={(event) => setSmtpUsername(event.target.value)}
                placeholder="compte Gmail"
                autoComplete="off"
              />
            </div>
            <div className="field">
              <label htmlFor="mail-smtp-password">Mot de passe SMTP</label>
              <input
                id="mail-smtp-password"
                type="password"
                autoComplete="new-password"
                placeholder={settings?.passwordConfigured ? "Laisser vide pour conserver" : "App password Gmail"}
                value={smtpPassword}
                onChange={(event) => setSmtpPassword(event.target.value)}
              />
            </div>
            <p className="muted-line field--full">
              Avec Gmail, l’adresse d’envoi doit être le compte SMTP ou un alias validé. Le mot de passe n’est jamais
              réaffiché.
              {settings?.usingEnvSmtp ? " Source actuelle : serveur." : " Source actuelle : enregistrée dans l’interface."}
            </p>
            <div className="head-actions field--full">
              <Button variant="primary" type="submit" disabled={busy}>
                {busy ? "Enregistrement..." : "Enregistrer"}
              </Button>
              <Button variant="outline" type="button" disabled={busy} onClick={() => void onTest()}>
                Envoyer un test
              </Button>
            </div>
          </div>
        </Panel>
      </form>

      {templates.length ? (
        <Panel title="Textes des e-mails Hire">
          <p className="empty-hint">Modèles par défaut. Un établissement peut les remplacer dans Paramètres.</p>
          {templates.map((item, index) => (
            <div key={item.purpose} className="mail-fields">
              <strong>{PURPOSE_LABEL[item.purpose] ?? item.purpose}</strong>
              <label className="fu-field">
                Sujet
                <input
                  className="custom-input"
                  value={item.subject}
                  onChange={(event) => {
                    const next = templates.map((row, rowIndex) => (rowIndex === index ? { ...row, subject: event.target.value } : row));
                    setTemplates(next);
                  }}
                />
              </label>
              <label className="fu-field">
                Texte
                <textarea
                  className="custom-input custom-textarea"
                  rows={4}
                  value={item.body}
                  onChange={(event) => {
                    const next = templates.map((row, rowIndex) => (rowIndex === index ? { ...row, body: event.target.value } : row));
                    setTemplates(next);
                  }}
                />
              </label>
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  void saveMailTemplate(item)
                    .then(() => setFlash("Modèle enregistré."))
                    .catch(() => setError("Impossible d’enregistrer ce modèle."));
                }}
              >
                Enregistrer ce texte
              </Button>
            </div>
          ))}
        </Panel>
      ) : null}

      <Panel title={`Journal (${total})`}>
        <div className="users-toolbar">
          <button className={!status ? "btn-mini primary" : "btn-mini"} type="button" onClick={() => void onFilter("")}>
            Tous
          </button>
          <button className={status === "FAILED" ? "btn-mini primary" : "btn-mini"} type="button" onClick={() => void onFilter("FAILED")}>
            Échecs
          </button>
          <button className={status === "SENT" ? "btn-mini primary" : "btn-mini"} type="button" onClick={() => void onFilter("SENT")}>
            Envoyés
          </button>
        </div>
        {events.length === 0 ? <p className="empty-hint">Aucun envoi enregistré pour le moment.</p> : null}
        {events.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Destinataire</th>
                <th>Statut</th>
                <th>Durée</th>
                <th>Erreur</th>
              </tr>
            </thead>
            <tbody>
              {events.map((item) => (
                <tr key={item.id}>
                  <td>{new Date(item.createdAt).toLocaleString("fr-FR")}</td>
                  <td>{PURPOSE_LABEL[item.purpose]}</td>
                  <td>{item.recipientMasked}</td>
                  <td>
                    <span className={item.status === "FAILED" ? "status-pill refused" : "status-pill verified"}>
                      {item.status === "FAILED" ? "Échec" : "Envoyé"}
                    </span>
                  </td>
                  <td>{item.durationMs != null ? `${item.durationMs} ms` : "—"}</td>
                  <td>{item.errorMessage ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>
    </section>
  );
}
