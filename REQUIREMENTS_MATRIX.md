# CONGO COMMERCE — MATRICE DES EXIGENCES

Statuts : `COMPLETE` · `PARTIAL` · `BROKEN` · `MISSING` · `MOCK` · `NEEDS_HARDENING` · `BLOCKED` (exige du code serveur → Builder+)

| Exigence | Statut | Existant | Manquant | Action |
| --- | --- | --- | --- | --- |
| Vitrine / catalogue | COMPLETE | Accueil, catégories, fiches, boutiques | — | — |
| Panier & tunnel de commande | COMPLETE | 3 étapes, consentement, TVA, facture | — | — |
| Commande multi-vendeurs | COMPLETE | Découpage en commandes d'exécution | — | — |
| Grand livre financier | COMPLETE | Portefeuille + transactions, partie double | Montants en centimes | hardening |
| Commissions vendeur / créateur | COMPLETE | Calculées au paiement, payées à la livraison | — | — |
| Logistique & suivi | COMPLETE | Offres, transitions, preuve de livraison | OTP, signature, GPS | hardening |
| Console vendeur | COMPLETE | Produits, commandes, import, portefeuille | KYC, messagerie | — |
| Console livreur | COMPLETE | Courses, suivi, gains, multi-flottes | — | — |
| Console créateur | COMPLETE | Contenu, clics, conversions, commissions | Protection auto-parrainage | hardening |
| Console admin | COMPLETE | 11 écrans + dashboard temps réel | Rôles fins | — |
| Conformité & RGPD | COMPLETE | CGV, mentions, confidentialité, droits | — | — |
| Isolation vendeur / livreur / créateur | COMPLETE | Écriture et suppression limitées au titulaire | Lecture publique vitrine | blocked |
| Isolation stricte des données publiques | BLOCKED | Règles posées | Tunnel de commande côté serveur | blocked |
| Avis vérifiés | COMPLETE | Achat vérifié réel, un avis par client | Modération | — |
| Paiement mobile money réel | MOCK | Abstraction + simulacre | Adaptateurs M-Pesa / Airtel / Orange | blocked |
| Webhooks & remboursements | MISSING | — | Intentions, signatures, réconciliation | blocked |
| Fournisseurs internationaux | MOCK | Interface + catalogue factice | Adaptateurs API + identifiants | blocked |
| Abonnements SaaS | COMPLETE | Entités `Plan` / `Subscription` / `TenantInvoice`, moteur `src/lib/saas.js`, pages `/pricing`, `/tenant`, `/admin/tenants` | Encaissement automatique par prestataire (Builder+) | — |
| Domaines clients / marque blanche | PARTIAL | Entité `TenantDomain`, enregistrement TXT, application des couleurs par domaine (`src/lib/tenancy.js`) | Provisionnement DNS/SSL automatique (Builder+) | — |
| Multi-tenant par `tenantId` | PARTIAL | Modèle complet (`Tenant`, `TenantMember`, rôles et permissions), isolation par e-mail de connexion + RLS | Rattachement de `tenant_id` à toutes les entités métier (migration) | build |
| Recherche & filtres | PARTIAL | Filtrage client | Facettes, index, tri avancé | build |
| Recommandations | MISSING | — | Moteur à règles | build |
| Anti-fraude | MISSING | — | Règles, score, revue | build |
| Messagerie client ↔ vendeur | MISSING | — | Fils, pièces jointes, modération | build |
| Analytics & tableaux de bord | PARTIAL | Événements plateforme | Agrégats et écrans | build |
| Three.js / 3D produit | MISSING | `three` installé, aucun composant | Visualiseur + repli image | build |
| Traductions EN / Lingala / Swahili | MISSING | Français uniquement | i18n | build |
| Notifications SMS / push | MISSING | E-mail + in-app | Abstraction fournisseur | blocked |
| API publique & clés | MISSING | — | Clés, quotas, documentation | blocked |
| Argent en centimes entiers | NEEDS_HARDENING | Nombres flottants arrondis | Arithmétique entière | hardening |
| Taux de change & TVA en base | NEEDS_HARDENING | Taux figé dans le code | Tables configurables | hardening |
| Tests automatisés | MISSING | — | Unitaires, intégration, E2E | build |
| Documentation d'architecture | PARTIAL | `AUDIT_REPORT.md` | `ARCHITECTURE.md`, `API.md`… | build |