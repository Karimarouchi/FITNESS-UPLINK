import type { AuthUser } from "@/features/auth/types";
import { hasPermission, isBackOfficeUser, isSuperAdmin } from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import type { SidebarGroup, SidebarItem, SidebarLink } from "./sidebarTypes";
import { ADMIN_CONFIG, ADMIN_MODULES } from "@/components/admin/adminNav";

function toLink(item: { title: string; path: string; icon: string }): SidebarLink {
  return { label: item.title, to: item.path, icon: item.icon };
}

function accountGroup(user: AuthUser | null): SidebarItem {
  const children: SidebarLink[] = [];
  if (hasPermission(user, PERMS.ACCOUNT_NOTIFICATIONS)) {
    children.push({ label: "Notifications", to: "/notifications", icon: "notifications" });
  }
  if (hasPermission(user, PERMS.ACCOUNT_SETTINGS)) {
    children.push({ label: "Paramètres", to: "/app/settings", icon: "settings" });
  }
  children.push({ label: "Abonnement", to: "/app/billing", icon: "credit_card" });
  if (children.length === 0) {
    return { label: "Paramètres", to: "/app/settings", icon: "settings" };
  }
  return {
    kind: "dropdown",
    id: "account",
    label: "Compte",
    icon: "manage_accounts",
    children,
  };
}

