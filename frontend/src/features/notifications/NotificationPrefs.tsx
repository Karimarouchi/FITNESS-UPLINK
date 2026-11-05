import { useEffect, useState, type FormEvent } from "react";
import { Bell } from "lucide-react";
import { Btn, Card, Notice } from "@/components/dashboard/settingsUi";
import { fetchNotifyPrefs, saveNotifyPrefs, type UserNotifyPrefs } from "./notifyPrefsApi";
import { SkeletonRows } from "@/components/ui/Skeleton";

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

export function NotificationPrefs({ premium = false }: { premium?: boolean }) {
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
    if (premium) {
      return error ? (
        <p className="bo-dash-error" role="alert">
          {error}
        </p>
      ) : (
        <div className="bo-dash-card st-card"><div className="st-body"><SkeletonRows rows={4} label="Chargement des notifications…" /></div></div>
      );
    }
    return error ? <p className="auth-error">{error}</p> : <SkeletonRows rows={4} label="Chargement des notifications…" />;
  }

  return (
    <form onSubmit={(event) => void onSave(event)}>
      <Card premium={premium} title="Notifications" icon={Bell}>
        <Notice premium={premium} flash={flash} error={error} onClose={() => setFlash(null)} />
        <p className={premium ? "ml-hint" : "settings-mail-lead"}>
          Choisissez la cloche in-app et l’e-mail pour chaque type d’alerte.
        </p>
        <div className={premium ? "bm-table-wrap st-table" : undefined}>
          <table className={premium ? "bm-table" : "notify-prefs"}>
            <thead>
              <tr>
                <th scope="col">Catégorie</th>
                <th scope="col">In-app</th>
                <th scope="col">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label}>
                  <td className={premium ? "st-cat" : undefined}>
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
        </div>
        <div className={premium ? "ml-actions st-actions" : "settings-mail-actions"}>
          <Btn premium={premium} variant="primary" type="submit" disabled={busy}>
            {busy ? "Enregistrement…" : "Enregistrer"}
          </Btn>
        </div>
      </Card>
    </form>
  );
}
