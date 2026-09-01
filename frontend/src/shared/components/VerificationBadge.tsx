export function VerificationBadge({ verified, compact = false }: { verified: boolean; compact?: boolean }) {
  if (!verified) {
    return null;
  }
  return (
    <span className={`verify-badge${compact ? " is-compact" : ""}`}>
      <span className="material-symbols-outlined">verified</span>
      Compte vérifié
    </span>
  );
}
