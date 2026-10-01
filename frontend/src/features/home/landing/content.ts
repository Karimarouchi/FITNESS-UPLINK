export const LANDING_STATS = [
  { value: "07", label: "Modules connectés" },
  { value: "01", label: "Compte, tout l’écosystème" },
  { value: "∞", label: "Mobilité internationale" },
] as const;

export const LANDING_PILLARS = [
  {
    index: "01",
    icon: "work",
    title: "Recruter",
    text: "Trouver, vérifier et placer des coachs, préparateurs et staff — du studio local au club international.",
  },
  {
    index: "02",
    icon: "fitness_center",
    title: "Entraîner",
    text: "Mettre en relation coachs et clients : agenda, séances, packs et suivi, sur le même compte.",
  },
  {
    index: "03",
    icon: "school",
    title: "Former",
    text: "Certifications, workshops et masterclass pour faire monter le niveau des professionnels.",
  },
  {
    index: "04",
    icon: "inventory_2",
    title: "Équiper",
    text: "Matériel, prestataires et événements : tout ce dont une structure a besoin pour performer.",
  },
] as const;

export const LANDING_AUDIENCES = [
  {
    icon: "badge",
    title: "Professionnels",
    text: "Coach, préparateur, éducateur : un dossier vérifié, visible des employeurs autorisés, des opportunités et des contrats.",
    href: "/signup",
  },
  {
    icon: "apartment",
    title: "Salles & clubs",
    text: "Pipeline, offres, matching et accès aux profils complets. Recrutez plus vite, sans perdre le fil.",
    href: "/fitness-hire-elite",
  },
  {
    icon: "sports",
    title: "Coachs & particuliers",
    text: "Réservez des séances, achetez des packs, suivez l’agenda. Le coaching privé, sans plateforme parallèle.",
    href: "/coaching",
  },
  {
    icon: "storefront",
    title: "Fournisseurs & académies",
    text: "Vitrine matériel, formations, events. Touchez les salles et les pros déjà présents dans le réseau.",
    href: "/marketplace",
  },
] as const;

export const LANDING_MODULES = [
  {
    index: "01",
    icon: "work",
    title: "Fitness-Hire Elite",
    text: "Le cœur du réseau : profils vérifiés, recherche, matching, pipeline et contrats — y compris à l’international.",
    href: "/fitness-hire-elite",
    image: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1600&q=70",
  },
  {
    index: "02",
    icon: "sports",
    title: "Coaching privé",
    text: "Séances, packs, agenda coach et avis après séance réalisée. Le suivi client dans le même écosystème.",
    href: "/coaching",
  },
  {
    index: "03",
    icon: "handyman",
    title: "Services salles",
    text: "Prestataires pour l’exploitation : technique, juridique, marketing, aménagement. Devis ciblés.",
    href: "/services",
  },
  {
    index: "04",
    icon: "storefront",
    title: "Marketplace",
    text: "Musculation, cardio, HYROX, Pilates… catalogues fournisseurs et demandes de devis.",
    href: "/marketplace",
  },
  {
    index: "05",
    icon: "school",
    title: "Académie",
    text: "Formations, certifications, workshops et masterclass. Sessions, capacité, inscription, paiement.",
    href: "/academie",
  },
  {
    index: "06",
    icon: "newspaper",
    title: "News",
    text: "Actualités, tendances, recherches et interviews. Le knowledge center public du secteur.",
    href: "/news",
  },
  {
    index: "07",
    icon: "event",
    title: "Events",
    text: "Compétitions, salons, conférences et networking. Création, inscriptions, participants.",
    href: "/events",
  },
] as const;

export const LANDING_STEPS = [
  {
    index: "01",
    title: "Créez votre dossier",
    text: "Rôle, pays, identité. Photo, pièces et spécialités : un profil qui parle aux pros du métier.",
  },
  {
    index: "02",
    title: "Passez la vérification",
    text: "Identité, diplômes, certifications. Le badge n’est pas décoratif : il ouvre les portes des employeurs.",
  },
  {
    index: "03",
    title: "Activez vos modules",
    text: "Recrutement, coaching, formation, matériel ou events — selon ce que vous êtes, pas un outil de plus.",
  },
  {
    index: "04",
    title: "Performez dans le réseau",
    text: "Candidatures, séances, devis, inscriptions. Un compte, une trace, une industrie connectée.",
  },
] as const;

export const LANDING_TRUST = [
  {
    icon: "verified_user",
    title: "Vérification réelle",
    text: "Les profils complets restent privés. Seuls les employeurs autorisés voient le dossier une fois les pièces contrôlées.",
  },
  {
    icon: "public",
    title: "Pensé pour la mobilité",
    text: "Pays, langues, contrats, relocalisation. Le matching tient compte de là où vous pouvez aller, pas seulement d’où vous êtes.",
  },
  {
    icon: "hub",
    title: "Un seul écosystème",
    text: "Plus de cinq outils collés. Hire, coaching, académie, marketplace et events partagent le même compte et les mêmes règles.",
  },
] as const;

export const LANDING_ROLES = [
  { icon: "sports", label: "Coach", href: "/signup" },
  { icon: "apartment", label: "Salle de sport", href: "/fitness-hire-elite" },
  { icon: "directions_run", label: "Sportif", href: "/coaching" },
  { icon: "storefront", label: "Fournisseur", href: "/marketplace" },
  { icon: "school", label: "Académie", href: "/academie" },
] as const;

export const LANDING_SHORTCUTS = [
  { icon: "space_dashboard", label: "Tableau de bord", href: "/app/dashboard" },
  { icon: "person", label: "Mon profil", href: "/app/profile" },
  { icon: "sports", label: "Coaching", href: "/coaching" },
  { icon: "school", label: "Académie", href: "/academie" },
  { icon: "storefront", label: "Marketplace", href: "/marketplace" },
  { icon: "credit_card", label: "Abonnement", href: "/app/billing" },
] as const;

export const LANDING_FAQ = [
  {
    q: "Fitness Universe, c’est pour qui ?",
    a: "Pour tous ceux qui font l’industrie : professionnels du fitness, salles et clubs, coachs et leurs clients, fournisseurs de matériel, prestataires, académies et organisateurs d’événements.",
  },
  {
    q: "Mon profil complet est-il public ?",
    a: "Non. Les profils complets restent privés : seuls les employeurs autorisés y accèdent, une fois les pièces vérifiées. Le public ne voit qu’un aperçu.",
  },
  {
    q: "Comment fonctionne la vérification ?",
    a: "Vous déposez identité, diplômes et certifications. Notre équipe les contrôle, puis votre badge est mis à jour. Il ouvre l’accès aux employeurs et renforce la confiance des clients.",
  },
  {
    q: "Puis-je utiliser plusieurs modules avec un seul compte ?",
    a: "Oui. Recrutement, coaching, académie, marketplace et events partagent le même compte, le même dossier et les mêmes règles. Vous activez ce dont vous avez besoin.",
  },
  {
    q: "Combien ça coûte ?",
    a: "La création de compte est gratuite. Chaque rôle dispose ensuite d’offres adaptées, consultables sur la page Tarifs, en TND, EUR ou USD.",
  },
] as const;
