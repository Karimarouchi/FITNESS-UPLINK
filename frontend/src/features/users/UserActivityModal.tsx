import type { ReactNode } from "react";
import {
  Ban,
  BadgeCheck,
  CreditCard,
  Eye,
  EyeOff,
  History,
  Lock,
  LogIn,
  ShieldAlert,
  ShieldX,
  Trash2,
  Unlock,
} from "lucide-react";
import type { AuthUser } from "@/features/auth/types";
import type { AuditLogEntry } from "./api";
import { UsersModal } from "./UsersModal";

type Tone = "ok" | "rose" | "blue" | "orange" | "neutral";

/** Icon and colour of an audit event, from the action codes the API really sends. */
function visual(action: string): { icon: ReactNode; tone: Tone } {
  switch (action) {
    case "LOGIN_SUCCESS":
      return { icon: <LogIn size={17} />, tone: "ok" };
    case "LOGIN_FAILED":
      return { icon: <ShieldAlert size={17} />, tone: "rose" };
    case "ACCOUNT_LOCKED":
      return { icon: <Lock size={17} />, tone: "rose" };
    case "ACCOUNT_BLOCKED":
      return { icon: <Ban size={17} />, tone: "rose" };
    case "ACCOUNT_UNBLOCKED":
      return { icon: <Unlock size={17} />, tone: "ok" };
    case "ACCOUNT_DELETED":
      return { icon: <Trash2 size={17} />, tone: "rose" };
    case "VERIFICATION_ACCEPTED":
      return { icon: <BadgeCheck size={17} />, tone: "blue" };
    case "VERIFICATION_REJECTED":
      return { icon: <ShieldX size={17} />, tone: "rose" };
    case "MARKETPLACE_PRODUCT_HIDDEN":
      return { icon: <EyeOff size={17} />, tone: "orange" };
    case "MARKETPLACE_PRODUCT_RESTORED":
      return { icon: <Eye size={17} />, tone: "ok" };
    default:
      return action.startsWith("SUBSCRIPTION_")
        ? { icon: <CreditCard size={17} />, tone: "orange" }
        : { icon: <History size={17} />, tone: "neutral" };
  }
}

function when(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} · ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function UserActivityModal({
  user,
  entries,
  loading,
  error,
  onClose,
}: {
  user: AuthUser;
  entries: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  return (
    <UsersModal
      title="Activité du compte"
      subtitle={user.displayName || user.email}
      onClose={onClose}
      footer={
        <button type="button" className="um-btn is-primary" onClick={onClose} data-autofocus>
          Fermer
        </button>
      }
    >
      {loading ? (
        <div className="um-skeletons" aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <div key={key} className="bo-skeleton um-skeleton" />
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="um-error" role="alert">
          {error}
        </p>
      ) : null}

      {!loading && !error && entries.length === 0 ? (
        <div className="um-empty">
          <History size={22} aria-hidden="true" />
          <p>Aucune activité enregistrée pour ce compte.</p>
        </div>
      ) : null}

      {entries.length > 0 ? (
        <ol className="um-timeline" aria-label="Historique du compte" tabIndex={0}>
          {entries.map((entry) => {
            const look = visual(entry.action);
            return (
              <li key={entry.id}>
                <span className={`um-dot is-${look.tone}`} aria-hidden="true">
                  {look.icon}
                </span>
                <div className="um-event">
                  <strong>{entry.label}</strong>
                  <time dateTime={entry.createdAt}>{when(entry.createdAt)}</time>
                  {entry.actorLabel || entry.metadata ? (
                    <small>
                      {entry.actorLabel ? `Par ${entry.actorLabel}` : ""}
                      {entry.actorLabel && entry.metadata ? " · " : ""}
                      {entry.metadata ?? ""}
                    </small>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
    </UsersModal>
  );
}
