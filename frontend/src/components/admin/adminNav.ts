export type AdminLink = {
  slug: string;
  title: string;
  path: string;
  icon: string;
  lead: string;
  empty: string;
};

export const ADMIN_MODULES: AdminLink[] = [
  {
    slug: "subscriptions",
    title: "Abonnements",
    path: "/admin/subscriptions",
    icon: "card_membership",
    lead: "Plans, renouvellements et statuts d’abonnement",
    empty: "",
  },
  {
    slug: "recruitment",
    title: "Recrutement",
    path: "/admin/recruitment",
    icon: "work",
    lead: "Offres, pipeline et contrats de Fitness-Hire Elite",
    empty: "Vue d’ensemble du recrutement. Les offres restent gérées par chaque employeur ; les candidats vérifiés sont listés ci-dessous lorsqu’ils existent.",
  },
  {
    slug: "coaching",
    title: "Coaching",
    path: "/admin/coaching",
    icon: "sports",
    lead: "Séances, packs et réservations de coaching privé",
    empty: "Le module coaching n’a pas encore de tables côté API. Aucune réservation n’est affichée.",
  },
  {
    slug: "marketplace",
    title: "Marketplace",
    path: "/admin/marketplace",
    icon: "storefront",
    lead: "Catalogue fournisseurs et demandes de devis",
    empty: "Le marketplace n’est pas encore branché à la base. Aucun produit n’est affiché.",
  },
  {
    slug: "services",
    title: "Services",
    path: "/admin/services",
    icon: "handyman",
    lead: "Prestataires pour salles de sport et organisations",
    empty: "Les services B2B ne sont pas encore en base. Aucune prestation n’est affichée.",
  },
  {
    slug: "formation",
    title: "Formation",
    path: "/admin/formation",
    icon: "school",
    lead: "Académie, programmes et inscriptions",
    empty: "Les formations ne sont pas encore en base. Aucun programme n’est affiché.",
  },
  {
    slug: "events",
    title: "Events",
    path: "/admin/events",
    icon: "event",
    lead: "Événements, compétitions et inscriptions",
    empty: "Les événements ne sont pas encore en base. Aucun event n’est affiché.",
  },
  {
    slug: "news",
    title: "News",
    path: "/admin/news",
    icon: "newspaper",
    lead: "Actualités et publications de la plateforme",
    empty: "Les news ne sont pas encore en base. Aucun article n’est affiché.",
  },
];

export const ADMIN_CONFIG: AdminLink[] = [
  {
    slug: "roles",
    title: "Rôles et permissions",
    path: "/admin/config/roles",
    icon: "admin_panel_settings",
    lead: "Droits de chaque rôle dans l’application",
    empty: "",
  },
  {
    slug: "langues",
    title: "Langues",
    path: "/admin/config/langues",
    icon: "translate",
    lead: "Langues de l’interface et contenus traduits",
    empty: "Aucune table de langues n’existe encore. Le catalogue actuel n’expose pas ce paramètre.",
  },
  {
    slug: "devises",
    title: "Devises",
    path: "/admin/config/devises",
    icon: "payments",
    lead: "Devises acceptées pour salaires, abonnements et paiements",
    empty: "Aucune table de devises n’existe encore.",
  },
  {
    slug: "pays",
    title: "Pays",
    path: "/admin/config/pays",
    icon: "public",
    lead: "Pays disponibles à l’inscription et à la mobilité",
    empty: "Aucun pays n’est configuré.",
  },
  {
    slug: "categories",
    title: "Catégories",
    path: "/admin/config/categories",
    icon: "category",
    lead: "Catégories marketplace, services, formations et news",
    empty: "Aucune table de catégories n’existe encore.",
  },
  {
    slug: "commissions",
    title: "Commissions",
    path: "/admin/config/commissions",
    icon: "percent",
    lead: "Taux de commission par module",
    empty: "Les commissions ne sont pas encore configurées en base.",
  },
  {
    slug: "offres",
    title: "Offres et fonctions",
    path: "/admin/config/offres",
    icon: "sell",
    lead: "Catalogues, prix, TVA, cartes de test et abonnés",
    empty: "",
  },
  {
    slug: "emails",
    title: "E-mails",
    path: "/admin/config/emails",
    icon: "mail",
    lead: "Expéditeur, SMTP et journal des envois",
    empty: "",
  },
  {
    slug: "notifications",
    title: "Notifications",
    path: "/admin/config/notifications",
    icon: "campaign",
    lead: "Règles et canaux de notification plateforme",
    empty: "La configuration des notifications n’est pas encore en base. Les notifications personnelles restent dans Compte.",
  },
  {
    slug: "parametres",
    title: "Paramètres",
    path: "/admin/config/parametres",
    icon: "tune",
    lead: "Paramètres généraux de la plateforme",
    empty: "Aucun paramètre plateforme n’est encore exposé par l’API.",
  },
];

export function adminModuleBySlug(slug: string | undefined) {
  return ADMIN_MODULES.find((item) => item.slug === slug) ?? null;
}

export function adminConfigBySlug(slug: string | undefined) {
  return ADMIN_CONFIG.find((item) => item.slug === slug) ?? null;
}
