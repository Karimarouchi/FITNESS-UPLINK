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
  icon?: string;
};

export type PublicModuleContent = {
  path: string;
  title: string;
  kicker: string;
  lead: string;
  image: string;
  points: PublicPoint[];
  ctaLabel: string;
  ctaHref?: string;
  highlights?: { icon: string; label: string }[];
  promise?: { title: string; text: string };
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
  kicker: "Recrutement",
  image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=2000&q=70",
  lead: "Le cœur de Fitness Universe : trouver, vérifier et recruter des professionnels du fitness, y compris à l’international. Les profils complets restent privés — réservés aux employeurs autorisés.",
  ctaLabel: "Créer un compte employeur",
  ctaHref: "/signup",
  highlights: [
    { icon: "verified_user", label: "Profils vérifiés" },
    { icon: "public", label: "Recrutement international" },
    { icon: "lock", label: "Dossiers privés" },
  ],
  promise: {
    title: "Recrutez sur preuves, pas sur promesses.",
    text: "Identité, diplômes et certifications contrôlés avant que le profil complet ne soit visible. Vous gagnez des semaines de tri — et vous recrutez en confiance.",
  },
  points: [
    {
      title: "Profils professionnels",
      icon: "badge",
      description: "Photo, spécialités, expériences, diplômes, certifications, langues, disponibilités, mobilité et type de contrat recherché.",
    },
    {
      title: "Moteur de recherche",
      icon: "manage_search",
      description: "Filtres combinables : métier, spécialité, pays, ville, expérience, diplôme, langue, disponibilité, salaire, profil vérifié.",
    },
    {
      title: "Offres d’emploi",
      icon: "work",
      description: "Publication, candidatures, suivi de statut et notifications entre le professionnel et l’employeur.",
    },
    {
      title: "Pipeline de recrutement",
      icon: "view_kanban",
      description: "Nouveau, consulté, favori, contacté, entretien, négociation, contrat, recruté ou archivé — un suivi unique par dossier.",
    },
    {
      title: "Matching",
      icon: "join_inner",
      description: "Score explicable sur métier, compétences, langues, certifications, localisation, mobilité et disponibilité.",
    },
    {
      title: "Vérification",
      icon: "verified_user",
      description: "Identité, diplômes et certifications contrôlés. Badge mis à jour selon les pièces validées.",
    },
  ],
};

export const COACHING_PAGE: PublicModuleContent = {
  path: "/coaching",
  title: "Coaching privé",
  kicker: "Coaching",
  image: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=2000&q=70",
  lead: "Mise en relation des particuliers avec des coachs : recherche, agenda, réservation, paiement, packs et avis — sur le même compte Fitness Universe.",
  ctaLabel: "Trouver un coach",
  ctaHref: "/coaching",
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
  kicker: "Exploitation",
  image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2000&q=70",
  lead: "Répertoire de prestataires pour clubs, studios et structures fitness : l’exploitation quotidienne, au-delà du recrutement.",
  ctaLabel: "Demander un devis",
  ctaHref: "/signup",
  highlights: [
    { icon: "handyman", label: "Prestataires spécialisés" },
    { icon: "request_quote", label: "Devis ciblés" },
    { icon: "history", label: "Historique centralisé" },
  ],
  promise: {
    title: "L’exploitation de votre salle, sans friction.",
    text: "Un besoin, une demande, les bons prestataires notifiés. Toutes vos demandes et réponses restent tracées dans votre tableau de bord.",
  },
  points: [
    {
      title: "Technique",
      icon: "build",
      description: "Maintenance, logiciels, sécurité.",
    },
    {
      title: "Opérations",
      icon: "cleaning_services",
      description: "Nettoyage, habillement.",
    },
    {
      title: "Business",
      icon: "campaign",
      description: "Marketing, comptabilité, juridique.",
    },
    {
      title: "Aménagement & expertise",
      icon: "architecture",
      description: "Architecture, nutrition, photographie et audiovisuel.",
    },
    {
      title: "Page prestataire",
      icon: "storefront",
      description: "Identité, services, zones couvertes, médias et coordonnées.",
    },
    {
      title: "Demande de devis",
      icon: "request_quote",
      description: "Formulaire de besoin, pièces jointes, notification du prestataire et historique dans le tableau de bord.",
    },
  ],
};

export const MARKETPLACE_PAGE: PublicModuleContent = {
  path: "/marketplace",
  title: "Marketplace matériel",
  kicker: "Équipement",
  image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=2000&q=70",
  lead: "Vitrines fournisseurs et fiches produits. En phase 1 : catalogue + demande de devis, sans panier multi-vendeurs.",
  ctaLabel: "Parcourir le catalogue",
  ctaHref: "/marketplace",
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
  kicker: "Formation",
  image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=2000&q=70",
  lead: "Formations, certifications, workshops, webinars et masterclass — sessions, capacité, inscription et paiement.",
  ctaLabel: "Voir les formations",
  ctaHref: "/academie",
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
  kicker: "Éditorial",
  image: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?auto=format&fit=crop&w=2000&q=70",
  lead: "Espace éditorial public : actualités, innovations, équipements, tendances, recherches, conseils business et interviews — indexable, distinct des profils privés.",
  ctaLabel: "Créer un compte",
  ctaHref: "/signup",
  highlights: [
    { icon: "trending_up", label: "Tendances du secteur" },
    { icon: "science", label: "Recherche & études" },
    { icon: "mic", label: "Interviews" },
  ],
  promise: {
    title: "Le savoir du secteur, au même endroit.",
    text: "Innovations, études et conseils business sélectionnés pour les professionnels du fitness — pour décider plus vite et mieux.",
  },
  points: [
    {
      title: "Actualités du secteur",
      icon: "newspaper",
      description: "Innovations, nouveaux équipements et tendances de l’industrie du fitness.",
    },
    {
      title: "Knowledge Center",
      icon: "menu_book",
      description: "Articles, recherches scientifiques, conseils business et interviews.",
    },
    {
      title: "Publication",
      icon: "edit_note",
      description: "Catégories et médias gérés depuis le back-office par le responsable contenu.",
    },
  ],
};

export const EVENTS_PAGE: PublicModuleContent = {
  path: "/events",
  title: "Events & compétitions",
  kicker: "Compétition",
  image: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=2000&q=70",
  lead: "Compétitions, salons, conférences, lancements de produits, networking et roadshows — création, inscriptions et participants.",
  ctaLabel: "Voir les événements",
  ctaHref: "/signup",
  highlights: [
    { icon: "emoji_events", label: "Compétitions" },
    { icon: "storefront", label: "Salons pros" },
    { icon: "groups", label: "Networking" },
  ],
  promise: {
    title: "Là où l’industrie se rencontre.",
    text: "Compétitions, salons et conférences : découvrez, inscrivez-vous et retrouvez les participants — sur votre compte Fitness Universe.",
  },
  points: [
    {
      title: "Compétitions & salons",
      icon: "emoji_events",
      description: "Annonces publiques des compétitions, exhibitions et salons professionnels.",
    },
    {
      title: "Conférences & networking",
      icon: "groups",
      description: "Formations événementielles, lancements de produits et roadshows.",
    },
    {
      title: "Inscriptions",
      icon: "how_to_reg",
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
