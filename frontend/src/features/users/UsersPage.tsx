import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { Panel } from "@/components/ui/Panel";
import { StatusPill } from "@/components/ui/StatusPill";
import { useAuth } from "@/features/auth/AuthContext";
import {
  initialsOf,
  isSuperAdmin,
  isVerified,
  type AuthUser,
} from "@/features/auth/types";
import { formatPipelineDate } from "@/features/recruitment/api";
import { fetchUsers } from "./api";

function statusTone(user: AuthUser) {
  if (isVerified(user)) {
    return "verified" as const;
  }
  if (user.verificationStatus === "rejected") {
    return "refused" as const;
  }
  return "pending" as const;
}

function statusLabel(user: AuthUser) {
  if (isVerified(user)) {
    return "Vérifié";
  }
  if (user.verificationStatus === "rejected") {
    return "Refusé";
  }
  return "En attente";
}

export function UsersPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin(user)) {
      return;
    }
    fetchUsers()
      .then(setUsers)
      .catch(() => setError("Impossible de charger les utilisateurs."));
  }, [user]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return users;
    }
    return users.filter((item) =>
      [item.displayName, item.email, item.role?.label, item.country?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [users, query]);

  if (!isSuperAdmin(user)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return (
    <section>
      <div className="page-head">
        <div>
          <h1>Utilisateurs</h1>
          <div className="sub">{users.length} compte{users.length > 1 ? "s" : ""} inscrit{users.length > 1 ? "s" : ""} sur la plateforme</div>
        </div>
        <form
          className="search"
          onSubmit={(event) => event.preventDefault()}
          role="search"
        >
          🔍
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un nom, un e-mail, un rôle…"
          />
        </form>
      </div>

      <Panel>
        {error ? <p className="empty-hint">{error}</p> : null}
        {!error && filtered.length === 0 ? (
          <p className="empty-hint">{query ? "Aucun utilisateur ne correspond à cette recherche." : "Aucun utilisateur pour le moment."}</p>
        ) : null}
        {filtered.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>Nom</th>
                <th>E-mail</th>
                <th>Rôle</th>
                <th>Pays</th>
                <th>Statut</th>
                <th>Inscrit le</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="user-cell">
                      <span className="sb-avatar sm">{initialsOf(item.displayName || item.email)}</span>
                      <span>{item.displayName || "—"}</span>
                    </div>
                  </td>
                  <td>{item.email}</td>
                  <td>{item.role?.label ?? "En attente"}</td>
                  <td>{item.country ? `${item.country.flagEmoji} ${item.country.name}` : "—"}</td>
                  <td>
                    <StatusPill tone={statusTone(item)}>{statusLabel(item)}</StatusPill>
                  </td>
                  <td>{item.createdAt ? formatPipelineDate(item.createdAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </Panel>
    </section>
  );
}
