import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronDown, ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { BrandLogo } from "@/components/brand/BrandLogo";
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
      <a className="bo-nav-link" href={link.to} target="_blank" rel="noreferrer" title={link.label}>
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
      title={link.label}
      className={({ isActive }) => (isActive ? "bo-nav-link is-active" : "bo-nav-link")}
    >
      <Icon className="bo-nav-icon" size={18} strokeWidth={1.8} />
      <span className="bo-nav-label">{link.label}</span>
      {count > 0 ? <span className="bo-nav-count">{count > 99 ? "99+" : count}</span> : null}
    </NavLink>
  );
}

function GroupItem({
  group,
  badges,
  onNavigate,
  collapsed,
  onExpand,
}: {
  group: ShellGroup;
  badges: Record<string, number>;
  onNavigate: () => void;
  collapsed?: boolean;
  onExpand?: () => void;
}) {
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
        title={group.label}
        onClick={() => {
          // Icons-only mode has no room for sub-menus: widen the sidebar first.
          if (collapsed && onExpand) {
            onExpand();
            setOpen(true);
            return;
          }
          setOpen((value) => !value);
        }}
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

export function BoSidebar({
  open,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: {
  open: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const { user } = useAuth();
  const supplier = isSupplierWorkspace(user);
  const unread = useMarketplaceUnread(supplier);
  // notifications live in the top bar only
  const badges = { marketplaceUnread: unread };

  return (
    <aside className={`bo-sidebar${open ? " is-open" : ""}`} aria-label="Navigation principale">
      <div className="bo-brand">
        <BrandLogo to="/app/dashboard" />
        {onToggleCollapse ? (
          <button
            type="button"
            className="bo-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}
            aria-pressed={collapsed}
            title={collapsed ? "Déployer le menu" : "Réduire le menu"}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        ) : null}
        <button type="button" className="bo-sidebar-close" onClick={onClose} aria-label="Fermer le menu">
          <X size={18} />
        </button>
      </div>

      <nav className="bo-nav">
        {shellSectionsFor(user).map((section) => (
          <div className="bo-nav-section" key={section.title}>
            <div className="bo-nav-title">{section.title}</div>
            {section.items.filter((item) => item.kind === "group" || item.to !== "/notifications").map((item) =>
              item.kind === "group" ? (
                <GroupItem key={item.id} group={item} badges={badges} onNavigate={onClose} collapsed={collapsed} onExpand={onToggleCollapse} />
              ) : (
                <LinkItem key={item.to} link={item} badges={badges} onNavigate={onClose} />
              ),
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}
