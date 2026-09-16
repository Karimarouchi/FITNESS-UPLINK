import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { can, useBilling } from "@/features/billing/useBilling";
import { fetchMailPrefs, saveMailPrefs, type UserMailPrefs } from "./mailPrefsApi";

const VARS = [
  { key: "{{prenom}}", label: "Prénom" },
  { key: "{{etablissement}}", label: "Établissement" },
  { key: "{{offre}}", label: "Offre" },
  { key: "{{expediteur}}", label: "Expéditeur" },
  { key: "{{extrait}}", label: "Extrait du message" },
];

export function EmployerMailSettings() {
  const billing = useBilling();
  const canOwnSmtp = can(billing, "hire.mail.own");
  const [prefs, setPrefs] = useState<UserMailPrefs | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetchMailPrefs()
      .then(setPrefs)
      .catch(() => setError("Impossible de charger les e-mails recrutement."));
  }, []);

  if (!prefs) {
    return error ? <p className="auth-error">{error}</p> : <p className="empty-hint">Chargement des e-mails…</p>;
  }

  async function copyVar(key: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(key);
      window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!prefs) {
      return;
    }
    setBusy(true);
    try {
      const saved = await saveMailPrefs({
        ...prefs,
        sendMode: canOwnSmtp ? prefs.sendMode : "PLATFORM",
        smtpPassword: password || undefined,
      });
      setPrefs(saved);
      setPassword("");
      setFlash("Textes et envoi e-mail enregistrés.");
      setError(null);
    } catch {
      setError("Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="settings-mail" onSubmit={(event) => void onSave(event)}>
      <Panel title="E-mails recrutement" body>
        {flash ? <p className="fu-flash">{flash}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}
        <p className="settings-mail-lead">
          Ces textes partent quand vous contactez un candidat ou qu’un message arrive. L’application envoie via Fitness
          Uplink, sauf si vous branchez votre boîte.
        </p>
        <div className="settings-mail-intro">
          <div className="settings-vars">
            <span>Variables à coller dans le texte</span>
            <div className="settings-var-row">
              {VARS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={copied === item.key ? "settings-var is-copied" : "settings-var"}
                  onClick={() => void copyVar(item.key)}
                >
                  <b>{item.label}</b>
                  <code dir="ltr">{item.key}</code>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor="mail-send-mode">Mode d’envoi</label>
            <select
              id="mail-send-mode"
              value={canOwnSmtp ? prefs.sendMode : "PLATFORM"}
              disabled={!canOwnSmtp}
              onChange={(event) => setPrefs({ ...prefs, sendMode: event.target.value })}
            >
              <option value="PLATFORM">L’application envoie (Fitness Uplink)</option>
              {canOwnSmtp ? <option value="OWN">Envoyer avec ma boîte (SMTP)</option> : null}
            </select>
            {canOwnSmtp ? null : (
              <p className="empty-hint">
                SMTP personnel : <a href="/app/profile/plan">offre Business</a>.
              </p>
            )}
          </div>
        </div>
      </Panel>

      <div className="settings-mail-grid">
        <Panel title="Candidat contacté" body>
          <div className="field">
            <label htmlFor="mail-contact-subject">Sujet</label>
            <input
              id="mail-contact-subject"
              value={prefs.contactSubject}
              onChange={(event) => setPrefs({ ...prefs, contactSubject: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="mail-contact-body">Texte</label>
            <textarea
              id="mail-contact-body"
              rows={7}
              value={prefs.contactBody}
              onChange={(event) => setPrefs({ ...prefs, contactBody: event.target.value })}
            />
          </div>
        </Panel>

        <Panel title="Nouveau message" body>
          <div className="field">
            <label htmlFor="mail-message-subject">Sujet</label>
            <input
              id="mail-message-subject"
              value={prefs.messageSubject}
              onChange={(event) => setPrefs({ ...prefs, messageSubject: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="mail-message-body">Texte</label>
            <textarea
              id="mail-message-body"
              rows={7}
              value={prefs.messageBody}
              onChange={(event) => setPrefs({ ...prefs, messageBody: event.target.value })}
            />
          </div>
        </Panel>
      </div>

      {prefs.sendMode === "OWN" && canOwnSmtp ? (
        <Panel title="Ma boîte SMTP" body>
          <div className="mail-fields">
            <div className="field">
              <label htmlFor="mail-from-name">Nom d’expéditeur</label>
              <input
                id="mail-from-name"
                value={prefs.fromName}
                onChange={(event) => setPrefs({ ...prefs, fromName: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="mail-from-email">E-mail d’expéditeur</label>
              <input
                id="mail-from-email"
                type="email"
                value={prefs.fromEmail}
                onChange={(event) => setPrefs({ ...prefs, fromEmail: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="mail-smtp-host">Serveur SMTP</label>
              <input
                id="mail-smtp-host"
                value={prefs.smtpHost}
                placeholder="smtp.gmail.com"
                onChange={(event) => setPrefs({ ...prefs, smtpHost: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="mail-smtp-port">Port</label>
              <input
                id="mail-smtp-port"
                type="number"
                value={prefs.smtpPort ?? 587}
                onChange={(event) => setPrefs({ ...prefs, smtpPort: Number(event.target.value) })}
              />
            </div>
            <div className="field">
              <label htmlFor="mail-smtp-user">Identifiant SMTP</label>
              <input
                id="mail-smtp-user"
                value={prefs.smtpUsername}
                autoComplete="off"
                onChange={(event) => setPrefs({ ...prefs, smtpUsername: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="mail-smtp-password">Mot de passe SMTP</label>
              <input
                id="mail-smtp-password"
                type="password"
                autoComplete="new-password"
                value={password}
                placeholder={prefs.passwordConfigured ? "Laisser vide pour conserver" : "App password"}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>
        </Panel>
      ) : null}

      <div className="settings-mail-actions">
        <Button variant="primary" type="submit" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer les e-mails"}
        </Button>
      </div>
    </form>
  );
}
