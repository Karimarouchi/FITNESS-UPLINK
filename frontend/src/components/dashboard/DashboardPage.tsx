import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { lucideFor } from "@/components/layout/shell/navIcons";
import "@/shared/styles/backoffice-pro.css";
import { useAuth } from "@/features/auth/AuthContext";
import {
  hasPermission,
  isSuperAdmin,
  isVerified,
  verificationLabel,
} from "@/features/auth/types";
import { PERMS } from "@/features/auth/permissions";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { EmployerDashboard } from "./EmployerDashboard";
import { ProDashboard } from "./ProDashboard";
import { ModuleWorkspacePage } from "@/features/workspace/ModuleWorkspacePage";
import { SupplierDashboardPage } from "@/features/marketplace/pages/SupplierDashboardPage";

export function DashboardPage() {
  const { user } = useAuth();
  if (isSuperAdmin(user)) {
    return <AdminDashboard />;
  }
  if (hasPermission(user, PERMS.HIRE_PIPELINE)) {
    return <EmployerDashboard />;
  }
  if (
    hasPermission(user, PERMS.HIRE_APPLY) ||
    (hasPermission(user, PERMS.HIRE_PROFILE) && hasPermission(user, PERMS.COACHING_MANAGE))
  ) {
    return <ProDashboard />;
  }
  if (hasPermission(user, PERMS.ACADEMY_MANAGE)) {
    return <ModuleWorkspacePage workspace="academy" />;
  }
  if (hasPermission(user, PERMS.MARKETPLACE_MANAGE)) {
    return <SupplierDashboardPage />;
  }
  if (hasPermission(user, PERMS.SERVICES_MANAGE)) {
    return <ModuleWorkspacePage workspace="services" />;
  }
  if (hasPermission(user, PERMS.EVENTS_MANAGE)) {
    return <ModuleWorkspacePage workspace="events" />;
  }
  if (hasPermission(user, PERMS.CONTENT_PUBLISH)) {
    return <ModuleWorkspacePage workspace="content" />;
  }
  if (hasPermission(user, PERMS.COACHING_MANAGE)) {
    return <ModuleWorkspacePage workspace="coaching" />;
  }
  return <MemberDashboard />;
}

type MemberTile = { icon: string; title: string; text: string; to: string; perm?: string };

const MEMBER_TILES: MemberTile[] = [
  { icon: "person_search", title: "Trouver un coach", text: "Spécialités, avis vérifiés, réservation.", to: "/coaches", perm: PERMS.COACHING_DISCOVER },
  { icon: "event_available", title: "Mes séances", text: "Réservations, packs et paiements.", to: "/app/coaching/bookings", perm: PERMS.COACHING_DISCOVER },
  { icon: "school", title: "Académie", text: "Formations, certifications, masterclass.", to: "/academie", perm: PERMS.ACADEMY_BROWSE },
  { icon: "assignment", title: "Mes inscriptions", text: "Sessions réservées et à payer.", to: "/app/academy/registrations", perm: PERMS.ACADEMY_BROWSE },
  { icon: "storefront", title: "Marketplace", text: "Matériel et demandes de devis.", to: "/marketplace/products", perm: PERMS.MARKETPLACE_BROWSE },
  { icon: "handyman", title: "Prestataires", text: "Services pour salles et studios.", to: "/services/providers", perm: PERMS.SERVICES_BROWSE },
  { icon: "event", title: "Events", text: "Compétitions, salons, networking.", to: "/app/events", perm: PERMS.EVENTS_BROWSE },
  { icon: "person", title: "Mon profil", text: "Photo, informations, préférences.", to: "/app/profile" },
  { icon: "credit_card", title: "Abonnement", text: "Offre, factures, moyen de paiement.", to: "/app/billing" },
];

function MemberDashboard() {
  const { user } = useAuth();
  const tiles = MEMBER_TILES.filter((tile) => !tile.perm || hasPermission(user, tile.perm));
  const verified = isVerified(user);
  const firstName = user?.firstName || user?.displayName || "champion";
  return (
    <section className="pp">
      <header className="pp-head">
        <div className="pp-head-copy">
          <p className="pp-kicker">Votre espace</p>
          <h1>
            Bonjour, <span>{firstName}.</span>
          </h1>
          <p className="pp-lead">Tout le réseau Fitness Universe, à portée de main. Choisissez par où commencer.</p>
          <div className="pp-badges">
            <span className={`pp-status ${verified ? "is-success" : "is-warn"}`}>{verificationLabel(user)}</span>
            <Link className="pp-link" to="/app/profile">
              {verified ? "Voir mon profil" : "Compléter mon profil"}
            </Link>
            <Link className="pp-link" to="/">
              Voir le site
            </Link>
          </div>
        </div>
      </header>

      <div className="pp-tiles">
        {tiles.map((tile) => {
          const Icon = lucideFor(tile.icon);
          return (
            <Link className="pp-tile" to={tile.to} key={tile.to}>
              <span className="pp-icon" aria-hidden="true">
                <Icon size={22} />
              </span>
              <strong>{tile.title}</strong>
              <small>{tile.text}</small>
              <ArrowUpRight className="pp-tile-go" size={18} aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
