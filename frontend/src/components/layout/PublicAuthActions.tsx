import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";

type PublicAuthActionsProps = {
  ghostClass: string;
  solidClass: string;
  onNavigate?: () => void;
};

export function PublicAuthActions({ ghostClass, solidClass, onNavigate }: PublicAuthActionsProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return (
      <>
        <Link className={ghostClass} to="/login" onClick={onNavigate}>
          Se connecter
        </Link>
        <Link className={solidClass} to="/signup" onClick={onNavigate}>
          Rejoindre
        </Link>
      </>
    );
  }

  return (
    <>
      <button
        className={ghostClass}
        type="button"
        onClick={() => {
          onNavigate?.();
          void logout().then(() => navigate("/", { replace: true }));
        }}
      >
        Déconnexion
      </button>
      <Link className={solidClass} to="/app/dashboard" onClick={onNavigate}>
        Tableau de bord
      </Link>
    </>
  );
}
