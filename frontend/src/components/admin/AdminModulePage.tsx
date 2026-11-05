import { Link, Navigate, useParams } from "react-router-dom";
import { BookOpen, CalendarDays, FileText, GraduationCap, Megaphone, Newspaper, PenLine, Ticket, Users, Wrench } from "lucide-react";
import type { ComponentType } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { PERMS } from "@/features/auth/permissions";
import { hasPermission } from "@/features/auth/types";
import { AdminBillingPage } from "@/features/admin/pages/AdminBillingPage";
import { AdminCoachingPage } from "@/features/admin/pages/AdminCoachingPage";
import { AdminRecruitmentPage } from "@/features/admin/pages/AdminRecruitmentPage";
import { ModuleState } from "./ModuleState";
import { adminModuleBySlug } from "./adminNav";
import "@/shared/styles/backoffice-users.css";
import "@/shared/styles/backoffice-modules.css";

type IconType = ComponentType<{ size?: number }>;

type Placeholder = {
  title: string;
  subtitle: string;
  icons: [IconType, IconType, IconType];
  stateTitle: string;
  description: string;
  chip: string;
  notes?: string[];
};

/** Modules without an administrator API: the copy only states what the code really offers today. */
const PLACEHOLDERS: Record<string, Placeholder> = {
  services: {
    title: "Services",
    subtitle: "Prestations et services B2B du réseau Uplink Fitness.",
    icons: [Users, Wrench, FileText],
    stateTitle: "Gestion des services",
    description:
      "Les prestataires publient leurs prestations et reçoivent les demandes de devis depuis leur propre espace. Aucune vue d’administration de ces prestations ni de ces devis n’est disponible pour le moment.",
    chip: "Vue admin indisponible",
    notes: ["Aucune prestation n’est affichée dans cet espace : l’administration ne dispose pas encore d’API de consultation."],
  },
  formation: {
    title: "Formation",
    subtitle: "Formations, sessions et parcours d’apprentissage.",
    icons: [BookOpen, GraduationCap, CalendarDays],
    stateTitle: "Gestion des formations",
    description:
      "La gestion des formations n’est pas encore disponible dans cet espace administrateur. Les académies créent et gèrent leurs formations et leurs sessions depuis leur propre espace.",
    chip: "Vue admin indisponible",
  },
  events: {
    title: "Events",
    subtitle: "Événements et activités de la communauté Uplink Fitness.",
    icons: [Ticket, CalendarDays, Users],
    stateTitle: "Module en préparation",
    description:
      "Le module Événements n’est pas encore ouvert. Aucune fonction de gestion n’est disponible dans cet espace pour le moment.",
    chip: "En préparation",
  },
  news: {
    title: "News",
    subtitle: "Actualités et contenus éditoriaux Uplink Fitness.",
    icons: [PenLine, Newspaper, Megaphone],
    stateTitle: "Module en préparation",
    description:
      "Le module Actualités n’est pas encore ouvert. Aucune fonction de gestion éditoriale n’est disponible dans cet espace pour le moment.",
    chip: "En préparation",
  },
};

export function AdminModulePage() {
  const { module } = useParams();
  const def = adminModuleBySlug(module);
  if (!def) {
    return <Navigate to="/app/dashboard" replace />;
  }
  if (def.slug === "recruitment") {
    return <AdminRecruitmentPage />;
  }
  if (def.slug === "subscriptions") {
    return <AdminBillingPage />;
  }
  if (def.slug === "coaching") {
    return <AdminCoachingPage />;
  }
  const page = PLACEHOLDERS[def.slug];
  if (!page) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <PlaceholderPage slug={def.slug} page={page} />;
}

function PlaceholderPage({ slug, page }: { slug: string; page: Placeholder }) {
  const { user } = useAuth();
  // the categories screen is an existing, permission-guarded route (admin.config)
  const canConfigure = slug === "services" && hasPermission(user, PERMS.ADMIN_CONFIG);

  return (
    <section className="bo-dash bo-users bo-bm">
      <header className="bo-dash-head">
        <div>
          <h1>{page.title}</h1>
          <p>{page.subtitle}</p>
        </div>
      </header>
      <ModuleState
        icons={page.icons}
        title={page.stateTitle}
        description={page.description}
        chip={page.chip}
        notes={page.notes}
        action={
          canConfigure ? (
            <Link to="/admin/config/categories" className="bm-btn">
              Configurer les catégories
            </Link>
          ) : undefined
        }
      />
    </section>
  );
}
