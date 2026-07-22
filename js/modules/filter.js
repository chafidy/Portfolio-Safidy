/**
 * FICHIER : filter.js
 * RÔLE    : Filtrage des projets par catégorie via délégation d'événements
 *           sur la liste de pilules. Sans JavaScript, tous les projets
 *           restent visibles et les boutons de filtre sont simplement
 *           inertes (dégradation gracieuse).
 */

const filterList = document.querySelector('.filter-list');
const projectCards = [...document.querySelectorAll('.project-card')];
const statusEl = document.querySelector('.projects__status');

/**
 * Affiche ou masque chaque carte projet selon la catégorie sélectionnée
 * et met à jour le message d'état accessible.
 * @param {string} filterValue - Catégorie choisie ("all" pour tout afficher).
 */
function applyFilter(filterValue) {
  let visibleCount = 0;

  projectCards.forEach((card) => {
    const categories = card.dataset.category.split(' ');
    const matches = filterValue === 'all' || categories.includes(filterValue);
    card.classList.toggle('project-card--hidden', !matches);
    if (matches) visibleCount += 1;
  });

  if (statusEl) {
    const plural = visibleCount > 1 ? 's' : '';
    statusEl.textContent = `${visibleCount} projet${plural} affiché${plural} sur ${projectCards.length}`;
  }
}

/**
 * Met à jour l'état visuel et ARIA des pilules de filtre.
 * @param {HTMLElement} activeButton - Bouton correspondant au filtre actif.
 */
function setActiveButton(activeButton) {
  filterList.querySelectorAll('.filter-pill').forEach((button) => {
    const isActive = button === activeButton;
    button.classList.toggle('filter-pill--active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}

/**
 * Initialise le filtrage des projets. Ne fait rien si la liste de
 * filtres ou la grille de projets sont absentes du DOM.
 */
export function init() {
  if (!filterList || !projectCards.length) return;

  filterList.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-pill');
    if (!button) return;

    setActiveButton(button);
    applyFilter(button.dataset.filter);
  });

  applyFilter('all');
}
