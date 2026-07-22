/**
 * FICHIER : lightbox.js
 * RÔLE    : Ouvre les photos de projet en aperçu plein écran. S'appuie
 *           sur <dialog> (showModal/close) pour la mécanique de modale —
 *           focus, restitution du focus et fermeture via Échap sont
 *           gérés nativement par le navigateur. Sans JavaScript, chaque
 *           vignette reste un lien classique qui ouvre l'image dans un
 *           nouvel onglet (voir href sur .project-card__thumb-trigger).
 */

const grid = document.getElementById('project-grid');
const dialog = document.getElementById('lightbox');
const image = document.getElementById('lightbox-image');
const closeButton = dialog?.querySelector('.lightbox__close');

/**
 * Ouvre la lightbox avec l'image du déclencheur cliqué.
 * @param {HTMLAnchorElement} trigger - Le lien .project-card__thumb-trigger cliqué.
 */
function openLightbox(trigger) {
  const thumb = trigger.querySelector('img');
  image.src = trigger.href;
  image.alt = thumb ? thumb.alt : '';
  dialog.showModal();
}

/**
 * Initialise la lightbox des photos de projet. Ne fait rien si la
 * grille de projets, le dialog ou l'image d'aperçu sont absents du DOM.
 */
export function init() {
  if (!grid || !dialog || !image) return;

  grid.addEventListener('click', (event) => {
    const trigger = event.target.closest('.project-card__thumb-trigger');
    if (!trigger) return;
    event.preventDefault();
    openLightbox(trigger);
  });

  closeButton?.addEventListener('click', () => dialog.close());

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}
