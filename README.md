# Portfolio — Safidy Raharijesy

Socle HTML / CSS / JavaScript vanilla du portfolio one-page de Safidy
Raharijesy (UI/UX Designer & Software Engineer, Madagascar). Aucun
framework, aucune librairie externe, aucun bundler — seul Google Fonts
est chargé depuis un CDN.

## Lancer le projet en local

Le JavaScript utilise des modules ES natifs (`type="module"`), qui ne
fonctionnent pas en ouvrant `index.html` directement via `file://`
(restrictions CORS des navigateurs sur les modules). Il faut servir le
dossier via un petit serveur HTTP local, par exemple :

```bash
python -m http.server 8000
# ou
npx serve .
```

Puis ouvrir `http://localhost:8000/`.

## Structure du projet

```
index.html                  Squelette sémantique complet, tout le contenu
css/
├── main.css                 Point d'entrée : uniquement des @import,
│                             dans l'ordre de cascade (tokens → reset →
│                             typo → layout → composants → sections)
├── base/
│   ├── _tokens.css           Toutes les custom properties (couleurs,
│   │                         ombres, rayons, typo, espacements, motion)
│   ├── _reset.css            Reset moderne minimal + prefers-reduced-motion
│   └── _typography.css       Styles de texte globaux + .eyebrow
├── layout/
│   ├── _grid.css             Conteneurs, rythme vertical, skip-link,
│   │                         reveal (scoping .has-js), et le FOOTER
│   │                         (pas de fichier dédié : traité comme le
│   │                         header, élément de layout global)
│   └── _header.css           Header sticky, burger mobile, nav pilule
├── components/
│   ├── _buttons.css          .btn, variantes --primary/--secondary/--ghost
│   ├── _cards.css            .card générique (services), --featured
│   ├── _tags.css             Tags de catégorie + pilules de filtre
│   ├── _forms.css            Champs de formulaire, focus, état d'erreur
│   ├── _cubes.css            Cubes décoratifs flottants (hero)
│   └── _lightbox.css         Aperçu plein écran (<dialog>) des photos de projet
└── sections/
    ├── _hero.css              Dont la rotation des rôles en CSS pur
    ├── _about.css
    ├── _services.css
    ├── _process.css
    ├── _projects.css
    ├── _testimonials.css
    ├── _community.css
    └── _contact.css
js/
├── main.js                  Point d'entrée : importe et initialise
│                             chaque module (aucune logique métier ici)
└── modules/
    ├── navigation.js         Burger, header sticky, scroll-spy
    ├── reveal.js              Apparition au scroll (IntersectionObserver)
    ├── counter.js             Compteurs animés (À propos)
    ├── filter.js              Filtrage des projets par catégorie
    ├── form.js                Validation temps réel + simulation d'envoi
    ├── theme.js               Préparation dark mode (structure seulement)
    └── lightbox.js            Aperçu plein écran des photos de projet
assets/
├── img/                     avatar-assis.png, avatar-debout.png, ...
├── project/                 Photos des 12 projets (p1.webp à p12.webp)
├── icons/                   (vide — icônes clay PNG à ajouter)
└── fonts/                   (vide — Google Fonts en fallback CDN)
```

## Conventions

- **CSS** : BEM strict (`.card`, `.card__icon`, `.card--featured`), zéro
  valeur magique — toute valeur réutilisée est un token dans
  `_tokens.css`. Mobile-first, breakpoints `640px` / `900px` / `1200px`
  en `min-width`. Aucun `!important` hors du reset global (nécessaire
  pour forcer `prefers-reduced-motion` partout).
- **JavaScript** : chaque module exporte une seule fonction `init()`,
  appelée depuis `main.js`. Sélecteurs DOM centralisés en constantes en
  tête de fichier, avec vérification d'existence (`if (!el) return;`) —
  aucune section ne peut faire planter le JS si elle est retirée du
  HTML. Les modules ne communiquent pas entre eux.
- **Accessibilité** : focus visible (outline miel 3px) sur tout élément
  interactif, ARIA uniquement là où le HTML natif ne suffit pas
  (`aria-expanded`, `aria-current`, `aria-live`, `aria-pressed`),
  hiérarchie de titres sans saut (un seul `<h1>`, puis `<h2>` par
  section, `<h3>` pour les sous-éléments).
- **Progressive enhancement** : tout le contenu est visible et
  utilisable sans JavaScript. Le formulaire de contact utilise la
  validation HTML native (`required`, `type="email"`) tant que
  `form.js` n'a pas pris le relais — c'est ce module qui active
  `form.noValidate` au chargement, pas un attribut statique dans le
  HTML.

## Ajouter un projet

Dans `index.html`, section `<section class="projects" id="projects">` :

1. Dupliquer un `<li class="project-card" data-category="...">` dans
   `<ul class="project-grid" id="project-grid">`.
2. `data-category` accepte une ou plusieurs valeurs séparées par un
   espace parmi `branding`, `ui-ux`, `web`, `packaging` (celles des
   pilules de filtre) — une autre valeur (ex. `mobile`) reste valide,
   la carte n'apparaîtra alors que sous le filtre « Tous ».
3. Adapter le titre (`<h3 class="project-card__title">`), le texte, et
   les `<li class="tag tag--*">` (variantes : `--purple`, `--honey`,
   `--leaf`, `--ink`).
4. Le filtrage (`js/modules/filter.js`) et le style (`_projects.css`)
   n'ont besoin d'aucune modification — ils lisent le DOM dynamiquement.

Pour ajouter une **nouvelle catégorie de filtre**, ajouter un bouton
`<button class="filter-pill" data-filter="...">` dans `.filter-list`
(avec `aria-pressed="false"`).

## Ajouter un service

Dans `index.html`, section `<section class="services" id="services">`,
dupliquer un `<article class="card">` dans `<ul class="card-grid">`
(utiliser `class="card card--featured"` pour la mise en avant visuelle
réservée à un seul service). Aucune modification CSS/JS nécessaire.

## Points restant à compléter (hors périmètre du socle)

- **CV** : `hero__actions` pointe vers
  `assets/cv-safidy-raharijesy.pdf`, qui n'existe pas encore — ajouter
  le fichier PDF à cet emplacement.
- **Réseaux sociaux** : les liens Facebook et Instagram du footer sont
  des `href="#"` en attente — le contenu source ne fournissait pas
  d'URL corrigée pour ces deux réseaux (contrairement à LinkedIn,
  Behance et GitHub, déjà corrigés).
- **Mode sombre** : `theme.js` est prêt (structure uniquement) mais
  n'a pas de bouton `[data-theme-toggle]` ni de tokens dark dans
  `_tokens.css` — à ajouter si le mode sombre est souhaité.
