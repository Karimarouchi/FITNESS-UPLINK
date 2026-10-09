import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronRight, LogOut, Menu, MessagesSquare, Search, Settings, UserRound } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { hasPermission, isVerified, shortNameOf } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { useNotifications } from "@/features/notifications/useNotifications";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { useMarketplaceUnread } from "@/features/marketplace/useMarketplaceUnread";
import { isSupplierWorkspace, shellSectionsFor } from "./shellNav";

function useCrumbs() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  return useMemo(() => {
    let best: { section: string; label: string; length: number } | null = null;
    for (const section of shellSectionsFor(user)) {
      for (const item of section.items) {
        const links = item.kind === "group" ? item.children.map((child) => ({ ...child, group: item.label })) : [{ ...item, group: null }];
        for (const link of links) {
          if (link.external) continue;
          const hit = link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`);
          if (hit && (!best || link.to.length > best.length)) {
            best = { section: link.group ?? section.title, label: link.label, length: link.to.length };
          }
        }
      }
    }
    return best;
  }, [pathname, user]);
}

export function BoTopbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const crumbs = useCrumbs();
  const supplier = isSupplierWorkspace(user);
  const unreadMessages = useMarketplaceUnread(supplier);
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const displayName = user?.displayName || "Profil";
  const canSearchUsers = hasPermission(user, PERMS.ADMIN_USERS);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
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
    if (supplier) {
      navigate(q ? `/app/marketplace/mine?q=${encodeURIComponent(q)}` : "/app/marketplace/mine");
    } else {
      navigate(q ? `/users?q=${encodeURIComponent(q)}` : "/users");
    }
  }

  return (
    <header className="bo-topbar">
      <button type="button" className="bo-icon-btn bo-menu-btn" onClick={onMenu} aria-label="Ouvrir le menu">
        <Menu size={20} />
      </button>

      <div className="bo-crumbs" aria-label="Fil d'Ariane">
        {crumbs ? (
          <>
            <span className="bo-crumb-muted">{crumbs.section}</span>
            <ChevronRight size={14} className="bo-crumb-sep" />
            <span className="bo-crumb-current">{crumbs.label}</span>
          </>
        ) : (
          <span className="bo-crumb-current">{supplier ? "Espace fournisseur" : "Back-office"}</span>
        )}
      </div>

      {supplier || canSearchUsers ? (
        <form className="bo-search" onSubmit={onSearch} role="search">
          <Search size={16} className="bo-search-icon" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={supplier ? "Rechercher un article…" : "Rechercher un utilisateur…"}
            aria-label="Recherche"
          />
        </form>
      ) : (
        <div className="bo-search-spacer" />
      )}

      <div className="bo-top-actions">
        {supplier ? (
          <Link className="bo-icon-btn" to="/app/marketplace/messages" aria-label="Messages" title="Messages">
            <MessagesSquare size={19} strokeWidth={1.8} />
            {unreadMessages > 0 ? <span className="bo-dot-count">{unreadMessages > 9 ? "9+" : unreadMessages}</span> : null}
          </Link>
        ) : null}
        <Link className="bo-icon-btn" to="/notifications" aria-label="Notifications" title="Notifications">
          <Bell size={19} strokeWidth={1.8} />
          {unreadCount > 0 ? <span className="bo-dot-count">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}
        </Link>
        <div className="bo-account" ref={menuRef}>
          <button
            type="button"
            className="bo-account-btn"
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <ProfileAvatar uploadId={user?.avatarUploadId} name={displayName} size={32} />
            <span className="bo-account-name">{user ? shortNameOf(user) : "Profil"}</span>
          </button>
          {open ? (
            <div className="bo-menu" role="menu">
              <div className="bo-menu-head">
                <div className="bo-menu-name">{displayName}</div>
                <div className="bo-menu-sub">
                  {user?.email}
                  {isVerified(user) ? " · vérifié" : ""}
                </div>
              </div>
              <Link role="menuitem" to="/app/profile" onClick={() => setOpen(false)}>
                <UserRound size={16} />
                {supplier ? "Profil entreprise" : "Mon profil"}
              </Link>
              <Link role="menuitem" to="/app/settings" onClick={() => setOpen(false)}>
                <Settings size={16} />
                Paramètres
              </Link>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                onClick={() => {
                  setOpen(false);
                  void logout().then(() => navigate("/login", { replace: true }));
                }}
              >
                <LogOut size={16} />
                Déconnexion
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
