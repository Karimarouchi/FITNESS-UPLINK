# Rôles, revue UI et choix de navigation

Document basé sur la lecture du code (`RoleAccountsSeeder.java`, migrations, `sidebarNav.ts`, `AppLayout.tsx`, `shellNav.ts`).
Le rendu n'a pas été testé dans le navigateur pour chaque rôle.

## 1. Rôles de la plateforme

| Rôle | Ce qu'il fait | Menu actuel |
|---|---|---|
| **SUPER_ADMIN / admin** | Utilisateurs, vérifications, rôles, modules, configuration | Menu latéral (back-office) |
| **MEMBER** | Cherche un coach, réserve, s'inscrit à des formations, achète | « Rail » courbe |
| **CANDIDATE** (emploi / coaching / les deux) | Profil pro, opportunités, candidatures, contrats | Rail |
| **COACH** | Agenda, services, packs | Rail |
| **EMPLOYER** et **GYM** | Recherche de talents, pipeline, offres, favoris, contrats | Rail |
| **ACADEMY** | Formations, contrôle d'entrée QR | Rail |
| **SUPPLIER** | Articles, messages | Rail |
| **SERVICE_PROVIDER** | Services, demandes reçues | Rail |
| **EVENT_ORGANIZER** | Événements | Rail |
| **EXPERT_CREATOR** | Contenus | Rail |

> Le rôle GYM apparaît dans le seeder mais pas dans les migrations lues : à vérifier (permissions propres ou non).

Comptes de démo : un login par rôle, créés par `RoleAccountsSeeder` (ex. `membre@demo.fitnessuplink.test`).

## 2. Avis strict sur l'UI

### Problèmes

1. **Trois systèmes de navigation côte à côte.** `AppNavbar`, `BoSidebar` et `RailMenu` coexistent. `AppLayout` garde une branche « navbar » alors que `usesWorkspaceShell` renvoie toujours vrai pour un utilisateur connecté : code mort et signe d'hésitation de design.
2. **Menu hybride.** Pour les membres, le sidebar et le rail sont rendus ensemble. À tester sur mobile.
3. **Pages « legacy » et « themed » mélangées.** `themedPage` est une liste de chemins écrite à la main. Une page absente a un contenu clair dans un shell sombre, et la liste dérive à chaque nouvelle page.
4. **Mode sombre généré à partir du clair.** Corrections par `!important` et sélecteurs longs ; une même couleur vient de plusieurs règles. Il faut des variables CSS par thème.
5. **Titres XXL en minuscules (Kalila / Exo 2).** Efficace sur la landing, fatigant dans l'app connectée (jusqu'à 108 px, 5 lignes).
6. **Trop de couleurs d'accent.** Bleu logo, orange, `#7ba3ff`, et `--vt-lime` qui vaut en réalité de l'orange : la palette a changé sans nettoyage du nommage.
7. **Navigation incohérente.** « Catalogue » mène à des pages publiques hors de `/app` avec une autre mise en page (`/academie`, `/candidates`, `/coaches`, `/marketplace/products`).
8. **Chemins sans préfixe.** `/users`, `/contracts`, `/candidates`, `/favorites`, `/notifications` côtoient `/app/...`, ce qui complique les gardes de route et `themedPage`.
9. **Menu « Compte » en dropdown** pour 3 liens : un clic de plus sans gain.

### Améliorations (par priorité)

1. Supprimer `AppNavbar` si elle est inutilisée ; trancher entre sidebar et rail par famille de rôles (section 3).
2. Passer à des tokens de thème (`--bg`, `--text`, `--accent`) et retirer les `!important` du mode sombre.
3. Garder les catalogues dans `/app` (ex. `/app/academy/catalog`).
4. Définir une échelle typographique pour l'app (titres 28–36 px, sans minuscules forcées) ; réserver les gros titres à la landing.
5. Un seul accent (orange), texte blanc/gris ; le bleu seulement pour les liens.
6. États vides utiles : toujours proposer une action (déjà fait pour « Mes inscriptions »).
7. Parcours de premier accès par rôle.

## 3. Navbar ou sidebar, selon le rôle

Règle : **sidebar si le rôle gère beaucoup de sections, navbar s'il en a peu.**

| Rôle | Recommandation | Raison |
|---|---|---|
| Admin / SUPER_ADMIN | **Sidebar** (obligatoire) | 10+ entrées, sous-groupes, usage long |
| EMPLOYER, GYM | **Sidebar** | 6 à 8 entrées quotidiennes, usage type CRM |
| ACADEMY, COACH | **Sidebar** | Outils de travail : agenda, services, packs, formations, QR |
| MEMBER, CANDIDATE | **Navbar** | 4 à 6 entrées, surtout de la consultation, contenu pleine largeur |
| SUPPLIER, SERVICE_PROVIDER, EVENT_ORGANIZER, EXPERT_CREATOR | **Navbar** | 2 à 4 entrées : une sidebar est disproportionnée |

Résumé : navbar pour les rôles « consommateurs » et les petits rôles de publication, sidebar pour les rôles « gestionnaires ». Le rail courbe actuel remplace les deux dans tous les cas et ne sert vraiment aucun des deux usages.

## 4. Prochaine étape suggérée

Retirer le code mort de la navbar, puis faire passer EMPLOYER, GYM, ACADEMY et COACH sur la sidebar.
