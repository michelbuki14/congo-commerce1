# CONGO COMMERCE — BRAND

Mise à jour : 2026-09-27. Reflete l'implémentation réelle (`public/brand/`, `src/index.css`, `src/components/BrandLogo.jsx`).

## 1. Concept

Connexion + commerce + mouvement + réseau digital. Monogramme C/C abstrait :
un C vert ouvert vers un second arc blanc, point central = la transaction.
Jamais de carte de l'Afrique en logo principal.

## 2. Fichiers (`public/brand/`)

| Fichier | Usage |
| --- | --- |
| `logo-primary.svg` | Logo horizontal, texte clair — fonds sombres, header, hero |
| `logo-dark.svg` | Logo horizontal, texte `#07110D` — fonds clairs, factures, e-mails |
| `logo-mono.svg` | Monochrome `#07110D` — gravure, reçus, fax, single-color |
| `logo-icon.svg` | Icône + favicon (`index.html`) |
| `social-avatar.svg` | Avatar 512px (fond `#07110D`) — Instagram, TikTok, X, WhatsApp |

`BrandLogo.jsx` charge le primaire en local (`/brand/logo-primary.svg`) —
aucune dépendance à un CDN pour l'identité.

## 3. Couleurs

| Token | Valeur | Rôle |
| --- | --- | --- |
| Vert primaire | `#12A87A` | CTA, liens, accents, `COMMERCE` du wordmark |
| Vert profond | `#0E8A64` | Variante fonds clairs |
| Encre | `#07110D` | Fonds sombres, texte mono |
| Ivoire | `#EDF2EE` | Texte sur sombre, second arc du symbole |
| Menthe | `#19C48D` | Point central, highlights |

Tokens CSS (`src/index.css`) : `--primary` / `--ring` = vert en mode clair,
vert clair en mode `.dark` ; fond dark = encre `#07110D`. Contraste : boutons
verts en semibold ≥ 3:1 ; texte courant reste encre/ivoire.

## 4. Voix

Confiante, moderne, claire, humaine, premium, africaine, globale.
Français par défaut ; jamais de jargon corporate inutile.

## 5. Motion

Transitions 150–250 ms, CTA avec feedback immédiat, `prefers-reduced-motion`
respecté (voir `Product3DViewer.jsx` : pas d'auto-rotation).
Animation logo (1–2 s) : réseau → tracés qui se connectent → symbole → wordmark.
