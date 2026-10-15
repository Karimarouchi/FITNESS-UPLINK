import { BrandLogo } from "@/components/brand/BrandLogo";
import "@/features/onboarding/signup-flow.css";

/** Sky panel shared by the e-mail verification screens (same language as login / home hero). */
export function VerifyHero() {
  return (
    <section className="vf-hero" aria-hidden="true">
      <span className="ob-brand">
        <BrandLogo to="/" />
      </span>
      <div>
        <h2>
          Un code.
          <br />
          <span>Et c’est parti.</span>
        </h2>
        <p>Encore une étape avant d’entrer dans le réseau : confirmez que cette adresse e-mail est bien la vôtre.</p>
      </div>
      <ol className="vf-steps">
        <li>Compte</li>
        <li className="is-on">E-mail</li>
        <li>Profil</li>
      </ol>
    </section>
  );
}
