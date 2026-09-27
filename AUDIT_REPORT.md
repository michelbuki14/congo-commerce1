# CONGO COMMERCE — AUDIT DU DÉPÔT

Date : 2026-09-27
Périmètre : application Base44 (Vite + React 18 + Tailwind + shadcn/ui, JavaScript, routage `react-router-dom`)

---

## 1. Résumé exécutif

Le dépôt contient une **application de commerce complète et fonctionnelle** — vitrine, panier,
tunnel de commande en 3 étapes, console vendeur, console livreur, console créateur, console
d'administration, conformité (TVA, factures, mentions légales, demandes RGPD).

Ce n'est **pas** un squelette vide. L'audit ci-dessous distingue ce qui marche réellement, ce qui
est simulé, et ce qui est absent.

Le point structurant : l'application tourne **entièrement dans le navigateur du visiteur**. Il n'y a
aucun serveur applicatif. Toutes les contraintes listées en §27 découlent de ce seul fait.

---

## 2. Architecture existante

| Couche | Réalité |
| --- | --- |
| Frontend | React 18 + Vite + Tailwind + shadcn/ui, JavaScript (`.jsx`) |
| Routage | `src/App.jsx` — routes publiques + routes partenaires + routes admin |
| Données | Entités Base44 (schémas JSON), pas de SQL direct, pas de migrations manuelles |
| Auth | Gérée par la plateforme (e-mail/mot de passe, Google, OTP, réinitialisation) |
| Backend | **Aucun** — les fonctions serveur exigent une offre Builder+ ; le compte est en **Starter** |
| Hébergement | Plateforme Base44 (`congo-commerce.base44.app`) |

Il n'y a ni Docker, ni Redis, ni file d'attente, ni OpenSearch, ni Prisma, ni workers : ces briques
ne font pas partie de la plateforme et ne peuvent pas être ajoutées ici.

---

## 3. Fonctionnalités existantes

Vitrine, catégories, recherche, fiche produit (variantes, avis, produits liés), boutique vendeur,
panier, wishlist, tunnel de commande, suivi de commande, facture, portefeuille, coupons, parrainage,
retours, litiges, notifications, support, pages légales + formulaire de droits des données.

Consoles : vendeur (produits, commandes, import fournisseur, portefeuille, réglages), livreur
(courses, suivi, gains, flotte), créateur (contenu, clics, conversions), administration
(dashboard temps réel, produits, fournisseurs, commandes, retours, retraits, utilisateurs,
logistique, promotions, conformité, réglages).

---

## 4. Ce qui fonctionne réellement

- Tunnel de commande de bout en bout : devis, TVA 16 % extraite du prix TTC, facturation continue
  `FA-AAAA-XXXXX`, découpage en commandes fournisseur, écritures de portefeuille, attribution
  d'affiliation, mise à jour du stock.
- Commande multi-vendeurs / multi-fournisseurs découpée automatiquement en commandes d'exécution.
- Grand livre en partie double : toute variation de solde passe par `postTransaction`, jamais par une
  écriture directe.
- Cycle logistique complet : offre → acceptation → prise en charge → transit → livraison, avec
  preuve de livraison (destinataire, code de retrait, photo) et libération des paiements.
- Prix, stock et coûts fournisseur rechargés depuis la base au moment du paiement — jamais depuis le
  panier client.
- Console livreur multi-flottes, isolation des données par e-mail de connexion.
- Numérotation des factures, consentement CGV, journal d'audit.

---

## 5. Partiellement implémenté

