# CONGO COMMERCE — IMPLEMENTATION_COMPLETE

Mise à jour : 2026-09-27
Périmètre : application Base44 (Vite + React 18 + Tailwind + shadcn/ui, JavaScript)

---

## 1. Architecture réellement implémentée

| Couche | Réalité |
| --- | --- |
| Frontend | React 18 + Vite + Tailwind + shadcn/ui, JavaScript (`.jsx`) |
| Routage | `src/App.jsx` — routes publiques, partenaires (`RequireLogin`), plateforme (`AdminOnly`) |
| Données | 34 entités Base44 (schémas JSON), RLS par entité |
| Auth | Gérée par la plateforme (e-mail/mot de passe, Google, OTP) |
| Backend | **Aucun** — les fonctions serveur exigent Builder+ (offre actuelle : Starter) |
| Hébergement | Plateforme Base44 |

Il n'y a **ni** PostgreSQL, **ni** Prisma, **ni** Redis, **ni** BullMQ, **ni** OpenSearch,
**ni** Docker, **ni** CI/CD, **ni** Next.js, **ni** application Flutter : ces briques ne font pas
partie de la plateforme et ne peuvent pas y être ajoutées. Tout ce qui suit est construit avec
l'équivalent Base44 (entités + RLS + composants React).

---

## 2. SaaS & multi-tenant — **implémenté ce jour**

### Entités créées

| Entité | Rôle |
| --- | --- |
| `Plan` | Catalogue des formules : prix mensuel/annuel, essai, quotas (produits, boutiques, vendeurs, membres), commission, fonctionnalités |
| `Tenant` | L'enseigne cliente : identité, coordonnées, statut, plan, sous-domaine, marque blanche (logo, couleurs, expéditeur e-mail), commission, TVA |
| `Subscription` | Cycle de vie : essai, actif, impayé, annulé, expiré + période en cours, résiliation programmée |
| `TenantInvoice` | Facture d'abonnement (`SA-AAAA-00001`) avec HT, TVA, TTC, statut, référence de paiement |
| `TenantMember` | Équipe de l'enseigne : rôles (administrateur, finance, support, vendeur, créateur, livreur) et 14 permissions granulaires |
| `TenantDomain` | Sous-domaine plateforme ou domaine personnalisé : jeton de vérification TXT, statut, SSL, domaine principal |
| `TenantUsageEvent` | Consommation par enseigne (vues, commandes…) pour les quotas et l'analytique |

### Logique métier (bibliothèques)

- `src/lib/plans.js` — catalogue, quotas, contrôle de fonctionnalité, pourcentage d'usage.
  Les prix et limites viennent **toujours** de la base ; les valeurs par défaut ne servent qu'avant amorçage.
- `src/lib/saas.js` — arithmétique de périodes, essai, changement de formule, résiliation
  (immédiate ou en fin de période), renouvellement, régularisation d'impayé, émission de facture,
  MRR et revenu annuel projeté.
- `src/lib/tenancy.js` — résolution de l'enseigne **par domaine** (visiteur anonyme sur un domaine
  vérifié) ou **par compte** (propriétaire / administrateur), application de la marque blanche aux
  variables de thème, portée des requêtes (`tenant_id` vide = stock de la plateforme).
- `src/lib/permissions.js` — rôles, permissions et attributions par défaut.

### Écrans

| Route | Rôle |
| --- | --- |
| `/pricing` | Grille publique des formules, bascule mensuel/annuel |
| `/tenant-onboarding` | Création d'enseigne : formule → identité → essai démarré, sous-domaine et administrateur créés |
| `/tenant` | Console enseigne : abonnement et quotas, factures, domaines, équipe et rôles, identité et marque blanche |
| `/admin/tenants` | Console plateforme : enseignes, abonnements actifs, MRR/ARR, édition des formules, encaissement, résiliation, validation des domaines, dernières factures |

### Marque blanche

