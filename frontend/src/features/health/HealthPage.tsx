import { useEffect, useState } from "react";
import { fetchHealth, type HealthStatus } from "./api";

export function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHealth()
      .then(setHealth)
      .catch(() => setError("Backend injoignable. Démarrez Spring Boot sur le port 8080."));
  }, []);

  return (
    <section className="panel">
      <h1>Connexion API</h1>
      {error ? <p className="error">{error}</p> : null}
      {health ? (
        <p className="status">
          {health.service} — {health.status}
        </p>
      ) : !error ? (
        <p className="status">Vérification du backend…</p>
      ) : null}
    </section>
  );
}
