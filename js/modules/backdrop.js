/**
 * FICHIER : backdrop.js
 * RÔLE    : Fond vivant de toutes les pages.
 *             1. Une trame de points lilas (couche CSS .backdrop-grid, jamais
 *                repeinte : seulement déplacée, en léger parallaxe au scroll).
 *             2. Un canvas par-dessus : autour de la souris, les points
 *                grossissent et virent au violet (effet loupe) ; un clic ou
 *                un tap envoie une onde couleur miel à travers la trame.
 *           Les éléments sont injectés ici : aucune modification HTML
 *           nécessaire, et les pages générées (blog) en profitent aussi.
 *           Désactivé si l'utilisateur demande moins d'animations. La
 *           boucle d'animation s'arrête dès qu'il n'y a plus rien à bouger.
 * DÉPEND  : layout/_backdrop.css
 */

const SPACING = 28;        // pas de la trame (px) — doit correspondre au CSS
const DOT_R = 1.3;         // rayon d'un point au repos
const LENS_RADIUS = 160;   // portée de la loupe autour du curseur
const PARALLAX = 0.15;     // la trame défile à 15 % de la vitesse du scroll

const COLORS = {
  lens: '#6D6FD8',   // --clay-purple-500
  ripple: '#E9B94F', // --clay-honey
};

/**
 * Initialise le fond animé. Ne fait rien si l'utilisateur préfère
 * réduire les animations ou si le canvas n'est pas supporté.
 */
export function init() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const grid = document.createElement('div');
  grid.className = 'backdrop-grid';
  grid.setAttribute('aria-hidden', 'true');

  const canvas = document.createElement('canvas');
  canvas.className = 'backdrop';
  canvas.setAttribute('aria-hidden', 'true');
  const ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  document.body.prepend(grid, canvas);

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let lastTime = 0;

  // Position lissée de la loupe et son intensité (0 = absente, 1 = pleine)
  const lens = { x: 0, y: 0, targetX: 0, targetY: 0, strength: 0, targetStrength: 0, placed: false };
  const ripples = []; // { x, y, age }

  /** Décalage vertical courant de la trame (parallaxe), dans [0, SPACING[. */
  const gridShift = () => (((-window.scrollY * PARALLAX) % SPACING) + SPACING) % SPACING;

  function moveGrid() {
    grid.style.transform = `translate3d(0, ${gridShift().toFixed(1)}px, 0)`;
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    moveGrid();
    requestFrame();
  }

  /**
   * Appelle `draw(x, y, distance)` pour chaque point de la trame situé à
   * moins de `reach` px de (cx, cy). Les coordonnées reproduisent
   * exactement celles de la couche CSS (.backdrop-grid démarre à
   * -SPACING px, points au centre de chaque cellule).
   */
  function forEachDot(cx, cy, reach, draw) {
    const originY = -SPACING + gridShift();
    const i0 = Math.floor((cx - reach) / SPACING);
    const i1 = Math.ceil((cx + reach) / SPACING);
    const j0 = Math.floor((cy - reach - originY) / SPACING);
    const j1 = Math.ceil((cy + reach - originY) / SPACING);
    for (let i = i0; i <= i1; i += 1) {
      const x = i * SPACING + SPACING / 2;
      if (x < -SPACING || x > width + SPACING) continue;
      for (let j = j0; j <= j1; j += 1) {
        const y = originY + j * SPACING + SPACING / 2;
        if (y < -SPACING || y > height + SPACING) continue;
        draw(x, y, Math.hypot(x - cx, y - cy));
      }
    }
  }

  function dot(x, y, radius, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  /** Lissage indépendant du nombre d'images par seconde. */
  const approach = (current, target, rate, dt) => current + (target - current) * (1 - Math.exp(-rate * dt));

  function frame(now) {
    rafId = 0;
    const dt = Math.min(0.05, (now - (lastTime || now)) / 1000);
    lastTime = now;

    lens.x = approach(lens.x, lens.targetX, 16, dt);
    lens.y = approach(lens.y, lens.targetY, 16, dt);
    lens.strength = approach(lens.strength, lens.targetStrength, 8, dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 1. Loupe : les points proches du curseur grossissent et se colorent
    if (lens.strength > 0.01) {
      forEachDot(lens.x, lens.y, LENS_RADIUS, (x, y, d) => {
        if (d > LENS_RADIUS) return;
        const f = 1 - d / LENS_RADIUS;
        const s = f * f * (3 - 2 * f) * lens.strength; // smoothstep
        dot(x, y, DOT_R + 2.6 * s, COLORS.lens, 0.1 + 0.6 * s);
      });
    }

    // 2. Ondes au clic : un anneau de points miel qui s'élargit et s'efface
    for (let k = ripples.length - 1; k >= 0; k -= 1) {
      const ripple = ripples[k];
      ripple.age += dt;
      const life = 1.3;
      const fade = 1 - ripple.age / life;
      if (fade <= 0) {
        ripples.splice(k, 1);
        continue;
      }
      const radius = ripple.age * 560;
      const band = 70;
      forEachDot(ripple.x, ripple.y, radius + band, (x, y, d) => {
        const k2 = 1 - Math.abs(d - radius) / band;
        if (k2 <= 0) return;
        dot(x, y, DOT_R + 3.4 * k2 * fade, COLORS.ripple, Math.min(1, 1.2 * k2 * fade));
      });
    }
    ctx.globalAlpha = 1;

    const busy = ripples.length > 0
      || Math.abs(lens.targetStrength - lens.strength) > 0.01
      || Math.abs(lens.targetX - lens.x) > 0.4
      || Math.abs(lens.targetY - lens.y) > 0.4;
    if (busy) requestFrame();
    else lastTime = 0;
  }

  function requestFrame() {
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function addRipple(x, y) {
    ripples.push({ x, y, age: 0 });
    if (ripples.length > 4) ripples.shift();
    requestFrame();
  }

  /* ---------- Entrées ---------- */

  if (finePointer) {
    window.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (!lens.placed) {
        lens.x = event.clientX;
        lens.y = event.clientY;
        lens.placed = true;
      }
      lens.targetX = event.clientX;
      lens.targetY = event.clientY;
      lens.targetStrength = 1;
      requestFrame();
    }, { passive: true });

    const hideLens = () => {
      lens.targetStrength = 0;
      requestFrame();
    };
    document.documentElement.addEventListener('pointerleave', hideLens);
    window.addEventListener('blur', hideLens);
  }

  // Souris : onde dès l'appui. Tactile : seulement sur un vrai tap (click),
  // pour ne pas déclencher d'onde à chaque début de défilement.
  // (pointerType n'est pas fiable sur l'événement click dans tous les
  // navigateurs : on retient celui du dernier pointerdown.)
  let lastPointerType = '';
  window.addEventListener('pointerdown', (event) => {
    lastPointerType = event.pointerType;
    if (event.pointerType === 'mouse' && event.button === 0) addRipple(event.clientX, event.clientY);
  }, { passive: true });
  window.addEventListener('click', (event) => {
    // detail === 0 : clic clavier (Entrée/Espace), sans position réelle
    if (event.detail === 0 || lastPointerType === 'mouse') return;
    addRipple(event.clientX, event.clientY);
  }, { passive: true });

  let scrollRaf = 0;
  window.addEventListener('scroll', () => {
    if (!scrollRaf) {
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        moveGrid();
      });
    }
    // la trame bouge sous une souris immobile : on redessine la loupe
    if (lens.strength > 0.01 || ripples.length) requestFrame();
  }, { passive: true });

  window.addEventListener('resize', resize);
  resize();
}
