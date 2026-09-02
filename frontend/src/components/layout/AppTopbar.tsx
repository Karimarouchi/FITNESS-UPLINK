import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { initialsOf, isBusiness, isCandidate, isSuperAdmin, shortNameOf } from "@/features/auth/types";
import { fetchNotifications } from "@/features/notifications/api";

export function AppTopbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user?.displayName || "Profil";

  useEffect(() => {
    let cancelled = false;
    fetchNotifications()
      .then((items) => {
        if (!cancelled) {
          setUnread(items.some((item) => !item.readAt));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnread(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onPointer(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (isSuperAdmin(user)) {
      navigate(q ? `/users?q=${encodeURIComponent(q)}` : "/users");
      return;
    }
    if (isBusiness(user)) {
      navigate(q ? `/candidates?q=${encodeURIComponent(q)}` : "/candidates");
      return;
    }
    if (isCandidate(user)) {
      navigate(q ? `/app/opportunities?q=${encodeURIComponent(q)}` : "/app/opportunities");
    }
  }

  return (
    <div className="topbar">
      <form className="search" onSubmit={onSearch} role="search">
        <span className="material-symbols-outlined search-icon" aria-hidden="true">
          search
        </span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            isSuperAdmin(user)
              ? "Rechercher un utilisateur…"
              : isBusiness(user)
                ? "Rechercher un talent…"
                : "Rechercher une opportunité, un contrat…"
          }
          aria-label="Recherche"
        />
      </form>
      <div className="top-actions">
        <Link className={unread ? "bell unread" : "bell"} to="/notifications" aria-label="Notifications">
          <span className="material-symbols-outlined" aria-hidden="true">
            notifications
          </span>
        </Link>
        <div className="account-menu" ref={menuRef}>
          <button
            type="button"
            className="sb-avatar sm"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Menu du compte"
            onClick={() => setOpen((value) => !value)}
          >
            {initialsOf(displayName)}
          </button>
          {open ? (
            <div className="account-dropdown" role="menu">
              <div className="who">
                <div className="n">{user ? shortNameOf(user) : "Profil"}</div>
                <div className="r">{user?.role?.label ?? "Compte"}</div>
              </div>
              <Link role="menuitem" to="/app/profile" onClick={() => setOpen(false)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  person
                </span>
                Mon profil
              </Link>
              <Link role="menuitem" to="/app/settings" onClick={() => setOpen(false)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  settings
                </span>
                Paramètres
              </Link>
              <Link role="menuitem" to="/notifications" onClick={() => setOpen(false)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  notifications
                </span>
                Notifications
              </Link>
              <button
                type="button"
                className="danger"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  void logout().then(() => navigate("/login", { replace: true }));
                }}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  logout
                </span>
                Déconnexion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
