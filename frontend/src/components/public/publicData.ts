export const PUBLIC_NAV_LINKS = [
  { label: "Fitness-Hire Elite", href: "/fitness-hire-elite", icon: "work", hint: "Recrutement & talents vérifiés" },
  { label: "Coaching privé", href: "/coaching", icon: "sports", hint: "Les coachs les mieux notés" },
  { label: "Académie", href: "/academie", icon: "school", hint: "Formations & certifications" },
  { label: "Marketplace", href: "/marketplace", icon: "storefront", hint: "Matériel & demandes de devis" },
  { label: "News", href: "/news", icon: "newspaper", hint: "Tendances & knowledge center" },
  { label: "Events", href: "/events", icon: "event", hint: "Compétitions, salons, networking" },
  { label: "Tarifs", href: "/tarifs", icon: "sell", hint: "Une offre par rôle" },
] as const;

export const HERO_STATS = [
  { value: "12,400+", label: "Professionnels vérifiés" },
  { value: "34", label: "Pays couverts" },
  { value: "1,200", label: "Recrutements finalisés" },
] as const;

export const PUBLIC_MODULES = [
  { index: "01", title: "Fitness-Hire Elite", description: "Recrutement, offres d'emploi et matching de talents." },
  { index: "02", title: "Coaching privé", description: "Réservation de séances, packs et agenda coach." },
  { index: "03", title: "Services salles de sport", description: "Prestataires : maintenance, juridique, marketing." },
  { index: "04", title: "Marketplace matériel", description: "Catalogue fournisseurs et demandes de devis." },
  { index: "05", title: "Académie & formations", description: "Certifications, workshops et masterclass." },
  { index: "06", title: "News & Knowledge Center", description: "Actualités, tendances et recherches du secteur." },
  { index: "07", title: "Events & compétitions", description: "Salons, conférences et networking." },
] as const;
