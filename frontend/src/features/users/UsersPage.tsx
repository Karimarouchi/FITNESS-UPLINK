import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { fetchUsers } from "./api";
import { isSuperAdmin, type AuthUser } from "@/features/auth/types";
import { useAuth } from "@/features/auth/AuthContext";

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSuperAdmin(user)) {
      return;
    }
    fetchUsers()
      .then(setUsers)
      .catch(() => setError("Unable to load users."));
  }, [user]);

  if (!isSuperAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return (
    <section className="max-w-xl">
      <h1 className="font-display-lg-mobile text-primary mb-4">Users</h1>
      {error ? <p className="text-error">{error}</p> : null}
      <ul className="space-y-2 text-on-surface-variant">
        {users.map((item) => (
          <li key={item.id}>
            {item.displayName} — {item.email} ({item.role?.label ?? "Pending"})
          </li>
        ))}
      </ul>
    </section>
  );
}
