import { Link } from "react-router-dom";

type BrandLogoProps = {
  to?: string | null;
  className?: string;
};

export function BrandLogo({ to = "/", className = "" }: BrandLogoProps) {
  const inner = (
    <span className={["fu-brand", className].filter(Boolean).join(" ")}>
      <img src="/brand/icon-uplink-fitness.png?v=4" alt="Uplink Fitness" />
    </span>
  );

  if (!to) {
    return inner;
  }

  return (
    <Link className="fu-brand-link" to={to} aria-label="Uplink Fitness — accueil">
      {inner}
    </Link>
  );
}
