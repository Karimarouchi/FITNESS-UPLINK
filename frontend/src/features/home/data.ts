export type NavLinkItem = {
  label: string;
  href: string;
};

export type HeroStat = {
  value: string;
  label: string;
};

export type ModuleItem = {
  index: string;
  title: string;
  description: string;
  href: string;
};

export type PublicPoint = {
  title: string;
  description: string;
};

export type PublicModuleContent = {
  path: string;
  title: string;
  lead: string;
  points: PublicPoint[];
  ctaLabel: string;
};

export type PricingPlan = {
  audience: string;
  cadence: string;
  description: string;
};

export const NAV_LINKS: NavLinkItem[] = [
  { label: "Fitness-Hire Elite", href: "/fitness-hire-elite" },
  { label: "Coaching privé", href: "/coaching" },
  { label: "Académie", href: "/academie" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "News", href: "/news" },
  { label: "Events", href: "/events" },
  { label: "Tarifs", href: "/tarifs" },
];

export const HERO_STATS: HeroStat[] = [
  { value: "14 200", label: "Professionnels vérifiés" },
  { value: "52", label: "Pays couverts" },
  { value: "6 840", label: "Placements réussis" },
];

export const MODULES: ModuleItem[] = [
  {
    index: "01",
    title: "Fitness-Hire Elite",
    description: "Recrutement, offres d'emploi, matching de talents.",
    href: "/fitness-hire-elite",
  },
  {
    index: "02",
    title: "Coaching privé",
    description: "Réservation de séances, packs, agenda coach.",
    href: "/coaching",
  },
  {
    index: "03",
    title: "Services salles de sport",
    description: "Prestataires : maintenance, juridique, marketing.",
    href: "/services",
  },
  {
    index: "04",
    title: "Marketplace matériel",
    description: "Catalogue fournisseurs, demandes de devis.",
    href: "/marketplace",
  },
  {
    index: "05",
    title: "Académie & formations",
    description: "Certifications, workshops, masterclass.",
    href: "/academie",
  },
  {
    index: "06",
    title: "News & Knowledge Center",
    description: "Actualités, tendances, recherches du secteur.",
    href: "/news",
  },
  {
    index: "07",
    title: "Events & compétitions",
    description: "Salons, conférences, networking.",
    href: "/events",
  },
];

export const HIRE_PAGE: PublicModuleContent = {
  path: "/fitness-hire-elite",
  title: "Fitness-Hire Elite",
  lead: "Le cœur de Fitness Universe : trouver, vérifier et recruter des professionnels du fitness, y compris à l’international. Les profils complets restent privés — réservés aux employeurs autorisés.",
  ctaLabel: "Créer un compte employeur",
  points: [
    {
      title: "Profils professionnels",
      description: "Photo, spécialités, expériences, diplômes, certifications, langues, disponibilités, mobilité et type de contrat recherché.",
    },
    {
      title: "Moteur de recherche",
      description: "Filtres combinables : métier, spécialité, pays, ville, expérience, diplôme, langue, disponibilité, salaire, profil vérifié.",
    },
    {
      title: "Offres d’emploi",
      description: "Publication, candidatures, suivi de statut et notifications entre le professionnel et l’employeur.",
    },
    {
      title: "Pipeline de recrutement",
      description: "Nouveau, consulté, favori, contacté, entretien, négociation, contrat, recruté ou archivé — un suivi unique par dossier.",
    },
    {
      title: "Matching",
      description: "Score explicable sur métier, compétences, langues, certifications, localisation, mobilité et disponibilité.",
    },
    {
      title: "Vérification",
      description: "Identité, diplômes et certifications contrôlés. Badge mis à jour selon les pièces validées.",
    },
  ],
};

export const COACHING_PAGE: PublicModuleContent = {
  path: "/coaching",
  title: "Coaching privé",
  lead: "Mise en relation des particuliers avec des coachs : recherche, agenda, réservation, paiement, packs et avis — sur le même compte Fitness Universe.",
  ctaLabel: "Trouver un coach",
  points: [
    {
      title: "Recherche de coachs",
      description: "Consulter le profil, les spécialités, les avis et les disponibilités avant de réserver.",
    },
    {
      title: "Réservation de séances",
      description: "Choix du service et du créneau, paiement, confirmation, blocage du créneau et rappel avant séance.",
    },
    {
      title: "Packs de séances",
      description: "1, 5, 10 séances ou formule mensuelle. Le solde acheté, utilisé, restant et la date d’expiration sont suivis.",
    },
    {
      title: "Agenda coach",
      description: "Services, durée, prix, indisponibilités, réservations et échanges avec les clients.",
    },
    {
      title: "Avis",
      description: "Un avis peut être laissé uniquement après une séance réalisée.",
    },
  ],
};

