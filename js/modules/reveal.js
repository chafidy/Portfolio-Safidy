/**
 * FICHIER : reveal.js
 * RÔLE    : Animations d'apparition au scroll pour les éléments marqués
 *           [data-reveal]. Les règles d'opacité/transform vivent dans
 *           layout/_grid.css, scopées sous .has-js (classe ajoutée sur
 *           <html> par main.js) : sans JavaScript, les éléments restent
 *           visibles par défaut.
 */

const revealElements = document.querySelectorAll('[data-reveal]');

/* Décalage entre éléments qui entrent dans le viewport au même moment
   (cartes d'une même grille). Plafonné pour ne jamais faire attendre. */
const STAGGER_MS = 70;
const MAX_DELAY_MS = 350;

/**
 * Initialise l'observation des éléments à révéler au scroll. Ne fait
 * rien si aucun élément [data-reveal] n'est présent dans le DOM.
 */
export function init() {
  if (!revealElements.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      // Les entrées d'un même lot apparaissent ensemble : on les décale
      // dans l'ordre du document.
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target)
        .sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

      visible.forEach((element, index) => {
        const delay = Math.min(index * STAGGER_MS, MAX_DELAY_MS);
        element.style.setProperty('--reveal-delay', `${delay}ms`);
        element.classList.add('is-visible');
        observer.unobserve(element);
        // Une fois arrivé, on rend à l'élément ses propres transitions
        // (survol des cartes) : sans ça il hériterait de la durée et du
        // délai du reveal.
        const onEnd = (event) => {
          if (event.target !== element || event.propertyName !== 'transform') return;
          element.removeEventListener('transitionend', onEnd);
          element.style.removeProperty('--reveal-delay');
          element.removeAttribute('data-reveal');
        };
        element.addEventListener('transitionend', onEnd);
      });
    },
    { threshold: .15, rootMargin: '0px 0px -10% 0px' }
  );

  revealElements.forEach((element) => observer.observe(element));
}
