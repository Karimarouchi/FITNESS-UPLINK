import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
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
  return (
    <section className="vt-dash">
      <div className="vt-dash-hero">
        <div>
          <p className="vt-dash-kicker">Votre espace</p>
          <h1>
            Bonjour,
            <br />
            <span>{user?.firstName || user?.displayName || "champion"}.</span>
          </h1>
          <p className="vt-dash-lead">Tout le réseau Fitness Universe, à portée de main. Choisissez par où commencer.</p>
        </div>
        <div className="vt-dash-status">
          <Badge variant={verified ? "default" : "pending"}>{verificationLabel(user)}</Badge>
          <Link className="vt-dash-btn" to="/app/profile">
            {verified ? "Voir mon profil" : "Compléter mon profil"}
            <span className="material-symbols-outlined" aria-hidden="true">
              arrow_forward
            </span>
          </Link>
          <Link className="vt-dash-link" to="/">
            Voir le site
          </Link>
        </div>
      </div>

      <div className="vt-dash-grid">
        {tiles.map((tile, index) => (
          <Link className="vt-dash-tile" to={tile.to} key={tile.to}>
            <span className="vt-dash-idx">{String(index + 1).padStart(2, "0")}</span>
            <span className="vt-dash-icon material-symbols-outlined" aria-hidden="true">
              {tile.icon}
            </span>
            <strong>{tile.title}</strong>
            <small>{tile.text}</small>
            <span className="vt-dash-go material-symbols-outlined" aria-hidden="true">
              north_east
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
