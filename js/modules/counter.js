/**
 * FICHIER : counter.js
 * RÔLE    : Anime les chiffres clés (data-counter) de 0 jusqu'à leur
 *           valeur cible lorsqu'ils entrent dans le viewport. Le HTML
 *           contient déjà la valeur finale : sans JavaScript, le
 *           chiffre correct reste affiché tel quel.
 */

const counters = document.querySelectorAll('[data-counter]');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DURATION_MS = 1200;

/**
 * Anime un compteur de 0 vers sa valeur cible.
 * @param {HTMLElement} element - Élément portant les attributs data-target / data-suffix.
 */
function animateCounter(element) {
  const target = Number(element.dataset.target);
  const suffix = element.dataset.suffix ?? '';

  if (prefersReducedMotion || Number.isNaN(target)) {
    element.textContent = `${target}${suffix}`;
    return;
  }

  const startTime = performance.now();

  function step(now) {
    const progress = Math.min((now - startTime) / DURATION_MS, 1);
    const value = Math.round(target * progress);
    element.textContent = `${value}${suffix}`;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/**
 * Initialise l'observation des compteurs. Ne fait rien si aucun
 * élément [data-counter] n'est présent dans le DOM.
 */
export function init() {
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: .5 }
  );

  counters.forEach((counter) => observer.observe(counter));
}