export const SERVICES_PAGE: PublicModuleContent = {
  path: "/services",
  title: "Services salles de sport",
  lead: "Répertoire de prestataires pour clubs, studios et structures fitness : l’exploitation quotidienne, au-delà du recrutement.",
  ctaLabel: "Demander un devis",
  points: [
    {
      title: "Technique",
      description: "Maintenance, logiciels, sécurité.",
    },
    {
      title: "Opérations",
      description: "Nettoyage, habillement.",
    },
    {
      title: "Business",
      description: "Marketing, comptabilité, juridique.",
    },
    {
      title: "Aménagement & expertise",
      description: "Architecture, nutrition, photographie et audiovisuel.",
    },
    {
      title: "Page prestataire",
      description: "Identité, services, zones couvertes, médias et coordonnées.",
    },
    {
      title: "Demande de devis",
      description: "Formulaire de besoin, pièces jointes, notification du prestataire et historique dans le tableau de bord.",
    },
  ],
};

export const MARKETPLACE_PAGE: PublicModuleContent = {
  path: "/marketplace",
  title: "Marketplace matériel",
  lead: "Vitrines fournisseurs et fiches produits. En phase 1 : catalogue + demande de devis, sans panier multi-vendeurs.",
  ctaLabel: "Parcourir le catalogue",
  points: [
    {
      title: "Catégories",
      description: "Musculation, cardio, HYROX, Pilates, Cross Training, accessoires, récupération, bien-être, pièces et consommables.",
    },
    {
      title: "Fiche produit",
      description: "Nom, marque, photos, vidéos, description, fiche technique, prix indicatif et demande de devis.",
    },
    {
      title: "Vitrine fournisseur",
      description: "Le fournisseur publie son catalogue. L’acheteur envoie une demande de devis ciblée.",
    },
    {
      title: "Évolution",
      description: "Panier, commande, commission et suivi de livraison sont prévus dans une phase transactionnelle ultérieure.",
    },
  ],
};

export const ACADEMY_PAGE: PublicModuleContent = {
  path: "/academie",
  title: "Académie & formations",
  lead: "Formations, certifications, workshops, webinars et masterclass — sessions, capacité, inscription et paiement.",
  ctaLabel: "Voir les formations",
  points: [
    {
      title: "Fiche formation",
      description: "Titre, organisme, formateur, description, date, lieu ou en ligne, langue, capacité, prix et certification.",
    },
    {
      title: "Sessions",
      description: "Calendrier, sessions à venir ou terminées, places restantes et liste des participants.",
    },
    {
      title: "Réservation",
      description: "Inscription, paiement et confirmation sur le même parcours que le reste de la plateforme.",
    },
  ],
};

export const NEWS_PAGE: PublicModuleContent = {
  path: "/news",
  title: "News & Knowledge Center",
  lead: "Espace éditorial public : actualités, innovations, équipements, tendances, recherches, conseils business et interviews — indexable, distinct des profils privés.",
  ctaLabel: "Créer un compte",
  points: [
    {
      title: "Actualités du secteur",
      description: "Innovations, nouveaux équipements et tendances de l’industrie du fitness.",
    },
    {
      title: "Knowledge Center",
      description: "Articles, recherches scientifiques, conseils business et interviews.",
    },
    {
      title: "Publication",
      description: "Catégories et médias gérés depuis le back-office par le responsable contenu.",
    },
  ],
};

export const EVENTS_PAGE: PublicModuleContent = {
  path: "/events",
  title: "Events & compétitions",
  lead: "Compétitions, salons, conférences, lancements de produits, networking et roadshows — création, inscriptions et participants.",
  ctaLabel: "Voir les événements",
  points: [
    {
      title: "Compétitions & salons",
      description: "Annonces publiques des compétitions, exhibitions et salons professionnels.",
    },
    {
      title: "Conférences & networking",
      description: "Formations événementielles, lancements de produits et roadshows.",
    },
    {
      title: "Inscriptions",
      description: "L’organisateur gère les événements, les inscriptions et la liste des participants.",
    },
  ],
};

export const PRICING_PLANS: PricingPlan[] = [
  {
    audience: "Professionnel du fitness",
    cadence: "Mensuel",
    description: "Profil candidat / coach, opportunités, candidatures et coaching si activé.",
  },
  {
    audience: "Particulier",
    cadence: "Mensuel",
    description: "Recherche de coachs, réservations, packs et avis.",
  },
  {
    audience: "Salle de sport — Tunisie",
    cadence: "Mensuel",
    description: "Recrutement, offres d’emploi, pipeline et accès employeur.",
  },
  {
    audience: "Salle de sport — International",
    cadence: "Mensuel",
    description: "Même espace employeur, tarification selon le marché.",
  },
  {
    audience: "Entreprise de services",
    cadence: "Mensuel",
    description: "Page prestataire, offres de services et demandes de devis.",
  },
  {
    audience: "Fournisseur de matériel",
    cadence: "Mensuel",
    description: "Vitrine, catalogue produits et demandes de devis.",
  },
  {
    audience: "Académie / centre de formation",
    cadence: "Mensuel",
    description: "Création de formations, sessions, participants et paiements.",
  },
  {
    audience: "Organisateur d’événements",
    cadence: "Mensuel",
    description: "Création d’événements, inscriptions et participants.",
  },
];
