import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isSuperAdmin, isVerified, shortNameOf } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { fetchNotifications } from "@/features/notifications/api";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";

export function AppTopbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const showUserSearch = location.pathname.startsWith("/users");
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
    navigate(q ? `/users?q=${encodeURIComponent(q)}` : "/users");
  }

  return (
    <div className="topbar">
      {showUserSearch ? (
        <form className="search" onSubmit={onSearch} role="search">
          <span className="material-symbols-outlined search-icon" aria-hidden="true">
            search
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              isSuperAdmin(user) || hasPermission(user, PERMS.ADMIN_USERS)
                ? "Rechercher un utilisateur…"
                : "Rechercher…"
            }
            aria-label="Recherche"
          />
        </form>
      ) : (
        <div />
      )}
      <div className="top-actions">
        <Link className={unread ? "bell unread" : "bell"} to="/notifications" aria-label="Notifications">
          <span className="material-symbols-outlined" aria-hidden="true">
            notifications
          </span>
        </Link>
        <div className="account-menu" ref={menuRef}>
          <button
            type="button"
            className="app-navbar-avatar"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Menu du compte"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="app-avatar-wrap">
              <ProfileAvatar uploadId={user?.avatarUploadId} name={displayName} size={40} />
              {isVerified(user) ? (
                <span className="avatar-verified material-symbols-outlined">verified</span>
              ) : null}
            </span>
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