export function sidebarGroupsFor(user: AuthUser | null): SidebarGroup[] {
  const dashboard: SidebarLink = {
    label: isSuperAdmin(user) ? "Dashboard" : "Tableau de bord",
    to: "/app/dashboard",
    icon: "dashboard",
    end: true,
  };

  if (isBackOfficeUser(user)) {
    const items: SidebarItem[] = [dashboard];
    if (hasPermission(user, PERMS.ADMIN_USERS)) {
      items.push({ label: "Utilisateurs", to: "/users", icon: "group" });
    }
    if (hasPermission(user, PERMS.ADMIN_VERIFICATIONS)) {
      items.push({ label: "Vérifications", to: "/admin/verifications", icon: "verified_user" });
    }
    if (hasPermission(user, PERMS.ADMIN_ROLES)) {
      items.push({ label: "Rôles et permissions", to: "/admin/config/roles", icon: "admin_panel_settings" });
    }
    if (hasPermission(user, PERMS.ADMIN_MODULES)) {
      items.push({
        kind: "dropdown",
        id: "modules",
        label: "Modules",
        icon: "apps",
        children: ADMIN_MODULES.map(toLink),
      });
    }
    if (hasPermission(user, PERMS.ADMIN_CONFIG)) {
      items.push({
        kind: "dropdown",
        id: "config",
        label: "Configuration",
        icon: "tune",
        children: [
          { label: "Vue d'ensemble", to: "/admin/config", icon: "grid_view", end: true },
          ...ADMIN_CONFIG.map(toLink),
        ],
      });
    }
    if (hasPermission(user, PERMS.ACCOUNT_PROFILE)) {
      items.push({ label: "Mon profil", to: "/app/profile", icon: "person" });
    }
    items.push(accountGroup(user));
    return [{ items }];
  }

  const items: SidebarItem[] = [dashboard];
  if (hasPermission(user, PERMS.ACCOUNT_PROFILE) && !hasPermission(user, PERMS.HIRE_PROFILE)) {
    items.push({
      label: hasPermission(user, PERMS.HIRE_SEARCH) ? "Profil organisation" : "Profil",
      to: "/app/profile",
      icon: hasPermission(user, PERMS.HIRE_SEARCH) ? "apartment" : "person",
    });
  }

  if (hasPermission(user, PERMS.HIRE_PROFILE)) {
    items.push({ label: "Profil professionnel", to: "/app/profile", icon: "badge" });
  }

  const hireApply: SidebarLink[] = [];
  if (hasPermission(user, PERMS.HIRE_APPLY)) {
    hireApply.push({ label: "Opportunités", to: "/app/opportunities", icon: "travel_explore" });
  }
  if (hasPermission(user, PERMS.HIRE_APPLICATIONS)) {
    hireApply.push({ label: "Candidatures", to: "/app/applications", icon: "assignment" });
  }
  if (hasPermission(user, PERMS.HIRE_CONTRACTS_CANDIDATE) || hasPermission(user, PERMS.HIRE_CONTRACTS_EMPLOYER)) {
    hireApply.push({ label: "Contrats", to: "/contracts", icon: "contract" });
  }
  const hire: SidebarLink[] = [];
  if (hasPermission(user, PERMS.HIRE_SEARCH)) {
    hire.push({ label: "Recherche de talents", to: "/candidates", icon: "groups" });
  }
  if (hasPermission(user, PERMS.HIRE_FAVORITES)) {
    hire.push({ label: "Favoris", to: "/favorites", icon: "favorite" });
  }
  if (hasPermission(user, PERMS.HIRE_PIPELINE)) {
    hire.push({ label: "Candidatures", to: "/applications", icon: "inbox" });
  }
  if (hasPermission(user, PERMS.HIRE_JOBS)) {
    hire.push({ label: "Offres d'emploi", to: "/job-offers", icon: "badge" });
  }
  hireApply.forEach((link) => {
    if (!hire.some((existing) => existing.to === link.to)) {
      hire.push(
        link.to === "/app/applications" && hire.some((existing) => existing.to === "/applications")
          ? { ...link, label: "Mes candidatures" }
          : link,
      );
    }
  });
  if (hire.length) {
    items.push({ kind: "dropdown", id: "recruitment", label: "Recrutement", icon: "work", children: hire });
  }

  if (hasPermission(user, PERMS.COACHING_MANAGE)) {
    items.push({
      kind: "dropdown",
      id: "coaching",
      label: "Coaching",
      icon: "sports",
      children: [
        { label: "Agenda & réservations", to: "/app/coaching/agenda", icon: "event_available" },
        { label: "Mes services", to: "/app/coaching/services", icon: "fitness_center" },
        { label: "Mes packs", to: "/app/coaching/packs", icon: "confirmation_number" },
      ],
    });
  } else if (hasPermission(user, PERMS.COACHING_DISCOVER)) {
    items.push({
      kind: "dropdown",
      id: "coaching",
      label: "Coaching",
      icon: "sports",
      children: [
        { label: "Trouver un coach", to: "/coaches", icon: "search" },
        { label: "Mes réservations", to: "/app/coaching/bookings", icon: "event_available" },
        { label: "Mes packs", to: "/app/coaching/packs", icon: "confirmation_number" },
      ],
    });
  }
  if (hasPermission(user, PERMS.ACADEMY_MANAGE)) {
    items.push({
      kind: "dropdown",
      id: "academy",
      label: "Académie",
      icon: "school",
      children: [
        { label: "Mes formations", to: "/app/academy/formations", icon: "menu_book" },
      ],
    });
  } else if (hasPermission(user, PERMS.ACADEMY_BROWSE)) {
    items.push({
      kind: "dropdown",
      id: "academy",
      label: "Académie",
      icon: "school",
      children: [
        { label: "Catalogue des formations", to: "/academie", icon: "search" },
        { label: "Mes inscriptions", to: "/app/academy/registrations", icon: "event_available" },
      ],
    });
  }
  if (hasPermission(user, PERMS.MARKETPLACE_MANAGE)) {
    items.push({
      kind: "dropdown",
      id: "marketplace",
      label: "Marketplace",
      icon: "storefront",
      children: [
        { label: "Mes produits", to: "/app/marketplace/mine", icon: "inventory_2" },
        { label: "Demandes de devis", to: "/app/marketplace/requests", icon: "inbox" },
      ],
    });
  } else if (hasPermission(user, PERMS.MARKETPLACE_BROWSE)) {
    items.push({ label: "Marketplace", to: "/marketplace/products", icon: "storefront" });
  }
  if (hasPermission(user, PERMS.SERVICES_MANAGE)) {
    items.push({
      kind: "dropdown",
      id: "services",
      label: "Services",
      icon: "handyman",
      children: [
        { label: "Mes services", to: "/app/services/mine", icon: "build" },
        { label: "Demandes reçues", to: "/app/services/requests", icon: "inbox" },
      ],
    });
  } else if (hasPermission(user, PERMS.SERVICES_BROWSE)) {
    items.push({
      kind: "dropdown",
      id: "services",
      label: "Services",
      icon: "handyman",
      children: [
        { label: "Trouver un prestataire", to: "/services/providers", icon: "search" },
        { label: "Mes demandes", to: "/app/services/requests", icon: "inbox" },
      ],
    });
  }
  if (hasPermission(user, PERMS.EVENTS_MANAGE) || hasPermission(user, PERMS.EVENTS_BROWSE)) {
    items.push({ label: "Événements", to: "/app/events", icon: "event" });
  }
  if (hasPermission(user, PERMS.CONTENT_PUBLISH) || hasPermission(user, PERMS.CONTENT_BROWSE)) {
    items.push({ label: "Contenus", to: "/app/content", icon: "edit_note" });
  }

  items.push(accountGroup(user));
  return [{ items }];
}
