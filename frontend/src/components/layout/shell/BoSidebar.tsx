import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { isSuperAdmin, shortNameOf } from "@/features/auth/types";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { useMarketplaceUnread } from "@/features/marketplace/useMarketplaceUnread";
import { isSupplierWorkspace, shellSectionsFor, type ShellGroup, type ShellLink } from "./shellNav";

function matches(pathname: string, link: ShellLink) {
  if (link.end) return pathname === link.to;
  return pathname === link.to || pathname.startsWith(`${link.to}/`);
}

function LinkItem({ link, badges, onNavigate }: { link: ShellLink; badges: Record<string, number>; onNavigate: () => void }) {
  const Icon = link.icon;
  const count = link.badge ? badges[link.badge] ?? 0 : 0;
  if (link.external) {
    return (
      <a className="bo-nav-link" href={link.to} target="_blank" rel="noreferrer">
        <Icon className="bo-nav-icon" size={18} strokeWidth={1.8} />
        <span className="bo-nav-label">{link.label}</span>
      </a>
    );
  }
  return (
    <NavLink
      to={link.to}
      end={link.end}
      onClick={onNavigate}
      className={({ isActive }) => (isActive ? "bo-nav-link is-active" : "bo-nav-link")}
    >
      <Icon className="bo-nav-icon" size={18} strokeWidth={1.8} />
      <span className="bo-nav-label">{link.label}</span>
      {count > 0 ? <span className="bo-nav-count">{count > 99 ? "99+" : count}</span> : null}
    </NavLink>
  );
}

function GroupItem({ group, badges, onNavigate }: { group: ShellGroup; badges: Record<string, number>; onNavigate: () => void }) {
  const { pathname } = useLocation();
  const childActive = group.children.some((child) => matches(pathname, child));
  const [open, setOpen] = useState(childActive);
  const Icon = group.icon;

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  return (
    <div className={`bo-nav-group${open ? " is-open" : ""}${childActive ? " has-active" : ""}`}>
      <button
        type="button"
        className="bo-nav-link bo-nav-toggle"
        aria-expanded={open}
        aria-controls={`bo-group-${group.id}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon className="bo-nav-icon" size={18} strokeWidth={1.8} />
        <span className="bo-nav-label">{group.label}</span>
        <ChevronDown className="bo-nav-chevron" size={16} strokeWidth={2} />
      </button>
      {open ? (
        <div className="bo-nav-sub" id={`bo-group-${group.id}`}>
          {group.children.map((child) => (
            <LinkItem key={child.to} link={child} badges={badges} onNavigate={onNavigate} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BoSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const supplier = isSupplierWorkspace(user);
  const unread = useMarketplaceUnread(supplier);
  const badges = { marketplaceUnread: unread };
  const displayName = user?.displayName || "Profil";
  const roleLine = isSuperAdmin(user) ? "Super administrateur" : user?.role?.label ?? "Compte";

  return (
    <aside className={`bo-sidebar${open ? " is-open" : ""}`} aria-label="Navigation principale">
      <div className="bo-brand">
        <div className="bo-brand-mark" aria-hidden="true">
          F
        </div>
        <div className="bo-brand-copy">
          <div className="bo-brand-name">Fitness Uplink</div>
          <div className="bo-brand-kicker">{supplier ? "Espace fournisseur" : "Back-office"}</div>
        </div>
        <button type="button" className="bo-sidebar-close" onClick={onClose} aria-label="Fermer le menu">
          <X size={18} />
        </button>
      </div>

      <nav className="bo-nav">
        {shellSectionsFor(user).map((section) => (
          <div className="bo-nav-section" key={section.title}>
            <div className="bo-nav-title">{section.title}</div>
            {section.items.map((item) =>
              item.kind === "group" ? (
                <GroupItem key={item.id} group={item} badges={badges} onNavigate={onClose} />
              ) : (
                <LinkItem key={item.to} link={item} badges={badges} onNavigate={onClose} />
              ),
            )}
          </div>
        ))}
      </nav>

      <div className="bo-sidebar-foot">
        <div className="bo-user">
          <ProfileAvatar uploadId={user?.avatarUploadId} name={displayName} size={36} />
          <div className="bo-user-copy">
            <div className="bo-user-name">{user ? shortNameOf(user) : "Profil"}</div>
            <div className="bo-user-role">{roleLine}</div>
          </div>
          <button
            type="button"
            className="bo-icon-btn"
            aria-label="Déconnexion"
            title="Déconnexion"
            onClick={() => {
              void logout().then(() => navigate("/login", { replace: true }));
            }}
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}
