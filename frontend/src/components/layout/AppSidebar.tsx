import { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isSuperAdmin, shortNameOf } from "@/features/auth/types";
import { ProfileAvatar } from "@/shared/components/ProfileAvatar";
import { InboxCountBadge, useInboxCount } from "@/features/recruitment/useInboxCount";
import { sidebarGroupsFor } from "./sidebarNav";
import type { SidebarDropdown, SidebarLink } from "./sidebarTypes";

function pathMatches(pathname: string, link: SidebarLink) {
  if (link.end) {
    return pathname === link.to;
  }
  return pathname === link.to || pathname.startsWith(`${link.to}/`);
}

function SidebarLinkItem({ link, inboxCount }: { link: SidebarLink; inboxCount: number }) {
  return (
    <NavLink
      className={({ isActive }) => (isActive ? "sb-link active" : "sb-link")}
      to={link.to}
      end={link.end}
    >
      <span className="material-symbols-outlined sb-icon">{link.icon}</span>
      {link.label}
      {link.to === "/applications" ? <InboxCountBadge count={inboxCount} /> : null}
    </NavLink>
  );
}

function SidebarAccordion({ item, inboxCount }: { item: SidebarDropdown; inboxCount: number }) {
  const { pathname } = useLocation();
  const childActive = item.children.some((child) => pathMatches(pathname, child));
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) {
      setOpen(true);
    }
  }, [childActive, pathname]);

  const panelId = `sb-drop-${item.id}`;

  return (
    <div className={`sb-drop${open ? " open" : ""}${childActive ? " has-active" : ""}`}>
      <button
        type="button"
        className="sb-link sb-drop-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="material-symbols-outlined sb-icon">{item.icon}</span>
        {item.label}
        {inboxCount > 0 && item.children.some((child) => child.to === "/applications") ? (
          <InboxCountBadge count={inboxCount} />
        ) : null}
        <span className="material-symbols-outlined sb-chevron">expand_more</span>
      </button>
      {open ? (
        <div className="sb-drop-list" id={panelId}>
          {item.children.map((child) => (
            <SidebarLinkItem key={child.to} link={child} inboxCount={inboxCount} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const inboxCount = useInboxCount();
  const displayName = user?.displayName || "Profil";
  const admin = isSuperAdmin(user);
  const roleLine = admin
    ? "Administrateur — back-office"
    : [user?.role?.label, user?.country?.name].filter(Boolean).join(" — ") || "Compte";

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="mark" aria-hidden="true">
          F
        </div>
        <div>
          <div className="word">FITNESS UPLINK</div>
          <div className="sb-kicker">Back-office</div>
        </div>
      </div>

      {sidebarGroupsFor(user).map((group) => (
        <div className="sb-group" key={group.title ?? "nav"}>
          {group.title ? <div className="sb-group-title">{group.title}</div> : null}
          {group.items.map((item) =>
            item.kind === "dropdown" ? (
              <SidebarAccordion key={item.id} item={item} inboxCount={inboxCount} />
            ) : (
              <SidebarLinkItem key={item.to} link={item} inboxCount={inboxCount} />
            ),
          )}
        </div>
      ))}

      <div className="sb-foot">
        <div className="sb-user">
          <ProfileAvatar uploadId={user?.avatarUploadId} name={displayName} size={34} />
          <div className="sb-user-copy">
            <div className="name">{user ? shortNameOf(user) : "Profil"}</div>
            <div className="role">{roleLine}</div>
          </div>
        </div>
        <button
          className="sb-logout"
          type="button"
          onClick={() => {
            void logout().then(() => navigate("/login", { replace: true }));
          }}
        >
          <span className="material-symbols-outlined sb-icon">logout</span>
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