Les couleurs de l'enseigne sont converties en variables CSS (`--primary`, `--ring`, `--accent`,
`--chart-1`) et appliquées automatiquement lorsqu'un visiteur arrive par un domaine vérifié.
Logo, bannière, expéditeur e-mail, TVA et commission sont stockés par enseigne.

---

## 3. Ce qui existait déjà et reste en place

Vitrine, catégories, recherche, fiche produit, boutique, panier, wishlist, tunnel de commande en
3 étapes (consentement, TVA 16 %, facture), découpage multi-vendeurs/multi-fournisseurs, grand livre
en partie double, commissions vendeur et créateur, logistique complète (offre, transit, preuve de
livraison, libération des paiements), consoles vendeur / livreur / créateur / administration,
retours, litiges, support, conformité RGPD, avis d'achat vérifié, page d'accueil sociale.

---

## 4. Bloqué par l'offre actuelle (Starter)

Ces blocs exigent du code serveur (Builder+) : ils sont conçus mais ne peuvent pas être activés ici.

| Bloc | Ce qui manque exactement |
| --- | --- |
| Paiement réel | Adaptateurs M-Pesa / Airtel Money / Orange Money appelant les API opérateur avec identifiants, webhooks signés, réconciliation. L'abstraction (`src/lib/payments.js`) et le simulacre étiqueté existent. |
| Fournisseurs réels | Adaptateurs API fournisseurs avec identifiants et import par lots. L'interface et le catalogue factice existent. |
| Écritures anonymes | Déplacer le tunnel de commande côté serveur pour fermer les écritures publiques. |
| Domaines | Provisionnement DNS/SSL automatique et vérification automatique du jeton TXT. |
| Facturation automatique | Prélèvement récurrent et relance des impayés par un job planifié. |
| Notifications SMS / push / WhatsApp | Envoi par prestataire avec identifiants. |
| API publique & webhooks | Clés, quotas, OpenAPI. |

---

## 5. Reste à construire (faisable sur cette offre)

1. Rattacher `tenant_id` aux entités métier (produits, vendeurs, commandes) et filtrer les consoles.
2. Trois.js : visualiseur produit avec paliers de performance et repli image (aucun modèle GLB fourni).
3. Moteur de recommandation à règles, recherche à facettes, filtres avancés.
4. Anti-fraude : auto-parrainage, conversions en double, abus de coupons, faux avis.
5. Messagerie client ↔ vendeur et modération des avis.
6. Tableaux de bord analytique (plateforme / enseigne / vendeur / créateur).
7. Argent en centimes entiers ; taux de change et TVA en base.
8. Traductions EN / Lingala / Swahili (clés de traduction).
9. Tests automatisés et observabilité.

---

## 6. Commandes

```bash
npm install          # dépendances
npm run dev          # développement local
npm run build        # build de production
npm run lint         # analyse statique
```

La mise en ligne se fait depuis la plateforme Base44 (aucun conteneur à construire ici).

## 7. Variables d'environnement

Aucune n'est requise pour l'application actuelle : le frontend ne détient aucun secret et aucun
identifiant tiers n'est présent dans le bundle. Les intégrations listées en §4 exigeront, côté
serveur uniquement : clés M-Pesa, Airtel Money, Orange Money, clés fournisseurs internationaux,
et un accès DNS pour la vérification des domaines.

## 8. Jeu d'essai

`Plan` (4 formules), deux enseignes de démonstration (`Démo — Enseigne A`, `Démo — Enseigne B`) avec
abonnement, domaine et équipe, étiquetées comme données de démonstration.

## 9. Limites connues

- Aucun montant n'est encaissé réellement : les abonnements sont suivis et facturés côté plateforme.
- L'isolation multi-enseigne repose sur la RLS par entité et sur le rattachement par `tenant_id` ;
  elle est complète pour les entités SaaS, partielle pour les entités métier (voir §5.1).
- Les permissions d'équipe sont appliquées dans l'interface et documentées, pas encore imposées par
  un serveur applicatif.