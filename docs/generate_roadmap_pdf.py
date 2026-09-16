# -*- coding: utf-8 -*-
"""Génère la roadmap de développement FITNESS UPLINK (PDF)."""

from pathlib import Path

from fpdf import FPDF

OUT = Path(__file__).resolve().parent / "FITNESS_UPLINK_ROADMAP_DEVELOPPEMENT_SPRINTS.pdf"

NAVY = (10, 22, 40)
NAVY2 = (16, 34, 61)
BLUE = (37, 99, 235)
BLUE_SOFT = (226, 232, 240)
ORANGE = (234, 88, 12)
GREEN = (21, 128, 61)
AMBER = (180, 83, 9)
RED = (185, 28, 28)
SLATE = (71, 85, 105)
TEXT = (15, 23, 42)
MUTED = (100, 116, 139)
LINE = (203, 213, 225)
WHITE = (255, 255, 255)
CREAM = (248, 250, 252)
GREEN_BG = (220, 252, 231)
AMBER_BG = (254, 243, 199)
BLUE_BG = (219, 234, 254)
ORANGE_BG = (255, 237, 213)

FONT = "Segoe"
FONT_B = "SegoeB"
FONT_I = "SegoeI"


class RoadmapPDF(FPDF):
    def __init__(self):
        super().__init__(format="A4", unit="mm")
        self.set_auto_page_break(auto=True, margin=18)
        self.add_font(FONT, "", r"C:\Windows\Fonts\segoeui.ttf")
        self.add_font(FONT_B, "", r"C:\Windows\Fonts\segoeuib.ttf")
        self.add_font(FONT_I, "", r"C:\Windows\Fonts\segoeuii.ttf")
        self.cover_mode = False
        self.section_label = "ROADMAP"

    def header(self):
        if self.cover_mode or self.page_no() == 1:
            return
        self.set_fill_color(*NAVY)
        self.rect(0, 0, 210, 12, "F")
        self.set_fill_color(*ORANGE)
        self.rect(0, 12, 210, 0.8, "F")
        self.set_xy(14, 3.2)
        self.set_font(FONT_B, "", 8)
        self.set_text_color(*WHITE)
        self.cell(90, 6, "FITNESS UPLINK  ·  ROADMAP DÉVELOPPEMENT", align="L")
        self.set_font(FONT, "", 8)
        self.set_text_color(180, 190, 210)
        self.cell(92, 6, self.section_label, align="R")

    def footer(self):
        if self.cover_mode or self.page_no() == 1:
            return
        self.set_y(-14)
        self.set_draw_color(*LINE)
        self.line(14, self.get_y(), 196, self.get_y())
        self.set_y(-11)
        self.set_font(FONT, "", 7.5)
        self.set_text_color(*MUTED)
        self.cell(90, 6, "Confidentiel  ·  Document de référence obligatoire  ·  Septembre 2026", align="L")
        self.cell(92, 6, f"{self.page_no() - 1:02d}", align="R")

    def set_section(self, label):
        self.section_label = label

    def h1(self, text):
        self.ln(3)
        self.set_font(FONT_B, "", 16)
        self.set_text_color(*NAVY)
        self.multi_cell(182, 8, text)
        self.set_fill_color(*ORANGE)
        self.rect(14, self.get_y(), 28, 1.1, "F")
        self.ln(5)

    def h2(self, text):
        self.ln(2)
        self.set_font(FONT_B, "", 11.5)
        self.set_text_color(*BLUE)
        self.multi_cell(182, 6.5, text)
        self.ln(1)

    def h3(self, text):
        self.set_font(FONT_B, "", 10)
        self.set_text_color(*NAVY)
        self.multi_cell(182, 5.5, text)
        self.ln(0.5)

    def body(self, text):
        self.set_font(FONT, "", 9.2)
        self.set_text_color(*TEXT)
        self.multi_cell(182, 5.1, text)
        self.ln(1.2)

    def italic(self, text):
        self.set_font(FONT_I, "", 9)
        self.set_text_color(*SLATE)
        self.multi_cell(182, 5, text)
        self.ln(1)

    def bullets(self, items, indent=0):
        x = 14 + indent
        w = 182 - indent
        for item in items:
            y = self.get_y()
            if y > 272:
                self.add_page()
                y = self.get_y()
            self.set_fill_color(*ORANGE)
            self.ellipse(x + 1.2, y + 1.8, 1.6, 1.6, "F")
            self.set_xy(x + 6, y)
            self.set_font(FONT, "", 9.1)
            self.set_text_color(*TEXT)
            self.multi_cell(w - 6, 5, item)
            self.ln(0.4)

    def rule_box(self, title, text, color=ORANGE, bg=ORANGE_BG):
        self.set_font(FONT, "", 8.6)
        n_lines = len(self.multi_cell(166, 4.7, text, dry_run=True, output="LINES"))
        h = 8 + 4.7 * n_lines + 4
        self._ensure(h + 4)
        y = self.get_y()
        self.set_fill_color(*bg)
        self.rect(14, y, 182, h, "F")
        self.set_fill_color(*color)
        self.rect(14, y, 2.2, h, "F")
        self.set_xy(22, y + 2.2)
        self.set_font(FONT_B, "", 8.6)
        self.set_text_color(*color)
        self.cell(166, 5, title)
        self.set_xy(22, y + 8)
        self.set_font(FONT, "", 8.6)
        self.set_text_color(*TEXT)
        self.multi_cell(166, 4.7, text)
        self.set_y(y + h + 3)

    def info_box(self, title, text):
        self.rule_box(title, text, BLUE, BLUE_BG)

    def ok_box(self, title, text):
        self.rule_box(title, text, GREEN, GREEN_BG)

    def warn_box(self, title, text):
        self.rule_box(title, text, AMBER, AMBER_BG)

    def _ensure(self, h):
        if self.get_y() + h > 275:
            self.add_page()

    def kv_table(self, rows, col1=48, col2=134):
        self._ensure(14)
        y = self.get_y()
        self.set_fill_color(*NAVY)
        self.set_text_color(*WHITE)
        self.set_font(FONT_B, "", 8)
        self.set_xy(14, y)
        self.cell(col1, 7, "  SUJET", fill=True)
        self.cell(col2, 7, "  RÈGLE / LIVRABLE", fill=True)
        self.set_y(y + 7)
        fill = False
        for a, b in rows:
            self.set_font(FONT_B, "", 8)
            a_lines = self.multi_cell(col1 - 4, 4.4, a, dry_run=True, output="LINES")
            self.set_font(FONT, "", 8)
            b_lines = self.multi_cell(col2 - 4, 4.4, b, dry_run=True, output="LINES")
            h = max(8, 2.2 + 4.4 * max(len(a_lines), len(b_lines)))
            self._ensure(h + 2)
            y = self.get_y()
            bg = CREAM if fill else WHITE
            self.set_fill_color(*bg)
            self.rect(14, y, col1 + col2, h, "F")
            self.set_draw_color(*LINE)
            self.line(14, y + h, 14 + col1 + col2, y + h)
            self.set_xy(16, y + 1.5)
            self.set_font(FONT_B, "", 8)
            self.set_text_color(*NAVY)
            self.multi_cell(col1 - 4, 4.4, a)
            self.set_xy(14 + col1 + 2, y + 1.5)
            self.set_font(FONT, "", 8)
            self.set_text_color(*TEXT)
            self.multi_cell(col2 - 4, 4.4, b)
            self.set_y(y + h)
            fill = not fill
        self.ln(3)

    def sprint_banner(self, code, title, duration, status, status_color):
        self._ensure(22)
        y = self.get_y()
        self.set_fill_color(*NAVY)
        self.rect(14, y, 182, 14, "F")
        self.set_fill_color(*ORANGE)
        self.rect(14, y, 3, 14, "F")
        self.set_xy(20, y + 2)
        self.set_font(FONT_B, "", 11)
        self.set_text_color(*WHITE)
        self.cell(118, 5.5, f"{code}  ·  {title}")
        self.set_xy(20, y + 7.6)
        self.set_font(FONT, "", 8)
        self.set_text_color(180, 190, 210)
        self.cell(90, 4.5, duration)
        # status chip
        self.set_fill_color(*status_color)
        self.set_xy(148, y + 3.5)
        self.set_font(FONT_B, "", 7.5)
        self.set_text_color(*WHITE)
        self.cell(44, 7, status, align="C", fill=True)
        self.set_y(y + 16)

    def mini_table(self, headers, rows, widths=None):
        if widths is None:
            widths = [182 / len(headers)] * len(headers)
        self._ensure(16)
        y = self.get_y()
        self.set_fill_color(*NAVY2)
        self.set_text_color(*WHITE)
        self.set_font(FONT_B, "", 7.6)
        x = 14
        for h, w in zip(headers, widths):
            self.set_xy(x, y)
            self.cell(w, 7, f"  {h}", fill=True)
            x += w
        self.set_y(y + 7)
        fill = False
        for row in rows:
            self._ensure(10)
            y = self.get_y()
            # measure
            max_h = 8
            parts = []
            for cell, w in zip(row, widths):
                self.set_font(FONT, "", 7.7)
                lines = self.multi_cell(w - 4, 4.1, cell, dry_run=True, output="LINES")
                parts.append(len(lines))
                max_h = max(max_h, 2.2 + 4.1 * len(lines))
            bg = CREAM if fill else WHITE
            self.set_fill_color(*bg)
            self.rect(14, y, 182, max_h, "F")
            self.set_draw_color(*LINE)
            self.line(14, y + max_h, 196, y + max_h)
            x = 14
            for cell, w in zip(row, widths):
                self.set_xy(x + 2, y + 1.1)
                self.set_font(FONT, "", 7.7)
                self.set_text_color(*TEXT)
                self.multi_cell(w - 4, 4.1, cell)
                x += w
            self.set_y(y + max_h)
            fill = not fill
        self.ln(3)

    def phase_chip_row(self, items):
        """items: list of (label, sub, color)"""
        self._ensure(28)
        n = len(items)
        gap = 3
        w = (182 - gap * (n - 1)) / n
        y = self.get_y()
        x = 14
        for label, sub, color in items:
            self.set_fill_color(*color)
            self.rect(x, y, w, 22, "F")
            self.set_xy(x + 3, y + 3)
            self.set_font(FONT_B, "", 8.2)
            self.set_text_color(*WHITE)
            self.multi_cell(w - 6, 4.5, label)
            self.set_xy(x + 3, y + 13)
            self.set_font(FONT, "", 7.2)
            self.set_text_color(230, 235, 245)
            self.multi_cell(w - 6, 3.8, sub)
            x += w + gap
        self.set_y(y + 26)


