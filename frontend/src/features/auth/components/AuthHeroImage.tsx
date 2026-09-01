const AUTH_HERO =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCI7JtVvr4J_yZ4gfpQopN1dd00a2Ga_VcyUmxszm2TPSFjX0CJwTehy__xTsebugyqmF6CXgG9HLD1O1ll4ib-5iVaThtL4rPmUTVii7F3jssrDI9KoL_SNzMXZWsjY1WazWDdtgY82DC2_5rUkY1n0E0HqPa78hwYlKzQMeaU-OgCpwINyVkyknIgANODcr2YWw29_w2C8MGzAgwkmpkII0HykbA-2HfBoKpO3-5qf3ZwqqIH7HM5vw";

export function AuthHeroImage({ className }: { className?: string }) {
  return <img alt="Fitness Uplink atmosphere" className={className} src={AUTH_HERO} />;
}

export { AUTH_HERO };
