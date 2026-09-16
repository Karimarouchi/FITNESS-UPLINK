import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { fetchNotifyPrefs, saveNotifyPrefs, type UserNotifyPrefs } from "./notifyPrefsApi";

const ROWS: {
  inApp: keyof UserNotifyPrefs;
  email: keyof UserNotifyPrefs;
  label: string;
  hint: string;
  emailOff?: boolean;
}[] = [
  { inApp: "inAppContact", email: "emailContact", label: "Contact et pipeline", hint: "Contacté, entretien, autres étapes" },
  { inApp: "inAppMessage", email: "emailMessage", label: "Messages", hint: "Nouveau message dans une discussion" },
  { inApp: "inAppApplication", email: "emailApplication", label: "Candidatures", hint: "Quelqu’un postule à une offre", emailOff: true },
  { inApp: "inAppDocument", email: "emailDocument", label: "Documents", hint: "Pièce validée ou refusée" },
  { inApp: "inAppContract", email: "emailContract", label: "Contrats", hint: "Envoi, signature, finalisation" },
];

export function NotificationPrefs() {
  const [prefs, setPrefs] = useState<UserNotifyPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchNotifyPrefs()
      .then(setPrefs)
      .catch(() => setError("Impossible de charger les notifications."));
  }, []);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!prefs) {
      return;
    }
    setBusy(true);
    try {
      setPrefs(await saveNotifyPrefs(prefs));
      setFlash("Préférences enregistrées.");
      setError(null);
    } catch {
      setError("Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (!prefs) {
    return error ? <p className="auth-error">{error}</p> : <p className="empty-hint">Chargement des notifications…</p>;
  }

  return (
    <form onSubmit={(event) => void onSave(event)}>
      <Panel title="Notifications" body>
        {flash ? <p className="fu-flash">{flash}</p> : null}
        {error ? <p className="auth-error">{error}</p> : null}
        <p className="settings-mail-lead">Choisissez la cloche in-app et l’e-mail pour chaque type d’alerte.</p>
        <table className="notify-prefs">
          <thead>
            <tr>
              <th>Catégorie</th>
              <th>In-app</th>
              <th>E-mail</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.label}>
                <td>
                  <strong>{row.label}</strong>
                  <span>{row.hint}</span>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={prefs[row.inApp]}
                    onChange={(event) => setPrefs({ ...prefs, [row.inApp]: event.target.checked })}
                    aria-label={`${row.label} in-app`}
                  />
                </td>
                <td>
                  {row.emailOff ? (
                    <span className="notify-prefs-na">Cloche seulement</span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={prefs[row.email]}
                      onChange={(event) => setPrefs({ ...prefs, [row.email]: event.target.checked })}
                      aria-label={`${row.label} e-mail`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="settings-mail-actions">
          <Button variant="primary" type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </div>
      </Panel>
    </form>
  );
}
