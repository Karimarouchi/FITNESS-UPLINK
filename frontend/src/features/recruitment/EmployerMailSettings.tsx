import { useEffect, useState, type FormEvent } from "react";
import { Mail, MessageSquare, Server, UserRoundCheck } from "lucide-react";
import { Btn, Card, Notice } from "@/components/dashboard/settingsUi";
import { can, useBilling } from "@/features/billing/useBilling";
import { fetchMailPrefs, saveMailPrefs, type UserMailPrefs } from "./mailPrefsApi";
import { SkeletonText } from "@/components/ui/Skeleton";

const VARS = [
  { key: "{{prenom}}", label: "Prénom" },
  { key: "{{etablissement}}", label: "Établissement" },
  { key: "{{offre}}", label: "Offre" },
  { key: "{{expediteur}}", label: "Expéditeur" },
  { key: "{{extrait}}", label: "Extrait du message" },
];

export function EmployerMailSettings({ premium = false }: { premium?: boolean }) {
  const billing = useBilling();
  const canOwnSmtp = can(billing, "hire.mail.own");
  const [prefs, setPrefs] = useState<UserMailPrefs | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const field = premium ? "ml-field" : "field";
  const input = premium ? "bm-input" : undefined;

  useEffect(() => {
    fetchMailPrefs()
      .then(setPrefs)
      .catch(() => setError("Impossible de charger les e-mails recrutement."));
  }, []);

  if (!prefs) {
    if (premium) {
      return error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : (
        <div className="bo-dash-card st-card"><div className="st-body"><SkeletonText lines={4} label="Chargement des e-mails…" /></div></div>
      );
    }
    return error ? <p className="auth-error">{error}</p> : <SkeletonText lines={4} label="Chargement des e-mails…" />;
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

  const varClass = (key: string) =>
    premium ? (copied === key ? "st-var is-copied" : "st-var") : copied === key ? "settings-var is-copied" : "settings-var";

  return (
    <form className={premium ? "settings-mail st-form" : "settings-mail"} onSubmit={(event) => void onSave(event)}>
      <Card premium={premium} title="E-mails recrutement" icon={Mail} tone="is-rose">
        <Notice premium={premium} flash={flash} error={error} onClose={() => setFlash(null)} />
        <p className={premium ? "ml-hint" : "settings-mail-lead"}>
          Ces textes partent quand vous contactez un candidat ou qu’un message arrive. L’application envoie via Fitness
          Uplink, sauf si vous branchez votre boîte.
        </p>
        <div className={premium ? "st-intro" : "settings-mail-intro"}>
          <div className={premium ? "st-vars" : "settings-vars"}>
            <span>Variables à coller dans le texte</span>
            <div className={premium ? "st-var-row" : "settings-var-row"}>
              {VARS.map((item) => (
                <button key={item.key} type="button" className={varClass(item.key)} onClick={() => void copyVar(item.key)}>
                  <b>{item.label}</b>
                  <code dir="ltr">{item.key}</code>
                </button>
              ))}
            </div>
          </div>
          <div className={field}>
            <label htmlFor="mail-send-mode">Mode d’envoi</label>
            <select
              id="mail-send-mode"
              className={input}
              value={canOwnSmtp ? prefs.sendMode : "PLATFORM"}
              disabled={!canOwnSmtp}
              onChange={(event) => setPrefs({ ...prefs, sendMode: event.target.value })}
            >
              <option value="PLATFORM">L’application envoie (Fitness Uplink)</option>
              {canOwnSmtp ? <option value="OWN">Envoyer avec ma boîte (SMTP)</option> : null}
            </select>
            {canOwnSmtp ? null : (
              <p className={premium ? "ml-hint" : "empty-hint"}>
                SMTP personnel : <a href="/app/profile/plan">offre Business</a>.
              </p>
            )}
          </div>
        </div>
      </Card>

      <div className={premium ? "st-grid2" : "settings-mail-grid"}>
        <Card premium={premium} title="Candidat contacté" icon={UserRoundCheck} tone="is-blue">
          <div className={field}>
            <label htmlFor="mail-contact-subject">Sujet</label>
            <input
              id="mail-contact-subject"
              className={input}
              value={prefs.contactSubject}
              onChange={(event) => setPrefs({ ...prefs, contactSubject: event.target.value })}
            />
          </div>
          <div className={field}>
            <label htmlFor="mail-contact-body">Texte</label>
            <textarea
              id="mail-contact-body"
              className={premium ? "bm-input ml-textarea" : undefined}
              rows={7}
              value={prefs.contactBody}
              onChange={(event) => setPrefs({ ...prefs, contactBody: event.target.value })}
            />
          </div>
        </Card>

        <Card premium={premium} title="Nouveau message" icon={MessageSquare}>
          <div className={field}>
            <label htmlFor="mail-message-subject">Sujet</label>
            <input
              id="mail-message-subject"
              className={input}
              value={prefs.messageSubject}
              onChange={(event) => setPrefs({ ...prefs, messageSubject: event.target.value })}
            />
          </div>
          <div className={field}>
            <label htmlFor="mail-message-body">Texte</label>
            <textarea
              id="mail-message-body"
              className={premium ? "bm-input ml-textarea" : undefined}
              rows={7}
              value={prefs.messageBody}
              onChange={(event) => setPrefs({ ...prefs, messageBody: event.target.value })}
            />
          </div>
        </Card>
      </div>

      {prefs.sendMode === "OWN" && canOwnSmtp ? (
        <Card premium={premium} title="Ma boîte SMTP" icon={Server} tone="is-violet">
          <div className={premium ? "ml-grid" : "mail-fields"}>
            <div className={field}>
              <label htmlFor="mail-from-name">Nom d’expéditeur</label>
              <input
                id="mail-from-name"
                className={input}
                value={prefs.fromName}
                onChange={(event) => setPrefs({ ...prefs, fromName: event.target.value })}
              />
            </div>
            <div className={field}>
              <label htmlFor="mail-from-email">E-mail d’expéditeur</label>
              <input
                id="mail-from-email"
                className={input}
                type="email"
                value={prefs.fromEmail}
                onChange={(event) => setPrefs({ ...prefs, fromEmail: event.target.value })}
              />
            </div>
            <div className={field}>
              <label htmlFor="mail-smtp-host">Serveur SMTP</label>
              <input
                id="mail-smtp-host"
                className={input}
                value={prefs.smtpHost}
                placeholder="smtp.gmail.com"
                onChange={(event) => setPrefs({ ...prefs, smtpHost: event.target.value })}
              />
            </div>
            <div className={field}>
              <label htmlFor="mail-smtp-port">Port</label>
              <input
                id="mail-smtp-port"
                className={input}
                type="number"
                value={prefs.smtpPort ?? 587}
                onChange={(event) => setPrefs({ ...prefs, smtpPort: Number(event.target.value) })}
              />
            </div>
            <div className={field}>
              <label htmlFor="mail-smtp-user">Identifiant SMTP</label>
              <input
                id="mail-smtp-user"
                className={input}
                value={prefs.smtpUsername}
                autoComplete="off"
                onChange={(event) => setPrefs({ ...prefs, smtpUsername: event.target.value })}
              />
            </div>
            <div className={field}>
              <label htmlFor="mail-smtp-password">Mot de passe SMTP</label>
              <input
                id="mail-smtp-password"
                className={input}
                type="password"
                autoComplete="new-password"
                value={password}
                placeholder={prefs.passwordConfigured ? "Laisser vide pour conserver" : "App password"}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>
        </Card>
      ) : null}

      <div className={premium ? "ml-actions st-actions" : "settings-mail-actions"}>
        <Btn premium={premium} variant="primary" type="submit" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer les e-mails"}
        </Btn>
      </div>
    </form>
  );
}