def build():
    pdf = RoadmapPDF()
    pdf.set_title("FITNESS UPLINK — Roadmap développement par sprints")
    pdf.set_author("FITNESS UPLINK")
    pdf.set_creator("Roadmap interne — document de référence développement")

    # ------------------------------------------------------------------ COVER
    pdf.cover_mode = True
    pdf.add_page()
    pdf.set_fill_color(*NAVY)
    pdf.rect(0, 0, 210, 297, "F")
    pdf.set_fill_color(*ORANGE)
    pdf.rect(0, 0, 7, 297, "F")
    pdf.set_fill_color(*BLUE)
    pdf.rect(7, 0, 1.2, 297, "F")

    pdf.set_xy(24, 28)
    pdf.set_font(FONT, "", 10)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(160, 6, "DOCUMENT DE RÉFÉRENCE OBLIGATOIRE  ·  CONFIDENTIEL")

    pdf.set_xy(24, 52)
    pdf.set_font(FONT_B, "", 13)
    pdf.set_text_color(*ORANGE)
    pdf.cell(160, 8, "FITNESS UPLINK")

    pdf.set_xy(24, 64)
    pdf.set_font(FONT_B, "", 28)
    pdf.set_text_color(*WHITE)
    pdf.multi_cell(170, 12, "Roadmap de\ndéveloppement")

    pdf.set_xy(24, 98)
    pdf.set_font(FONT, "", 14)
    pdf.set_text_color(191, 219, 254)
    pdf.multi_cell(170, 7.5, "Découpage du projet en sprints.\nLa carte à suivre à chaque décision, ticket et merge.")

    pdf.set_fill_color(22, 42, 72)
    pdf.rect(24, 128, 162, 52, "F")
    pdf.set_xy(30, 134)
    pdf.set_font(FONT_B, "", 9)
    pdf.set_text_color(*ORANGE)
    pdf.cell(150, 5, "POURQUOI CE DOCUMENT EXISTE")
    pdf.set_xy(30, 142)
    pdf.set_font(FONT, "", 9)
    pdf.set_text_color(226, 232, 240)
    pdf.multi_cell(
        150,
        5,
        "Les deux cahiers des charges décrivent un écosystème complet. "
        "Le dépôt contient déjà le cœur Hire. Ce document tranche l'ordre, "
        "interdit de mélanger les phases, et fixe ce qui doit être vrai "
        "avant de toucher au module suivant.",
    )

    meta = [
        ("Sources", "CDC Développeur V2  +  CDC Startup 2026  +  état du code"),
        ("Durée sprint", "2 semaines  ·  18 sprints  ·  3 phases + 1 sprint 0 déjà livré"),
        ("Cible produit", "Hire d'abord  ·  puis écosystème  ·  puis fonctions avancées"),
        ("Usage", "Ouvrir avant chaque sprint. Aucune story hors carte sans arbitrage PO."),
    ]
    y = 190
    for k, v in meta:
        pdf.set_xy(24, y)
        pdf.set_font(FONT_B, "", 8)
        pdf.set_text_color(*ORANGE)
        pdf.cell(32, 5, k.upper())
        pdf.set_font(FONT, "", 9)
        pdf.set_text_color(*WHITE)
        pdf.cell(130, 5, v)
        y += 8

    pdf.set_xy(24, 272)
    pdf.set_font(FONT, "", 8)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(160, 5, "Version 1.0  ·  9 septembre 2026  ·  À mettre à jour après chaque sprint terminé")

    pdf.cover_mode = False

    # ------------------------------------------------------------------ 01 USAGE
    pdf.set_section("01  ·  MODE D'EMPLOI")
    pdf.add_page()
    pdf.h1("01  ·  Comment utiliser cette roadmap")
    pdf.body(
        "Ce PDF n'est pas une liste d'idées. C'est la carte de route du développement. "
        "Chaque fonctionnalité, chaque table, chaque écran doit pouvoir être rattaché "
        "à un sprint numéroté. Si ce n'est pas possible, la demande est hors carte : "
        "elle passe par un arbitrage Product Owner avant d'être codée."
    )
    pdf.h2("Règle d'or")
    pdf.rule_box(
        "NE PAS CONSTRUIRE L'ÉCOSYSTÈME AVANT D'AVOIR FERMÉ LE MVP HIRE",
        "Le cahier des charges startup impose Recruitment first. Le cahier développeur "
        "fixe 19 critères de validation du MVP. Plusieurs de ces critères ne sont pas "
        "encore vrais dans le code (email, abonnements, filtres combinés, factures, "
        "journal d'admin). Tant que le GO MVP Hire n'est pas signé, aucun module "
        "Coaching, Marketplace, Services, Academy, Events, News, Eat Healthy ou "
        "Workout n'est ouvert — sauf pages marketing déjà présentes.",
    )
    pdf.h2("Routine de sprint")
    pdf.bullets(
        [
            "Jour 1 : relire le sprint concerné + les décisions encore ouvertes. Fermer les décisions avant de coder.",
            "Chaque ticket : objectif, sprint, hors-périmètre, critère d'acceptation.",
            "Chaque PR : permission backend, test du chemin critique, pas de tarif / pays / rôle en dur.",
            "Fin de sprint : recette sur staging, mise à jour du statut dans ce document, GO ou report explicite.",
            "Definition of Done (CDC startup) : développé, revu, testé, documenté, instrumenté si besoin, sur staging, accepté.",
        ]
    )
    pdf.h2("Sources et priorité en cas de conflit")
    pdf.kv_table(
        [
            ("CDC Startup 2026", "Vision, modules, Global+Pays, DoD, GO/NO-GO, parcours P0."),
            ("CDC Développeur V2", "Détail Hire, workflows, entités, critères MVP, complexité."),
            ("Ce document", "Ordre d'exécution, état du code, ce qu'il est interdit de faire maintenant."),
            ("Code actuel", "Vérité d'implémentation. Ne pas redévelopper S0."),
        ]
    )
    pdf.info_box(
        "STACK DÉJÀ TRANCHÉE — NE PAS RÉ-OUVRIR",
        "Backend Spring Boot + PostgreSQL + Flyway. Frontend React + Vite + Tailwind. "
        "API-first. Auth JWT + cookie refresh. RBAC en base (permissions / role_permissions). "
        "Le CDC développeur proposait NestJS : le dépôt a déjà choisi Java. On conserve "
        "cette stack. On ne migre pas de framework en cours de route.",
    )

    # ------------------------------------------------------------------ 02 PRINCIPES
    pdf.set_section("02  ·  PRINCIPES NON NÉGOCIABLES")
    pdf.add_page()
    pdf.h1("02  ·  Principes à appliquer à chaque ligne de code")
    pdf.body(
        "Ces règles viennent des deux cahiers des charges. Elles s'appliquent dans tous "
        "les sprints, y compris les modules futurs. Les violer crée de la dette qui "
        "bloque l'international et le multi-modules."
    )
    pdf.mini_table(
        ["#", "Principe", "Application concrète"],
        [
            ["P1", "Recruitment first", "Hire est le moteur de valeur. Tout le reste est extension."],
            ["P2", "Un socle, pas 9 apps", "Users, rôles, paiements, notifs, fichiers, admin = partagés."],
            ["P3", "RBAC backend", "Jamais un droit seulement dans le menu. PermissionService / @PreAuthorize."],
            ["P4", "API-first", "La règle métier vit dans l'API. Le web est un client. Prépare le mobile."],
            ["P5", "Rien de métier en dur", "Tarifs, pays, langues, catégories, commissions, plans = admin / DB."],
            ["P6", "Trust by design", "Vérification, modération, audit, URLs signées, moindre privilège."],
            ["P7", "Profils candidats privés", "Non indexables. Accès réservé aux employeurs autorisés."],
            ["P8", "Fichiers hors SQL", "Object storage + permissions. Interdit de rester sur BYTEA."],
            ["P9", "Notifs centralisées", "Chaque module déclenche un événement. Pas d'emails dispersés."],
            ["P10", "Paiement abstrait", "Couche Payment Provider. Multi-devises / multi-PSP plus tard."],
            ["P11", "Pagination partout", "Aucune liste métier sans page/size. Indexes SQL sur les filtres."],
            ["P12", "Admin autonome", "Les ops quotidiennes ne doivent plus passer par un développeur."],
            ["P13", "Décision avant code", "Sujet ouvert dans l'annexe = on ne suppose pas, on arbitre."],
            ["P14", "Mobile-first UX", "Parcours fréquents simples sur smartphone, desktop pour ops pro."],
            ["P15", "Security gate", "Pas de prod avec secret exposé, backup non testé, faille critique."],
        ],
        [12, 42, 128],
    )
    pdf.warn_box(
        "DETTE CONNUE À TRAITER DANS LA PHASE A — PAS À REPRODUIRE",
        "Les uploads sont aujourd'hui en BYTEA dans PostgreSQL (V12). Les permissions "
        "Hire sont surtout vérifiées en service layer, pas partout en annotation. "
        "Les notifications e-mail n'existent pas. Les tarifs de /tarifs sont statiques. "
        "Toute nouvelle feature fichiers / billing / notifs doit suivre P8, P9, P10 — "
        "pas le schéma actuel.",
    )

    # ------------------------------------------------------------------ 03 ETAT
    pdf.set_section("03  ·  ÉTAT DU DÉPÔT")
    pdf.add_page()
    pdf.h1("03  ·  Où en est le code aujourd'hui")
    pdf.body(
        "Le projet n'est pas un from-scratch. C'est un MVP Hire partiellement construit, "
        "avec des coquilles d'écosystème. La roadmap part de cet état, pas du CDC vide."
    )
    pdf.phase_chip_row(
        [
            ("S0  LIVRÉ", "Auth, onboarding,\nHire, contrats mock", GREEN),
            ("PHASE A", "S1 → S7\nFermer le MVP Hire", BLUE),
            ("PHASE B", "S8 → S14\nModules écosystème", ORANGE),
            ("PHASE C", "S15 → S18\nAvancé & go-live", NAVY2),
        ]
    )
    pdf.h2("Déjà livré — ne pas reconstruire (Sprint 0)")
    pdf.bullets(
        [
            "Auth : signup, login, refresh cookie, logout, lockout, mot de passe fort, Super Admin seedé.",
            "Onboarding : choix rôle, pays, profil dynamique, upload CV / documents, parse CV PDF.",
            "RBAC : 29 permissions, mapping par rôle, écran admin des droits.",
            "Hire : offres, candidatures, pipeline Kanban, recherche texte, favoris, fiche candidat.",
            "Vérification admin : dossier, checks, acceptation / refus.",
            "Contrats : cycle de vie + signature mock + PDF + historique.",
            "Users admin : liste, activation, suppression, actions bulk.",
            "Notifications in-app : surtout événements contrat.",
        ]
    )
    pdf.h2("Existant en coquille — ne pas prendre pour du livré")
    pdf.bullets(
        [
            "Pages publiques Coaching, Services, Marketplace, Académie, News, Events : marketing only.",
            "Workspaces /app/coaching, academy, marketplace, services, events, content : stubs.",
            "Admin subscriptions, coaching, marketplace, etc. : panneaux vides.",
            "Permissions V16 déjà seedées pour ces modules : le droit existe, le métier non.",
        ]
    )
    pdf.h2("Manquant par rapport aux 19 critères MVP du CDC développeur")
    pdf.mini_table(
        ["Critère MVP", "Statut", "Sprint de clôture"],
        [
            ["1. Confirmation e-mail", "KO", "S1"],
            ["2–6. Profils + vérif pro / entreprise", "OK", "S0"],
            ["7–8. Abonnement souscrit + contrôle d'accès réel", "KO", "S4"],
            ["9. Recherche candidats multi-filtres", "PARTIEL (q seulement)", "S2"],
            ["10. Consultation profil autorisé", "OK", "S0"],
            ["11. Favoris / contacter un candidat", "PARTIEL (favoris only)", "S3"],
            ["12. Offres + candidatures", "OK", "S0"],
            ["13. Notifications critiques", "PARTIEL (in-app contrat)", "S1 + S3"],
            ["14. Profils privés / non SEO", "À durcir", "S2"],
            ["15–16. Factures, renouvellement, échec paiement", "KO", "S4"],
            ["17–18. Back-office quotidien + audit log", "PARTIEL", "S5"],
            ["19. Responsive desktop / tablette / mobile", "À recetter", "S7"],
        ],
        [72, 50, 60],
    )

    # ------------------------------------------------------------------ 04 VUE
    pdf.set_section("04  ·  VUE D'ENSEMBLE")
    pdf.add_page()
    pdf.h1("04  ·  Carte des 18 sprints")
    pdf.body(
        "Durée unitaire : 2 semaines. Charge indicative pour 1 développeur full-stack "
        "concentré. Si l'équipe grandit, on parallélise à l'intérieur d'un sprint, "
        "pas en ouvrant la Phase B trop tôt."
    )
    pdf.h2("Phase A — Clôturer Fitness-Hire Elite")
    pdf.mini_table(
        ["Sprint", "Objectif", "Gate"],
        [
            ["S1  Auth & e-mail", "Confirmer le compte, reset password, mailer abstrait", "Compte fiable"],
            ["S2  Recherche Hire", "Filtres combinés, pagination, confidentialité profils", "Sourcing usable"],
            ["S3  Contact & notifs", "Contacter, alertes vérif / candidature / pipeline", "Boucle Hire fermée"],
            ["S4  Billing", "Plans, paiement, statuts, gating réel, factures", "Modèle économique"],
            ["S5  Back-office ops", "KPI, audit log, modération, configs admin", "Ops sans dev"],
            ["S6  Fichiers & sécu", "Object storage, URLs signées, hors BYTEA", "Trust documents"],
            ["S7  Recette MVP", "E2E P0, sécu, responsive, UAT, GO/NO-GO", "GO MVP HIRE"],
        ],
        [40, 92, 50],
    )
    pdf.h2("Phase B — Écosystème (après GO MVP Hire)")
    pdf.mini_table(
        ["Sprint", "Module", "Niveau CDC"],
        [
            ["S8", "Services B2B : annuaire + demande de devis", "Faible / moyen"],
            ["S9", "Marketplace : catalogue + devis (pas de checkout)", "Faible / moyen"],
            ["S10", "Coaching privé : agenda, résa, packs (paiement socle S4)", "Élevé"],
            ["S11", "Academy : formations, sessions, inscriptions", "Moyen / élevé"],
            ["S12", "Events : publication, inscriptions (billets si décidé)", "Moyen"],
            ["S13", "News & Knowledge Center", "Faible / moyen"],
            ["S14", "Eat Healthy + Workout Programs (contenus experts)", "Moyen"],
        ],
        [28, 110, 44],
    )
    pdf.h2("Phase C — Avancé")
    pdf.mini_table(
        ["Sprint", "Objectif", "Pourquoi après"],
        [
            ["S15", "Matching scoring explicable (pas d'IA)", "Données Hire stables"],
            ["S16", "Signature eIDAS réelle + i18n / Global+Pays", "Dépendance prestataire"],
            ["S17", "Analytics produit, SEO public, monitoring", "Mesurer avant scale"],
            ["S18", "Hardening prod, PWA / préparation mobile, handover", "GO LIVE"],
        ],
        [28, 92, 62],
    )
    pdf.rule_box(
        "DEPENDANCES BLOQUANTES",
        "S4 (billing) bloque le contrôle d'accès premium et les paiements Coaching / Academy. "
        "S1 (mailer) bloque toutes les notifs e-mail. S6 (storage) bloque les documents "
        "privés à l'échelle. S7 est un gate produit, pas un sprint de features. "
        "S10 ne commence pas sans S4. S15 ne commence pas sans S2.",
    )

    # ------------------------------------------------------------------ 05 DECISIONS
    pdf.set_section("05  ·  DÉCISIONS À FERMER")
    pdf.add_page()
    pdf.h1("05  ·  Décisions à trancher avant de coder")
    pdf.body(
        "Le CDC startup est clair : un choix non tranché ne doit pas être supposé "
        "silencieusement. Ci-dessous, le sprint maximum avant lequel la décision "
        "doit être écrite (date, options, responsable, impact)."
    )
    pdf.mini_table(
        ["Décision", "Avant sprint", "Impact si on attend trop"],
        [
            ["Prestataire e-mail (transactionnel)", "S1", "Impossible de confirmer un compte."],
            ["Documents obligatoires + badge", "S2", "Règles de vérif incohérentes."],
            ["Règles de contact candidat (message vs demande)", "S3", "Spam / contournement d'abonnement."],
            ["PSP + devises + TVA + essai gratuit", "S4", "Refonte billing. Ne pas coder Stripe 'au hasard'."],
            ["Plans et droits par rôle (matrice)", "S4", "Gating incorrect, dette commerciale."],
            ["Object storage (S3 compatible) + région", "S6", "Migration douloureuse si on scale BYTEA."],
            ["Offres d'emploi dans le MVP : OUI (déjà en S0)", "—", "Déjà tranché par le code. Conserver."],
            ["Marketplace : catalogue+devis vs transaction", "S9", "CDC = phase 1 devis. Ne pas ouvrir le panier."],
            ["Coaching : résa payante vs simple contact", "S10", "Change tout le modèle agenda."],
            ["Academy / Events : inscription vs billetterie", "S11 / S12", "Périmètre paiement."],
            ["Signature : Yousign / DocuSign / autre + valeur juridique", "S16", "Le mock reste acceptable jusqu'à S16."],
            ["Langues V1 + RTL arabe oui/non", "S16", "Copy et layout."],
            ["Mobile : PWA d'abord vs natif", "S18", "Ne bloque pas le web MVP."],
            ["IA matching : NON pour le MVP", "—", "Interdit avant S15, et S15 = scoring classique."],
        ],
        [78, 28, 76],
    )
    pdf.info_box(
        "REGISTRE DE DÉCISIONS",
        "Chaque arbitrage : date, sujet, options, décision, responsable, impact "
        "périmètre / planning, pièces. À tenir hors de ce PDF (Notion / issue tracker). "
        "Ce document ne fait que rappeler le délai maximum.",
    )

    # ================================================================== SPRINTS A
    def new_page(section):
        pdf.set_section(section)
        pdf.add_page()

    def sprint_page(code, title, duration, status, color, why, do, dont, data, dod, recette, decisions=None):
        new_page(f"{code}  ·  {title.upper()}")
        pdf.sprint_banner(code, title, duration, status, color)
        pdf.h3("Pourquoi maintenant")
        pdf.body(why)
        pdf.h3("À livrer")
        pdf.bullets(do)
        pdf.h3("Hors périmètre de ce sprint")
        pdf.bullets(dont)
        if data:
            pdf.h3("Données / technique")
            pdf.bullets(data)
        if decisions:
            pdf.h3("Décisions à avoir par écrit avant le jour 1")
            pdf.bullets(decisions)
        pdf.h3("Definition of Done")
        pdf.body(dod)
        pdf.h3("Recette")
        pdf.bullets(recette)

    sprint_page(
        "S1",
        "Auth complète et e-mail transactionnel",
        "2 semaines  ·  Phase A  ·  Socle compte",
        "À FAIRE",
        BLUE,
        "Le critère MVP n°1 exige la confirmation d'e-mail. Sans mailer, aucune notification "
        "critique du CDC (vérif, paiement, contrat, candidature) ne peut sortir du produit. "
        "Le login affiche déjà « mot de passe oublié » sans API : c'est une dette visible.",
        [
            "Abstraction EmailProvider (comme on le fera pour le paiement). Implémentation réelle (SMTP ou prestataire).",
            "Confirmation d'adresse : token, expiration, renvoi, statut email_verified. Blocage des actions sensibles si non vérifié (règle à figer).",
            "Forgot / reset password bout en bout (demande, e-mail, token one-shot, nouveau mot de passe).",
            "Templates : bienvenue, confirmation, reset, document refusé, contrat, paiement — au minimum les 3 auth.",
            "Préférences de langue du mail = langue du compte si elle existe, sinon FR.",
            "Journaliser les envois échoués. Pas d'adresse en clair dans les logs.",
        ],
        [
            "OAuth Google / Apple / LinkedIn (CDC = options futures).",
            "2FA admin (futur, pas S1).",
            "Push mobile.",
            "Refonte complète de l'UI login.",
        ],
        [
            "Colonne / table de vérification e-mail. Tokens hashés, jamais stockés en clair.",
            "Aucun secret SMTP dans Git. Variables d'environnement.",
            "Ne pas envoyer d'e-mail depuis chaque service métier : file d'événements ou EmailService unique.",
        ],
        "Un utilisateur nouveau confirme son e-mail, se connecte, reset son mot de passe, "
        "et le Super Admin peut constater l'échec d'envoi simulé. Tests unitaires + un test d'intégration du flux reset.",
        [
            "Signup → mail reçu → lien → compte vérifié.",
            "Lien expiré / déjà utilisé = message clair.",
            "Reset impossible pour un e-mail inconnu sans révéler si le compte existe (réponse uniforme).",
        ],
        [
            "Prestataire e-mail retenu.",
            "Le compte non vérifié peut-il terminer l'onboarding ? Décision PO.",
        ],
    )

    sprint_page(
        "S2",
        "Recherche Hire, filtres et confidentialité",
        "2 semaines  ·  Phase A  ·  Cœur sourcing",
        "À FAIRE",
        BLUE,
        "Aujourd'hui GET /v1/candidates?q= est une recherche texte. Le CDC exige des filtres "
        "combinés, pagination, tri, indexes. Les profils professionnels doivent rester privés "
        "et non indexables. Sans cela, l'employeur ne peut pas sourcer comme promis.",
        [
            "API candidats : métier, spécialité, pays, ville, années d'expérience, diplôme, certification, langue, disponibilité, type de contrat, salaire, mobilité, profil vérifié.",
            "Pagination + tris (pertinence / date / expérience). Jamais de dump de la base.",
            "UI employeur : filtres combinés, états vides, loading, reset.",
            "Fiche candidat : données selon permissions et, dès S4, selon abonnement. En S2, au moins selon rôle + vérif.",
            "Robots / meta : profils et /candidates non indexables. Pages marketing publiques inchangées.",
            "Téléchargement CV / diplômes : contrôle permission backend (déjà partiel) — durcir.",
        ],
        [
            "Matching IA ou scoring avancé (S15).",
            "Recherche globale multi-modules.",
            "Elasticsearch sauf si PostgreSQL ne tient plus : commencer par SQL + indexes.",
        ],
        [
            "Indexes sur pays, rôle, verification_status, et champs filtrés réellement stockés.",
            "Ne pas charger les BYTEA dans la liste : cartes légères, fichiers à la demande.",
        ],
        "Un employeur combine 3 filtres, pagine, ouvre un profil autorisé, et un visiteur "
        "non connecté ne voit pas le profil complet ni une URL publique indexable.",
        [
            "Combinaison de filtres + résultat vide propre.",
            "Candidat non vérifié filtrable.",
            "Accès refusé (403) pour un rôle non employeur.",
        ],
        ["Documents obligatoires et signification du badge « vérifié »."],
    )

    sprint_page(
        "S3",
        "Contact candidat et notifications Hire",
        "2 semaines  ·  Phase A  ·  Boucle de recrutement",
        "À FAIRE",
        BLUE,
        "Le critère MVP n°11 demande d'enregistrer ET de contacter un candidat. Les favoris "
        "existent. Le contact n'existe pas. Les notifs in-app ne couvrent que les contrats. "
        "Le CDC startup parle de messagerie avec anti-spam : pour le MVP Hire on livre un "
        "canal restreint, pas un chat général.",
        [
            "Action Contacter depuis la fiche / le pipeline, selon règle métier (abonnement plus tard en S4 : préparer le point d'extension entitlement).",
            "Messagerie Hire minimale : thread lié à un recrutement ou à un profil, pièces limitées, blocage, signalement.",
            "Notifications in-app + e-mail : document accepté/refusé, nouvelle candidature, changement de statut pipeline, message reçu, contrat (déjà là).",
            "Préférences utilisateur basiques (in-app / e-mail) sur ces catégories.",
            "Anti-spam : rate limit contact, pas de message vers un visiteur, pas d'export d'e-mail personnel si la règle l'interdit.",
        ],
        [
            "Chat grand public, groupes, appels.",
            "Alertes d'offres intelligentes avancées (peut être un lot S3bis si le temps reste : alertes simples OK).",
            "Push PWA.",
        ],
        [
            "Tables conversation / message / notification_event. Réutiliser notifications existantes.",
            "Tout envoi e-mail passe par le mailer S1.",
        ],
        "Employeur contacte un candidat, le candidat reçoit in-app + e-mail, répond, "
        "le pipeline peut rester la source de vérité du statut.",
        [
            "Candidat refuse / bloque.",
            "Utilisateur sans permission : 403.",
            "Notification de refus de document avec motif.",
        ],
        ["Message libre vs demande de contact structurée. Recommandation : thread lié au recrutement, pas d'e-mail personnel exposé."],
    )

    sprint_page(
        "S4",
        "Abonnements, paiements et gating",
        "2 semaines  ·  Phase A  ·  Sprint le plus critique",
        "À FAIRE",
        ORANGE,
        "Les critères MVP 7, 8, 15 et 16 sont actuellement KO. Sans eux, Hire n'est pas un "
        "produit vendable. Les tarifs du CDC (50 DT, 200 DT, 200 €…) ne doivent JAMAIS "
        "être copiés dans le code. Toute la matrice plans × droits est administrable.",
        [
            "Entités : Plan, Entitlement, Subscription, Payment, Invoice, TransactionLog.",
            "Statuts : Trial, Active, Past Due, Cancelled, Suspended, Expired.",
            "PaymentProvider abstrait + 1 prestataire réel (celui décidé). Webhooks signés. Idempotence.",
            "Parcours : choisir plan → CGV → paiement → activation → facture → historique.",
            "Gating réel : recherche avancée, contact, volume d'offres, etc. selon entitlements — pas selon un if (role) dans le JSX.",
            "Échec de paiement : notif, retry, grâce, restriction, suspension. Jobs asynchrones.",
            "Back-office : plans, tarifs, devise, période, dates d'effet, abonnés, échecs.",
            "Brancher /tarifs et BillingPage sur l'API. Retirer les prix statiques.",
        ],
        [
            "Multi-PSP / multi-pays complet (architecture prête, 2e PSP plus tard).",
            "Marketplace transactionnelle, commissions coaching (hooks d'entitlement seulement).",
            "Comptabilité fiscale complète au-delà de la facture de base.",
        ],
        [
            "Aucun montant en dur. Aucune clé PSP en repo.",
            "Webhooks hors session utilisateur. Journal des événements bruts.",
            "Tests : activation, refus carte, webhook rejoué, perte de droit à l'expiration.",
        ],
        "Un employeur paie, accède à une feature premium, un échec lui retire le droit après "
        "la grâce, la facture est téléchargeable, l'admin voit le statut sans SQL.",
        [
            "Happy path paiement test.",
            "Annulation : accès jusqu'à fin de période, puis Expired.",
            "Utilisateur Suspended : 403 sur les routes gated.",
        ],
        [
            "PSP, devises V1, TVA, essai gratuit oui/non, matrice plan × rôle × permission.",
            "Que se passe-t-il pour les comptes Super Admin / internes ? Toujours entitlement explicite.",
        ],
    )

    sprint_page(
        "S5",
        "Back-office opérationnel",
        "2 semaines  ·  Phase A  ·  Exploitation",
        "À FAIRE",
        BLUE,
        "Le CDC : le back-office est critique, gestion quotidienne sans développeur. "
        "Aujourd'hui : users, vérifs, rôles, pays. Dashboard KPI à 0. Pas de journal d'activité "
        "complet. Modération et configs (langues, devises, catégories) en stub.",
        [
            "AuditLog : qui, quoi, quand, objet, ancienne / nouvelle valeur sur actions sensibles (user enable, vérif, rôle, plan, suspension).",
            "Dashboard admin : utilisateurs, vérifs en attente, abonnements actifs, revenus (si S4), offres, candidatures — vraies requêtes.",
            "Modération : suspendre / réactiver, masquer profil, signalements Hire.",
            "Admin recrutement : vue offres, signalements, pas seulement la liste candidats.",
            "Config : taxonomies métiers / spécialités / catégories — administrables, plus seulement seed SQL silencieux.",
            "Feature flags simples si utiles (ex. messagerie, billing).",
        ],
        [
            "Admin de modules encore inexistants (coaching, shop…) : laisser le stub, ne pas feindre le métier.",
            "Support tickets complets si un outil externe est choisi : sinon un formulaire contact + table minimale.",
        ],
        [
            "Table admin_audit_logs. Indexes (actor, entity, date).",
            "Permissions admin.* déjà présentes : les brancher sur chaque endpoint nouveau.",
        ],
        "Un Super Admin gère un signalement, suspend un compte, voit l'action dans le journal, "
        "et lit des KPI non nuls sur un jeu de données de staging.",
        [
            "Un Admin sans permission rôles ne peut pas changer les droits.",
            "Une action de vérif apparaît dans l'audit.",
        ],
        None,
    )

    sprint_page(
        "S6",
        "Stockage fichiers, URLs signées, sécurité docs",
        "2 semaines  ·  Phase A  ·  Trust",
        "À FAIRE",
        BLUE,
        "Le CDC interdit de stocker les fichiers dans SQL. V12 a mis le content en BYTEA "
        "pour avancer. Avant d'ouvrir plus de documents (contrats, produits, formations), "
        "il faut migrer. Les CV, diplômes, docs juridiques, contrats n'ont pas d'URL publique permanente.",
        [
            "Object storage S3-compatible. Upload via API : permission → PUT signé ou stream contrôlé.",
            "Migration des BYTEA existants (script one-shot + vérif d'intégrité).",
            "Download : URL signée courte durée après check RBAC.",
            "Antivirus / types MIME / taille max déjà partiels : durcir la allowlist.",
            "Politique de rétention documentaire (brouillon) + suppression compte (déjà amorcée V15).",
            "Contrats : garder PDFBox, pointer le storage au lieu de la DB si applicable.",
        ],
        [
            "CDN public sur les documents privés.",
            "OCR / vérif automatisée des pièces (Phase C / plus tard).",
        ],
        [
            "Plus de colonne content BYTEA pour les nouveaux uploads. Colonne storage_key.",
            "Secrets bucket hors code. Environnements séparés dev/staging/prod.",
        ],
        "Un CV n'est plus dans PostgreSQL, un employeur autorisé le télécharge, un lien "
        "copié hors session expire, un inconnu reçoit 403.",
        [
            "Upload trop gros / mauvais type rejeté.",
            "Candidat télécharge son propre fichier. Autre candidat : non.",
        ],
        ["Fournisseur storage et région (cohérence RGPD / pays cibles)."],
    )

    sprint_page(
        "S7",
        "Recette MVP Hire — gate GO / NO-GO",
        "2 semaines  ·  Phase A  ·  Gel des features",
        "GATE",
        GREEN,
        "Ce sprint n'ajoute pas de module. Il prouve que les 19 critères MVP et les parcours P0 "
        "candidat / employeur / abonnement / country (pays déjà à l'onboarding) tiennent. "
        "Sans GO écrit, la Phase B n'ouvre pas.",
        [
            "Matrice de tests des 19 critères CDC développeur, statut et preuve (capture / log).",
            "Parcours P0 startup : candidat, employeur, abonnement — happy path, erreur, vide, loading, 403, mobile.",
            "Tests backend manquants sur onboarding, auth, jobs, candidates. Au moins les chemins P0.",
            "Passe sécurité : permissions, uploads, secrets, rate limit, HTTPS local/staging.",
            "Responsive réel (pas seulement Tailwind présent) : signup, recherche, pipeline, contrat, admin.",
            "Checklist GO/NO-GO du CDC startup (produit, UX, tech, sécu, QA, back-office, data, handover partiel).",
            "Bugs bloquants corrigés. Anomalies résiduelles listées et acceptées par le PO.",
        ],
        [
            "Toute nouvelle feature « tant qu'on y est » (matching, IA, coaching, i18n complète).",
            "Refonte visuelle globale.",
        ],
        [
            "Environnement staging stable, données de démo, backups testés au moins une fois.",
        ],
        "PO signe GO ou NO-GO. NO-GO = correctifs ciblés, pas ouverture S8.",
        [
            "Les 19 cases ont une preuve.",
            "Aucun secret dans le repo.",
            "Rollback de déploiement documenté (même simple).",
        ],
        ["Qui signe le GO : Fondatrice / PO."],
    )

    # ------------------------------------------------------------------ PHASE B INTRO
    pdf.set_section("PHASE B  ·  ÉCOSYSTÈME")
    pdf.add_page()
    pdf.h1("Phase B — Modules écosystème")
    pdf.rule_box(
        "CONDITION D'ENTRÉE",
        "GO MVP Hire signé (S7). Socle billing (S4), mailer (S1), storage (S6) et notifs (S3) "
        "sont réutilisés. On n'invente pas un deuxième système d'utilisateurs, de paiement "
        "ou d'admin. Chaque module = package backend + routes front + permissions déjà seedées "
        "+ écrans admin du même module.",
    )
    pdf.body(
        "Ordre choisi : du plus simple / plus CRUD vers le plus chargé en états. "
        "Cela suit le classement de complexité du CDC développeur tout en restant une "
        "roadmap chronologique (le CDC disait que le classement n'était pas un calendrier : "
        "ici, si, volontairement)."
    )
    pdf.h2("Patron obligatoire de chaque module (copier tel quel)")
    pdf.bullets(
        [
            "Package Java dédié (ex. coaching, marketplace). Pas de logique dans UserService.",
            "Entités du CDC data model. Migrations Flyway. Indexes. Pas de ddl-auto update.",
            "Endpoints documentés OpenAPI. Permissions existantes V16 branchées réellement.",
            "Page publique déjà là : la connecter ou la laisser marketing, mais ne pas dupliquer.",
            "Workspace /app/... : remplacer ModuleWorkspacePage par le métier.",
            "Admin /admin/... : liste, modération, suspension — plus de stub.",
            "Recherche : filtres du module + pays/ville. Pagination.",
            "CTA unique : contacter / devis / réserver / s'inscrire — un verbe par écran.",
            "Notifications via le moteur central. Fichiers via storage S6.",
            "Paiement via S4 si le module encaisse. Sinon devis seulement.",
        ]
    )

    sprint_page(
        "S8",
        "Services B2B — annuaire et devis",
        "2 semaines  ·  Phase B  ·  Complexité basse/moyenne",
        "APRÈS GO HIRE",
        ORANGE,
        "Premier module écosystème volontairement CRUD + workflow simple. Il valide le patron "
        "module (profil pro, catalogue, devis, admin) avant le calendrier du coaching.",
        [
            "Page prestataire : identité, services, zones, médias, statut vérif, slug.",
            "Catégories CDC : technique, ops, business, aménagement, expertise, contenu — administrables.",
            "Recherche + filtres géographiques.",
            "Demande de devis : formulaire, pièces, notif prestataire, historique dashboard.",
            "Admin : valider, suspendre, mettre en avant.",
        ],
        ["Avis complets (option, si temps). Marketplace produits. Paiement de la prestation."],
        ["Entités ServiceProvider, ServiceOffer, QuoteRequest."],
        "Une salle vérifiée envoie un devis, le prestataire le voit, l'admin peut masquer la page.",
        ["Visiteur voit le catalogue public. Devis = compte connecté."],
        None,
    )

    sprint_page(
        "S9",
        "Marketplace matériel — catalogue + devis",
        "2 semaines  ·  Phase B  ·  Phase 1 CDC",
        "APRÈS GO HIRE",
        ORANGE,
        "Le CDC développeur tranche Phase 1 = vitrine + devis, pas le panier. Interdiction "
        "d'ouvrir commandes, stocks, livraisons, commissions multi-vendeurs dans ce sprint.",
        [
            "Fournisseur, produits, catégories (machines, cardio, HYROX, etc. — admin).",
            "Fiche : photos, vidéos (lien ou upload), technique, prix indicatif, CTA devis.",
            "Demande de devis réutilisant le pattern S8 autant que possible.",
            "Admin produits / catégories / suspension.",
        ],
        ["Panier, checkout, commission, remboursement, tracking colis."],
        ["Entités Supplier/Brand, Product, Category, QuoteRequest (partagé ou typé)."],
        "Un club demande un devis sur une machine, le fournisseur est notifié.",
        ["Produit brouillon invisible au public. Produit suspendu retiré."],
        ["Confirmer catalogue+devis (recommandé : OUI)."],
    )

    sprint_page(
        "S10",
        "Coaching privé — agenda, résa, packs",
        "2 semaines  ·  Phase B  ·  Complexité élevée",
        "APRÈS GO HIRE + S4",
        ORANGE,
        "Module à états : disponibilités, anti double-booking, packs, avis après séance. "
        "Il réutilise le paiement S4. Ne pas bricoler un deuxième Stripe.",
        [
            "Profil coach (souvent le professionnel Hire + flag coaching.manage).",
            "Services : durée, prix, packs 1/5/10/mensuel paramétrables.",
            "Agenda : créneaux, exceptions, blocage à la réservation.",
            "Parcours particulier : recherche, créneau, paiement, confirmation, rappel (mail S1).",
            "Solde de séances, expiration pack.",
            "Avis uniquement si séance statut terminé.",
            "Admin : coachs, réservations, litiges simples.",
        ],
        ["Vidéo live intégrée. Programme d'entraînement complet (S14). Matching IA."],
        [
            "Entités CoachService, Availability, Booking, CoachingPack, Review.",
            "Concurrence : contrainte d'unicité créneau. Transaction DB.",
        ],
        "Un particulier paie 1 séance, le créneau disparaît, le coach est notifié, un avis "
        "n'est possible qu'après.",
        ["Double clic réservation = une seule booking.", "Annulation selon règle PO."],
        ["Commission plateforme, politique d'annulation, résa payante vs contact (CDC : à valider). Recommandation : résa + paiement, c'est le cœur du module."],
    )

    sprint_page(
        "S11",
        "Academy — formations et sessions",
        "2 semaines  ·  Phase B",
        "APRÈS GO HIRE",
        ORANGE,
        "Calendrier, capacité, inscriptions, paiement session. Même patron que coaching "
        "mais côté organisme.",
        [
            "Organisme, formation, session (date, lieu/online, langue, capacité, prix, certif éventuelle).",
            "Inscription + paiement S4 + liste participants.",
            "Places restantes. Session complète = refus propre.",
            "Admin académies / sessions.",
        ],
        ["LMS complet, replay, examens automatisés, badges blockchain."],
        ["Academy, Course, Session, Enrollment, Certificate."],
        "Inscription payante jusqu'à capacité, puis refus. L'organisme voit la liste.",
        ["Session passée non achetable."],
        ["Inscription simple vs parcours certifiant payant."],
    )

    sprint_page(
        "S12",
        "Events — agenda et inscriptions",
        "2 semaines  ·  Phase B",
        "APRÈS GO HIRE",
        ORANGE,
        "Compétitions, salons, conférences. Favoris événements. Inscription ; billetterie "
        "seulement si décision écrite.",
        [
            "Événement : détail, lieu, pays, dates, organiseur, médias, statut.",
            "Inscription / favoris / promotion admin.",
            "Recherche geo. Pages publiques SEO-friendly (contrairement aux candidats).",
        ],
        ["Billetterie complexe multi-tarifs si non décidée. App mobile check-in."],
        ["Event, Venue, Organizer, Registration."],
        "Un membre s'inscrit, l'organisateur voit la liste, l'admin peut dépublier.",
        ["Événement d'un autre pays : visibilité selon règle Global+Pays (même simple)."],
        ["Inscription gratuite vs payante."],
    )

    sprint_page(
        "S13",
        "News & Knowledge Center",
        "2 semaines  ·  Phase B  ·  Contenu",
        "APRÈS GO HIRE",
        ORANGE,
        "Pages publiques indexables. Auteurs, catégories, pays/global. Modération.",
        [
            "Article : titre, média, corps, catégorie, auteur, portée pays/global, statut.",
            "Liste, recherche, partage, SEO (title, canonical, sitemap).",
            "Admin contenu / responsable contenu (permission content.publish).",
        ],
        ["CMS tiers obligatoire. Réseau social interne."],
        ["Article, Author, Tag, ModerationStatus."],
        "Un article publié est lisible sans compte ; un brouillon non. Sitemap à jour.",
        ["Article d'un pays masqué si switch pays l'exige (règle simple documentée)."],
        None,
    )

    sprint_page(
        "S14",
        "Eat Healthy + Workout Programs",
        "2 semaines  ·  Phase B  ·  Contenus experts",
        "APRÈS GO HIRE",
        ORANGE,
        "CDC startup : recettes et programmes avec auteur, vérif, date, catégorie, pays, "
        "disclaimer. Pas de conseil médical personnalisé.",
        [
            "Recettes : filtres, objectifs, favoris, cadre responsable visible.",
            "Programmes : niveau, objectif, séances, progression selon droits (entitlement S4 si premium).",
            "Créateurs / EXPERT_CREATOR déjà au catalogue de rôles : les brancher.",
            "Modération contenus experts.",
        ],
        ["Plans nutritionnels médicaux. Coach IA. Wearables."],
        ["Recipe, WorkoutProgram, WorkoutSession, Progress."],
        "Un membre filtre une recette, met en favori un programme, voit le disclaimer.",
        ["Contenu non vérifié : masqué ou badge clairement non vérifié selon PO."],
        None,
    )

    # PHASE C
    sprint_page(
        "S15",
        "Matching scoring explicable",
        "2 semaines  ·  Phase C  ·  Interdit avant données stables",
        "APRÈS S2 + GO HIRE",
        NAVY2,
        "CDC : commencer par un score paramétrable (métier, skills, expérience, langues, "
        "certifs, localisation, mobilité, dispo, salaire). L'IA et le NLP sont hors sprint. "
        "Le matching ne remplace jamais la recherche manuelle S2.",
        [
            "Score 0–100 + raisons affichées (pourquoi ce candidat / cette offre).",
            "Pondérations administrables (pas magiques dans le code).",
            "Recommandations sur fiche offre et fiche candidat.",
            "Pas de boîte noire.",
        ],
        ["LLM, parsing d'offres en langage naturel, auto-shortlist irréversible."],
        ["Job de recalcul asynchrone si le volume l'exige."],
        "Un employeur comprend pourquoi un profil est à 72 et peut ignorer la reco.",
        ["Changer un poids en admin change les scores au prochain calcul."],
        None,
    )

    sprint_page(
        "S16",
        "Signature électronique réelle + Global / Pays / i18n",
        "2 semaines  ·  Phase C",
        "APRÈS GO HIRE",
        NAVY2,
        "Le mock de signature suffit au MVP fonctionnel. Pour la valeur juridique, prestataire "
        "externe. En parallèle : architecture Global+Pays du CDC startup (langue, monnaie, "
        "contenus, switcher pays) — aujourd'hui le pays est à l'onboarding mais l'UI est FR en dur.",
        [
            "ElectronicSignatureProvider réel (Yousign / équivalent) derrière l'interface déjà prévue.",
            "Webhooks existants branchés. PDF final archivé (storage S6).",
            "i18n front (clés), formats dates / nombres / devises.",
            "CountryConfig : langue, devise, activation pays. Switcher. Mémorisation.",
            "Préparer RTL si l'arabe est retenu — ne pas le fausse-coder si NON.",
        ],
        ["Traduction complète de tout le back-office en 4 langues si non staffé. Qualité > couverture."],
        ["Ne pas dupliquer le code par pays. Un binaire, des configs."],
        "Un contrat signé chez le prestataire revient COMPLETED. Changer de pays adapte langue/devise sans recréer le compte.",
        ["Pays désactivé : pas d'inscription locale."],
        ["Prestataire signature + langues V1 + RTL oui/non."],
    )

    sprint_page(
        "S17",
        "Analytics, SEO public, observabilité",
        "2 semaines  ·  Phase C",
        "APRÈS GO HIRE",
        NAVY2,
        "Le CDC startup exige un plan de tracking avant le développement final des events. "
        "On instrumente ce qui existe. KPI : acquisition, activation, hire outcome, trust, reliability. "
        "Pas de projections de CA inventées.",
        [
            "Dictionnaire d'événements : nom, trigger, propriétés, user, pays, module.",
            "Funnels inscription → profil → candidature / offre → contact.",
            "SEO : pages publiques, sitemap, canonical, meta. Toujours noindex candidats.",
            "Logs structurés, métriques API, alertes paiement / mail / disque.",
            "Health checks déjà là : les brancher au monitoring.",
        ],
        ["Data warehouse. Attribution pub payante complexe."],
        ["Aucun PII inutile dans l'outil analytics. Consentement cookies si tracking tiers."],
        "Le PO voit inscriptions, candidatures, erreurs 5xx, sans demander une requête SQL.",
        ["Événement mal nommé = corrigé dans le dictionnaire, pas de doublon silencieux."],
        ["Outil analytics retenu."],
    )

    sprint_page(
        "S18",
        "Hardening, PWA / mobile, handover",
        "2 semaines  ·  Phase C  ·  GO LIVE",
        "GATE LIVE",
        GREEN,
        "Fermeture opérationnelle : CI, backups restaurés, rollback, documentation, propriété "
        "des comptes, checklist GO LIVE du CDC. Mobile : PWA ou natif selon décision — "
        "l'API-first rend ce choix non bloquant pour le métier déjà livré.",
        [
            "CI : build, tests, lint. Staging ≠ prod. Secrets manager.",
            "Backup auto + restauration testée. RPO/RTO écrits.",
            "PWA ou plan apps (store, push) selon décision.",
            "Handover CDC : Figma s'il existe, code, env, inventaire SaaS, guide admin, PV de remise.",
            "Correctifs de sécu et dépendances.",
        ],
        ["Rewrite. Nouveau module métier."],
        ["Comptes cloud au nom de FITNESS UPLINK."],
        "GO LIVE signé. L'équipe ops administre sans les développeurs au quotidien.",
        ["Checklist CDC p.23 : toutes les cases GO ou écart accepté écrit."],
        ["PWA vs natif."],
    )

    # ------------------------------------------------------------------ DEV RULES
    pdf.set_section("06  ·  GARDE-FOUS QUOTIDIENS")
    pdf.add_page()
    pdf.h1("06  ·  Garde-fous pendant le développement")
    pdf.h2("Avant d'ouvrir une PR")
    pdf.bullets(
        [
            "La story cite un sprint (S1…S18) ou S0 (correctif). Sinon elle est hors carte.",
            "Permission backend testée (cas autorisé + 403).",
            "Pas de nouveau tarif / pays / catégorie / rôle magique dans le front.",
            "Liste paginée. Fichier privé = check + URL signée (après S6).",
            "Notification = événement central, pas un SMTP local au controller.",
            "Migration Flyway nommée, réversible si possible. Pas de Hibernate ddl-auto update.",
            "Tests du chemin heureux + un cas d'erreur. Recette manuelle staging si P0.",
        ]
    )
    pdf.h2("Architecture des packages (à respecter)")
    pdf.kv_table(
        [
            ("access, auth, user, catalog", "Socle. Toute l'app en dépend."),
            ("notifications, billing (S4), files (S6)", "Socle transverse. Interdit de les recopier dans un module."),
            ("jobs, talent, contracts, admin", "Domaine Hire. Enrichir ici jusqu'à S7."),
            ("coaching, marketplace, services…", "Un package par module, à partir de S8 seulement."),
            ("common", "Erreur API, sécu, OpenAPI. Pas de métier Hire dedans."),
        ]
    )
    pdf.h2("Ce qu'il est interdit de faire")
    pdf.mini_table(
        ["Interdit", "Pourquoi", "Faire plutôt"],
        [
            ["Coder Coaching en Phase A", "Recruitment first, MVP incomplet", "Noter l'idée, attendre S10"],
            ["Prix en dur dans PricingPage", "CDC : admin, dates d'effet", "API plans S4"],
            ["if (role === 'ADMIN') dans le JSX seul", "RBAC contourné", "permission code + API 403"],
            ["Nouvelle table users_coaching_users", "Compte unique", "Même User + permissions"],
            ["URL publique /uploads/uuid.pdf", "Docs privés", "URL signée S6"],
            ["Matcher IA dès maintenant", "CDC : après données stables", "S15 scoring"],
            ["2e système d'auth pour l'admin", "Un compte, des rôles", "SUPER_ADMIN déjà là"],
            ["Stocker un secret dans application.yml commité", "Security gate", "Env / secret manager"],
        ],
        [58, 62, 62],
    )

    # ------------------------------------------------------------------ MATRICE
    pdf.set_section("07  ·  MATRICE MODULES")
    pdf.add_page()
    pdf.h1("07  ·  Matrice modules × sprints")
    pdf.mini_table(
        ["Module", "S0", "Phase A", "Phase B", "Phase C"],
        [
            ["Auth / comptes", "Login JWT", "S1 e-mail + reset", "Réutilisé", "S16 i18n compte"],
            ["RBAC", "V16 live", "S5 audit", "Brancher perms modules", "—"],
            ["Onboarding profils", "Live", "S2 confidentialité", "Champs module si besoin", "—"],
            ["Hire recherche", "q= texte", "S2 filtres", "—", "S15 matching"],
            ["Hire offres / pipeline", "Live", "S3 notifs", "—", "—"],
            ["Contrats", "Mock sign", "S6 fichiers", "—", "S16 e-sign réel"],
            ["Vérification", "Admin live", "S1 mails + S5 audit", "Vérif pages pro", "—"],
            ["Billing", "Page statique", "S4 complet", "Encaissement modules", "Commissions avancées"],
            ["Notifications", "In-app contrat", "S1 + S3", "Chaque module", "Push S18"],
            ["Messagerie", "Absente", "S3 Hire", "Règles par module", "—"],
            ["Admin", "Users / vérif / rôles", "S5", "Admin par module", "S17 KPI"],
            ["Services", "Marketing", "Interdit", "S8", "—"],
            ["Marketplace", "Marketing", "Interdit", "S9 devis", "Transaction plus tard"],
            ["Coaching", "Stub", "Interdit", "S10", "—"],
            ["Academy", "Stub", "Interdit", "S11", "—"],
            ["Events", "Stub", "Interdit", "S12", "—"],
            ["News", "Marketing", "Interdit", "S13", "SEO S17"],
            ["Eat / Workout", "Absent", "Interdit", "S14", "—"],
            ["Mobile", "Web responsive", "S7 recette", "—", "S18 PWA/natif"],
        ],
        [40, 32, 40, 38, 32],
    )

    # ------------------------------------------------------------------ RECETTE
    pdf.set_section("08  ·  RECETTE & GO")
    pdf.add_page()
    pdf.h1("08  ·  Critères de sortie des phases")
    pdf.h2("GO MVP Hire (fin S7) — obligatoire")
    pdf.bullets(
        [
            "Les 19 critères du CDC développeur (§20) ont une preuve sur staging.",
            "Parcours P0 candidat, employeur, abonnement : DoD UX (erreurs, vides, loading, permissions, responsive).",
            "Aucun bug bloquant. Secrets absents du repo. Backup restauré une fois.",
            "L'admin opère users, vérifs, plans, modération sans SQL.",
            "Profils candidats non indexés. Paiement testé (succès + échec).",
            "Signature PO sur la checklist CDC startup §22.",
        ]
    )
    pdf.h2("GO module écosystème (fin de chaque S8–S14)")
    pdf.bullets(
        [
            "Patron module respecté (API, permissions, admin, notifs, fichiers).",
            "Happy path + 403 + empty + pagination.",
            "Pas de nouveau silo d'utilisateurs ni de paiement parallèle.",
            "UAT PO du module. Anomalies listées.",
        ]
    )
    pdf.h2("GO LIVE (fin S18)")
    pdf.bullets(
        [
            "Checklist CDC startup §22 complète.",
            "Handover §21 : code, accès, docs, inventaire tiers.",
            "Monitoring et rollback. Comptes au nom du projet.",
        ]
    )
    pdf.warn_box(
        "DATE DU 15 SEPTEMBRE 2026",
        "Le CDC startup mentionne le 15 septembre 2026 comme date de pilotage. "
        "Cette roadmap à 18 sprints de 2 semaines dépasse largement cette date si on vise "
        "l'écosystème entier. Pour cette échéance : viser un GO Phase A (MVP Hire) "
        "avec équipe parallèle et gel strict du périmètre, pas les 9 modules. "
        "Toute compression = couper de la Phase B, jamais de la qualité du gate S7.",
    )

    # ------------------------------------------------------------------ ANNEXE
    pdf.set_section("09  ·  ANNEXE OPÉRATIONNELLE")
    pdf.add_page()
    pdf.h1("09  ·  Annexe — checklists de démarrage")
    pdf.h2("Backlog technique transverse (glisser dans le sprint qui touche le sujet)")
    pdf.bullets(
        [
            "Remplacer les KPI admin hardcodés à 0 dès que la donnée existe (S5 / S4).",
            "Brancher @PreAuthorize ou équivalent sur tous les controllers, pas seulement admin.",
            "Tests frontend absents : au minimum un E2E P0 en S7.",
            "Orphelins à brancher ou supprimer : HealthPage, BillingPage, CoachingPage.",
            "OpenAPI à jour à chaque sprint (déjà SpringDoc).",
            "Rate limiting : étendre au-delà de l'auth si abuse contact / upload.",
        ]
    )
    pdf.h2("Ordre des tickets type d'un sprint métier")
    pdf.mini_table(
        ["#", "Ticket", "Sortie"],
        [
            ["1", "Décisions PO fermées + contrat d'interface API", "Doc courte"],
            ["2", "Migration + entités + contraintes", "Flyway"],
            ["3", "Service + permissions + tests", "API verte"],
            ["4", "Controller + erreurs normalisées", "OpenAPI"],
            ["5", "UI happy path + états", "Staging"],
            ["6", "Admin + notifs + fichiers", "Ops ready"],
            ["7", "Recette P0 + correctifs", "Done"],
        ],
        [12, 100, 70],
    )
    pdf.h2("Rappel vision produit (à ne pas diluer)")
    pdf.info_box(
        "CŒUR  ·  IDENTIFIER → VÉRIFIER → CONNECTER → RECRUTER",
        "Extension seulement ensuite : coacher, former, équiper, informer, événementialiser. "
        "Si une demande produit raccourcit le cœur pour décorer un module, la roadmap dit non.",
    )
    pdf.ln(4)
    pdf.set_font(FONT_B, "", 11)
    pdf.set_text_color(*NAVY)
    pdf.multi_cell(182, 6, "Fin du document de référence")
    pdf.ln(1)
    pdf.set_font(FONT, "", 9)
    pdf.set_text_color(*SLATE)
    pdf.multi_cell(
        182,
        5,
        "Mettre à jour le statut des sprints à chaque démo. Ne pas créer une deuxième roadmap "
        "parallèle dans le chat ou un tableur sans reporter ici. Version suivante : V1.1 après S1.",
    )
    pdf.ln(8)
    pdf.set_fill_color(*NAVY)
    pdf.rect(14, pdf.get_y(), 182, 28, "F")
    y = pdf.get_y()
    pdf.set_xy(20, y + 6)
    pdf.set_font(FONT_B, "", 10)
    pdf.set_text_color(*WHITE)
    pdf.cell(170, 6, "FITNESS UPLINK  ·  THE GLOBAL FITNESS ECOSYSTEM")
    pdf.set_xy(20, y + 14)
    pdf.set_font(FONT, "", 8.5)
    pdf.set_text_color(191, 219, 254)
    pdf.cell(170, 6, "Roadmap développement par sprints  ·  V1.0  ·  9 septembre 2026  ·  Confidentiel")

    pdf.output(str(OUT))
    print(f"Wrote {OUT}")
    return OUT


if __name__ == "__main__":
    build()
