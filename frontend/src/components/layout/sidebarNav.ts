import type { AuthUser } from "@/features/auth/types";
import { isBusiness, isCandidate, isSuperAdmin } from "@/features/auth/types";
import type { SidebarGroup, SidebarLink } from "./sidebarTypes";
import { ADMIN_CONFIG, ADMIN_MODULES } from "@/components/admin/adminNav";

function toLink(item: { title: string; path: string; icon: string }): SidebarLink {
  return { label: item.title, to: item.path, icon: item.icon };
}

export function sidebarGroupsFor(user: AuthUser | null): SidebarGroup[] {
  const dashboard: SidebarLink = {
    label: isSuperAdmin(user) ? "Dashboard" : "Tableau de bord",
    to: "/app/dashboard",
    icon: "dashboard",
    end: true,
  };

  if (isSuperAdmin(user)) {
    return [
      {
        items: [
          dashboard,
          { label: "Utilisateurs", to: "/users", icon: "group" },
          { label: "Vérifications", to: "/admin/verifications", icon: "verified_user" },
          {
            kind: "dropdown",
            id: "modules",
            label: "Modules",
            icon: "apps",
            children: ADMIN_MODULES.map(toLink),
          },
          {
            kind: "dropdown",
            id: "config",
            label: "Configuration",
            icon: "tune",
            children: [
              { label: "Vue d'ensemble", to: "/admin/config", icon: "grid_view", end: true },
              ...ADMIN_CONFIG.map(toLink),
            ],
          },
          { label: "Mon profil", to: "/app/profile", icon: "person" },
          {
            kind: "dropdown",
            id: "account",
            label: "Compte",
            icon: "manage_accounts",
            children: [
              { label: "Notifications", to: "/notifications", icon: "notifications" },
              { label: "Paramètres", to: "/app/settings", icon: "settings" },
            ],
          },
        ],
      },
    ];
  }

  if (isBusiness(user)) {
    return [
      {
        items: [
          dashboard,
          { label: "Profil organisation", to: "/app/profile", icon: "apartment" },
          {
            kind: "dropdown",
            id: "recruitment",
            label: "Recrutement",
            icon: "work",
            children: [
              { label: "Recherche de talents", to: "/candidates", icon: "groups" },
              { label: "Favoris", to: "/favorites", icon: "favorite" },
              { label: "Pipeline", to: "/pipeline", icon: "view_kanban" },
              { label: "Offres d'emploi", to: "/job-offers", icon: "badge" },
              { label: "Contrats", to: "/contracts", icon: "contract" },
            ],
          },
          {
            kind: "dropdown",
            id: "account",
            label: "Compte",
            icon: "manage_accounts",
            children: [
              { label: "Notifications", to: "/notifications", icon: "notifications" },
              { label: "Paramètres", to: "/app/settings", icon: "settings" },
            ],
          },
        ],
      },
    ];
  }

  if (isCandidate(user)) {
    return [
      {
        items: [
          dashboard,
          {
            kind: "dropdown",
            id: "profile",
            label: "Mon profil",
            icon: "badge",
            children: [
              { label: "Profil professionnel", to: "/app/profile", icon: "badge" },
              { label: "CV", to: "/app/cv", icon: "description" },
              { label: "Diplômes & certifications", to: "/app/certifications", icon: "workspace_premium" },
              { label: "Vidéos de présentation", to: "/app/videos", icon: "videocam" },
              { label: "Disponibilités", to: "/app/availability", icon: "calendar_month" },
            ],
          },
          {
            kind: "dropdown",
            id: "recruitment",
            label: "Recrutement",
            icon: "work",
            children: [
              { label: "Opportunités", to: "/app/opportunities", icon: "travel_explore" },
              { label: "Candidatures", to: "/app/applications", icon: "assignment" },
              { label: "Contrats", to: "/contracts", icon: "contract" },
            ],
          },
          {
            kind: "dropdown",
            id: "account",
            label: "Compte",
            icon: "manage_accounts",
            children: [
              { label: "Notifications", to: "/notifications", icon: "notifications" },
              { label: "Paramètres", to: "/app/settings", icon: "settings" },
            ],
          },
        ],
      },
    ];
  }

  return [
    {
      items: [
        dashboard,
        { label: "Profil", to: "/app/profile", icon: "person" },
        {
          kind: "dropdown",
          id: "account",
          label: "Compte",
          icon: "manage_accounts",
          children: [
            { label: "Notifications", to: "/notifications", icon: "notifications" },
            { label: "Paramètres", to: "/app/settings", icon: "settings" },
          ],
        },
      ],
    },
  ];
}
