import type { ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";
import { NAV_LINKS } from "../data";
import "../home.css";

type PublicLayoutProps = {
  children?: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="fu-public" lang="fr">
      <a className="fu-skip" href="#contenu">
        Aller au contenu
      </a>
      <Navbar links={NAV_LINKS} />
      <main id="contenu">{children ?? <Outlet />}</main>
      <Footer />
    </div>
  );
}
