import {
  Bell,
  Boxes,
  CreditCard,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { AuthUser } from "@/features/auth/types";
import { hasPermission, isBackOfficeUser } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { ADMIN_CONFIG, ADMIN_MODULES } from "@/components/admin/adminNav";
import { lucideFor } from "./navIcons";

export type ShellBadge = "marketplaceUnread";

export type ShellLink = {
  kind?: "link";
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: ShellBadge;
  external?: boolean;
};

export type ShellGroup = {
  kind: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  children: ShellLink[];
};

export type ShellItem = ShellLink | ShellGroup;

export type ShellSection = { title: string; items: ShellItem[] };

export function usesWorkspaceShell(user: AuthUser | null | undefined) {
  return isBackOfficeUser(user) || hasPermission(user, PERMS.MARKETPLACE_MANAGE);
}

export function isSupplierWorkspace(user: AuthUser | null | undefined) {
  return !isBackOfficeUser(user) && hasPermission(user, PERMS.MARKETPLACE_MANAGE);
}

function accountSection(user: AuthUser | null): ShellSection {
  const items: ShellLink[] = [];
  if (hasPermission(user, PERMS.ACCOUNT_PROFILE)) {
    items.push({
      label: isSupplierWorkspace(user) ? "Profil entreprise" : "Mon profil",
      to: "/app/profile",
      icon: UserRound,
    });
  }
  if (hasPermission(user, PERMS.ACCOUNT_NOTIFICATIONS)) {
    items.push({ label: "Notifications", to: "/notifications", icon: Bell });
  }
  if (hasPermission(user, PERMS.ACCOUNT_SETTINGS)) {
    items.push({ label: "Paramètres", to: "/app/settings", icon: Settings });
  }
  items.push({ label: "Abonnement", to: "/app/billing", icon: CreditCard });
  return { title: "Compte", items };
}

function adminSections(user: AuthUser | null): ShellSection[] {
  const manage: ShellItem[] = [];
  if (hasPermission(user, PERMS.ADMIN_USERS)) {
    manage.push({ label: "Utilisateurs", to: "/users", icon: Users });
  }
  if (hasPermission(user, PERMS.ADMIN_VERIFICATIONS)) {
    manage.push({ label: "Vérifications", to: "/admin/verifications", icon: ShieldCheck });
  }
  if (hasPermission(user, PERMS.ADMIN_MODULES)) {
    manage.push({ label: "Marketplace", to: "/admin/marketplace", icon: Store });
  }
  if (hasPermission(user, PERMS.ADMIN_ROLES)) {
    manage.push({ label: "Rôles et permissions", to: "/admin/config/roles", icon: KeyRound });
  }

  const platform: ShellItem[] = [];
  if (hasPermission(user, PERMS.ADMIN_MODULES)) {
    platform.push({
      kind: "group",
      id: "modules",
      label: "Modules",
      icon: Boxes,
      children: ADMIN_MODULES.filter((item) => item.slug !== "marketplace").map((item) => ({
        label: item.title,
        to: item.path,
        icon: lucideFor(item.icon),
      })),
    });
  }
  if (hasPermission(user, PERMS.ADMIN_CONFIG)) {
    platform.push({
      kind: "group",
      id: "config",
      label: "Configuration",
      icon: SlidersHorizontal,
      children: [
        { label: "Vue d'ensemble", to: "/admin/config", icon: lucideFor("grid_view"), end: true },
        ...ADMIN_CONFIG.filter((item) => item.slug !== "roles").map((item) => ({
          label: item.title,
          to: item.path,
          icon: lucideFor(item.icon),
        })),
      ],
    });
  }

  const sections: ShellSection[] = [
    { title: "Pilotage", items: [{ label: "Tableau de bord", to: "/app/dashboard", icon: LayoutDashboard, end: true }] },
  ];
  if (manage.length) sections.push({ title: "Gestion", items: manage });
  if (platform.length) sections.push({ title: "Plateforme", items: platform });
  sections.push(accountSection(user));
  return sections;
}

function supplierSections(user: AuthUser | null): ShellSection[] {
  return [
    { title: "Pilotage", items: [{ label: "Tableau de bord", to: "/app/dashboard", icon: LayoutDashboard, end: true }] },
    {
      title: "Marketplace",
      items: [
        { label: "Mes articles", to: "/app/marketplace/mine", icon: Package },
        { label: "Messages", to: "/app/marketplace/messages", icon: MessagesSquare, badge: "marketplaceUnread" },
        { label: "Voir la vitrine", to: "/marketplace/products", icon: ExternalLink, external: true },
      ],
    },
    accountSection(user),
  ];
}

export function shellSectionsFor(user: AuthUser | null): ShellSection[] {
  return isSupplierWorkspace(user) ? supplierSections(user) : adminSections(user);
}

export function flattenLinks(sections: ShellSection[]): ShellLink[] {
  return sections.flatMap((section) =>
    section.items.flatMap((item) => (item.kind === "group" ? item.children : [item])),
  );
}