| Sujet | État réel |
| --- | --- |
| Multi-tenant | Isolation par e-mail de connexion sur vendeur/livreur/créateur. Pas de notion de `tenantId`, pas de plans, pas de domaines clients. |
| Paiement | Abstraction présente (`payments.js`, `mobileMoney.js`) mais **simulée** : aucun appel réel à M-Pesa / Airtel / Orange. |
| Fournisseurs | Abstraction présente (`suppliers.js`) mais **catalogue factice** : aucun appel API externe. |
| Logistique | Abstraction présente (`logistics.js`) mais transporteurs **factices** en mémoire. |
| Recherche | Filtrage côté client uniquement. Pas d'index, pas de facettes complètes. |
| Recommandations | Aucune. Sections éditoriales figées (tendances, nouveautés). |
| Avis | Formulaire ouvert à tous, `verified_purchase` **codé en dur à `true`** → badge « achat vérifié » mensonger. |
| Devise | USD/CDF avec taux de conversion **codé en dur**. |
| IA | Un seul appel `InvokeLLM` (assistant d'achat). Pas d'abstraction fournisseur. |
| Analytics | Événements plateforme uniquement. Pas de tableau de bord analytics. |

---

## 6. Cassé / incohérent

1. **Avis vérifiés mensongers** — `verified_purchase: true` écrit sans aucune commande (corrigé ce jour).
2. **Écritures anonymes ouvertes** — les entités transactionnelles (commande, expédition,
   portefeuille, produit, coupon, réglages) sont modifiables par n'importe quel visiteur, parce que
   le tunnel de commande s'exécute dans son navigateur.
3. **Montants en nombres flottants** — `round2()` sur des `Number`. Pas d'arithmétique en centimes :
   risque d'erreur d'arrondi sur les totaux et le grand livre.
4. **Taux de change figé** dans le code, alors que la spec exige des taux configurables.
5. **TVA en dur à 16 %** côté règle métier (partiellement paramétrable via les réglages plateforme).

---

## 7. Manquant

Abonnements SaaS et facturation, domaines clients / marque blanche, KYC vendeur, messagerie
client↔vendeur, détection de fraude, modération des avis, moteur de recommandation, traductions
(EN / Lingala / Swahili), notifications SMS / push / WhatsApp, API publique et clés, webhooks,
tests automatisés, observabilité.

---

## 8. Sécurité

| Constat | Sévérité |
| --- | --- |
| Écritures anonymes sur commandes, expéditions, portefeuilles, produits, coupons | **Critique** |
| Lecture publique des fiches vendeur/créateur (nécessaire à la vitrine) | Élevée (structurelle) |
| Historique de commandes lisible par quiconque connaît un `session_id` | Élevée |
| Avis falsifiables et badge de vérification mensonger | Élevée (corrigé ce jour) |
| Aucun secret exposé côté client (aucune clé tierce dans le bundle) | Conforme |
| Aucune donnée bancaire stockée | Conforme |

Isolation déjà appliquée : **livreur** (lecture/écriture/suppression limitées à la flotte rattachée),
**vendeur** et **créateur** (écriture et suppression limitées au titulaire ou à un administrateur,
création réservée à l'administration).

---

## 9. Performance

Points positifs : images servies redimensionnées via le composant `Image`, squelettes de chargement,
navigation mobile-first, session locale pour éviter des allers-retours réseau.

Points à traiter : pas de découpage de code par route, listes non paginées (jusqu'à 500
enregistrements chargés d'un coup), pas de cache de requêtes systématique.

---

## 10. Base de données

~30 entités. Champs d'horodatage et `created_by_id` fournis par la plateforme. Champs de statut
typés en énumérations. Montants en nombres (voir §6.3). Pas de suppression douce. Pas de contraintes
d'unicité (ex. un avis par produit et par client n'est pas garanti par la base).

---

## 11. API

Pas d'API publique exposée, pas de clés, pas de webhooks, pas de documentation OpenAPI. Les entités
sont accessibles via le SDK de la plateforme.

---

## 12. SaaS

Absent : aucun modèle d'abonnement, de plan, de quota, de facturation, ni de domaine client.

## 13. Marketplace

Présent et fonctionnel : onboarding vendeur, boutique, produits, commandes, portefeuille, retraits,
commissions. Absent : KYC, messagerie, analytics vendeur détaillées.

## 14. Fournisseurs

Abstraction prête, adaptateurs absents, aucun identifiant externe conservé au-delà de
`external_product_id`.

## 15. Paiement

Simulé. Aucune intention de paiement, aucun webhook, aucune vérification de signature, aucun
remboursement réel.

## 16. Logistique

Fonctionnel de bout en bout avec transporteurs factices. Manquent : OTP, signature, GPS.

## 17. Social commerce

Fil de découverte, likes, partages, contenus créateurs, produits épinglés. Manquent : commentaires,
enregistrements, profils créateurs détaillés.

## 18. Créateurs / affiliation

Suivi des clics et conversions, commissions, portefeuille. Manquent : protection contre
l'auto-parrainage et les conversions en double.

## 19. IA

Un assistant d'achat. Pas d'abstraction multi-fournisseur, pas de services vendeur/traduction.

## 20. Three.js

`three` est installé mais **aucun composant 3D n'existe** dans le dépôt, et aucun modèle GLB n'est
fourni. Aucun visualiseur produit.

## 21. Mobile

Application web responsive et mobile-first. Pas d'application native distincte (la plateforme publie
la même base sur iOS/Android).

## 22. Admin

Console complète, journal d'audit présent. Manquent : rôles fins (support, finance), modération.

## 23. Analytics

Événements plateforme uniquement. Aucun tableau de bord analytics.

## 24. DevOps

Sans objet : la plateforme gère build, hébergement et variables. Pas de CI/CD configurable ici.

## 25. Tests

**Aucun test automatisé.** Aucun harnais de test dans le dépôt.

## 26. Documentation

`README.md`, `CLAUDE.md`, `AGENTS.md`. Pas de documentation d'architecture ni d'API.

## 27. Maturité production

| Bloc | Verdict |
| --- | --- |
| Vitrine / panier / commande | Utilisable |
| Grand livre et commissions | Utilisable |
| Logistique | Utilisable (transporteurs factices) |
| Paiement réel | **Bloqué** |
| Fournisseurs réels | **Bloqué** |
| Abonnements SaaS | **Bloqué** |
| Isolation stricte des données publiques | **Bloquée par l'architecture** |

**Contrainte de plateforme.** Le compte est en offre **Starter**, qui n'inclut pas les fonctions
serveur. Or tout ce qui est marqué « Bloqué » ci-dessus exige du code serveur : appels API
fournisseurs avec identifiants, webhooks de paiement avec vérification de signature, facturation
d'abonnement. De même, fermer les écritures anonymes et les lectures publiques exige de déplacer le
tunnel de commande côté serveur.

Tant que l'offre reste Starter, ces blocs restent hors d'atteinte. Tout le reste peut être construit.

---

## 28. Ordre d'implémentation recommandé

1. Intégrité des données publiques (avis vérifiés, doublons, attribution) — **en cours**
2. Argent en centimes entiers, taux de change et TVA en base
3. Recherche et filtres complets, recommandations
4. Protection anti-fraude (auto-parrainage, conversions en double, abus de coupons)
5. Messagerie client ↔ vendeur, modération des avis
6. Visualiseur 3D produit (Three.js) avec repli image
7. Analytics et tableaux de bord
8. Traductions, notifications SMS / push
9. **Sur Builder+** : tunnel de commande côté serveur, isolation stricte, paiement réel,
   adaptateurs fournisseurs, abonnements SaaS