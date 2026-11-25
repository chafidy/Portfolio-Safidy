/**
 * FICHIER : cursor.js
 * RÔLE    : Anneau contextuel qui suit la souris (le curseur système reste
 *           visible — l'anneau l'accompagne, il ne le remplace pas).
 *             - au repos : un anneau qui suit avec un léger retard élastique ;
 *             - sur un lien / bouton : il s'enroule autour de l'élément
 *               (pilule ou cercle) et se laisse un peu attirer par la souris ;
 *             - sur un visuel de projet / un article : une pastille pleine
 *               avec un libellé (« Voir », « Lire ») ;
 *             - sur du texte : un petit point ;
 *             - au clic : il s'enfonce.
 *           Souris uniquement ; désactivé si moins d'animations demandées.
 *           Un seul élément fixe, déplacé par transform. La boucle
 *           s'arrête dès que l'anneau est arrivé.
 * DÉPEND  : components/_cursor.css
 */

const INTERACTIVE = 'a[href], button, summary, [role="button"], label[for], .filter-pill';
const TEXT = 'p, h1, h2, h3, h4, blockquote, figcaption, li, .lead';

/* Pastilles à libellé : sélecteur → texte affiché */
const LABELS = [
  ['[data-cursor-label]', (el) => el.dataset.cursorLabel],
  ['.project-card__thumb-trigger', () => 'Voir'],
  ['.post-card__link', () => 'Lire'],
];

const SIZE = { idle: 34, dot: 8, badge: 78, large: 56 };
const SNAP_PADDING = 6;
const MAGNET = 0.15; // part du mouvement de la souris transmise en mode « enroulé »

/**
 * Initialise l'anneau. Ne fait rien sur écran tactile ou si
 * l'utilisateur préfère réduire les animations.
 */
export function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'cursor-ring__label';
  ring.append(label);
  document.body.append(ring);
  document.documentElement.classList.add('has-cursor-ring');

  const pointer = { x: -100, y: -100 };
  // géométrie affichée (cur) et visée (target) : centre, largeur, hauteur, rayon, échelle
  const cur = { x: -100, y: -100, w: SIZE.idle, h: SIZE.idle, r: SIZE.idle / 2, s: 1 };
  const target = { ...cur };

  let mode = 'idle';
  let snapEl = null;
  let snapRadius = 0;
  let visible = false;
  let pressed = false;
  let rafId = 0;
  let lastTime = 0;

  function setMode(next, text = '') {
    if (next !== mode) {
      ring.dataset.mode = next;
      mode = next;
    }
    if (label.textContent !== text) label.textContent = text;
  }

  /** L'élément sous le curseur décide de la forme de l'anneau. */
  function classify(el) {
    snapEl = null;
    if (!el || !el.closest) {
      setMode('idle');
      return;
    }

    for (const [selector, getText] of LABELS) {
      const match = el.closest(selector);
      if (match) {
        setMode('badge', getText(match));
        return;
      }
    }

    const interactive = el.closest(INTERACTIVE);
    if (interactive) {
      const rect = interactive.getBoundingClientRect();
      // Grandes zones cliquables (cartes, images) : on ne les entoure pas
      if (rect.width > 360 || rect.height > 160) {
        setMode('large');
        return;
      }
      snapEl = interactive;
      snapRadius = parseFloat(getComputedStyle(interactive).borderTopLeftRadius) || 10;
      setMode('snap');
      return;
    }

    if (el.closest(TEXT)) {
      setMode('dot');
      return;
    }
    setMode('idle');
  }

  function computeTarget() {
    target.x = pointer.x;
    target.y = pointer.y;
    target.s = pressed ? 0.84 : 1;

    if (mode === 'snap' && snapEl && snapEl.isConnected) {
      const rect = snapEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      target.x = cx + (pointer.x - cx) * MAGNET;
      target.y = cy + (pointer.y - cy) * MAGNET;
      target.w = rect.width + SNAP_PADDING * 2;
      target.h = rect.height + SNAP_PADDING * 2;
      target.r = Math.min(target.h / 2, snapRadius + SNAP_PADDING);
      return;
    }

    const size = SIZE[mode] || SIZE.idle;
    target.w = size;
    target.h = size;
    target.r = size / 2;
    // La pastille se place en bas à droite du pointeur : ce qui est
    // sous la souris reste visible.
    if (mode === 'badge') {
      target.x = pointer.x + size * 0.4;
      target.y = pointer.y + size * 0.4;
    }
  }

  const approach = (current, goal, rate, dt) => current + (goal - current) * (1 - Math.exp(-rate * dt));

  function frame(now) {
    rafId = 0;
    const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
    lastTime = now;
    computeTarget();

    cur.x = approach(cur.x, target.x, 22, dt);   // position : rapide mais souple
    cur.y = approach(cur.y, target.y, 22, dt);
    cur.w = approach(cur.w, target.w, 15, dt);   // taille : un peu plus douce
    cur.h = approach(cur.h, target.h, 15, dt);
    cur.r = approach(cur.r, target.r, 15, dt);
    cur.s = approach(cur.s, target.s, 26, dt);

    ring.style.width = `${cur.w.toFixed(1)}px`;
    ring.style.height = `${cur.h.toFixed(1)}px`;
    ring.style.borderRadius = `${cur.r.toFixed(1)}px`;
    ring.style.transform = `translate3d(${(cur.x - cur.w / 2).toFixed(1)}px, ${(cur.y - cur.h / 2).toFixed(1)}px, 0) scale(${cur.s.toFixed(3)})`;

    const moving = Math.abs(target.x - cur.x) > 0.2 || Math.abs(target.y - cur.y) > 0.2
      || Math.abs(target.w - cur.w) > 0.2 || Math.abs(target.h - cur.h) > 0.2
      || Math.abs(target.s - cur.s) > 0.002;
    // En mode « enroulé », l'élément peut bouger seul (survol, scroll) : on suit
    if (moving || mode === 'snap') requestFrame();
    else lastTime = 0;
  }

  function requestFrame() {
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function hide() {
    visible = false;
    ring.classList.remove('is-visible');
  }

  window.addEventListener('pointermove', (event) => {
    if (event.pointerType !== 'mouse') return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    if (!visible) {
      visible = true;
      cur.x = pointer.x;
      cur.y = pointer.y;
      ring.classList.add('is-visible');
    }
    requestFrame();
  }, { passive: true });

  document.addEventListener('pointerover', (event) => {
    if (event.pointerType !== 'mouse') return;
    classify(event.target);
    requestFrame();
  }, { passive: true });

  document.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse') return;
    pressed = true;
    requestFrame();
  }, { passive: true });

  document.addEventListener('pointerup', () => {
    pressed = false;
    requestFrame();
  }, { passive: true });

  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);

  // La page peut défiler sous une souris immobile : on revérifie la cible
  window.addEventListener('scroll', () => {
    if (!visible) return;
    classify(document.elementFromPoint(pointer.x, pointer.y));
    requestFrame();
  }, { passive: true });
}
