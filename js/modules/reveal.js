/**
 * FICHIER : reveal.js
 * RÔLE    : Animations d'apparition au scroll pour les éléments marqués
 *           [data-reveal]. Les règles d'opacité/transform vivent dans
 *           layout/_grid.css, scopées sous .has-js (classe ajoutée sur
 *           <html> par main.js) : sans JavaScript, les éléments restent
 *           visibles par défaut.
 */

const revealElements = document.querySelectorAll('[data-reveal]');

/**
 * Initialise l'observation des éléments à révéler au scroll. Ne fait
 * rien si aucun élément [data-reveal] n'est présent dans le DOM.
 */
export function init() {
  if (!revealElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    },
    { threshold: .15, rootMargin: '0px 0px -10% 0px' }
  );

  revealElements.forEach((element) => observer.observe(element));
}
