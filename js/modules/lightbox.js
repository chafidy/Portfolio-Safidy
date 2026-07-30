/**
 * FICHIER : lightbox.js
 * RÔLE    : Ouvre une fiche projet détaillée en modal (image + titre +
 *           description complète + tags, à la manière d'une publication
 *           Facebook). S'appuie sur <dialog> (showModal/close) pour la
 *           mécanique de modale — focus, restitution du focus et
 *           fermeture via Échap sont gérés nativement par le navigateur.
 *           Sans JavaScript, chaque vignette reste un lien classique qui
 *           ouvre l'image dans un nouvel onglet (voir href sur
 *           .project-card__thumb-trigger).
 */

const grid = document.getElementById('project-grid');
const dialog = document.getElementById('lightbox');
const image = document.getElementById('lightbox-image');
const title = document.getElementById('lightbox-title');
const text = document.getElementById('lightbox-text');
const tags = document.getElementById('lightbox-tags');
const closeButton = dialog?.querySelector('.lightbox__close');

/**
 * Ouvre la lightbox avec l'image et la description complètes du projet
 * dont fait partie le déclencheur cliqué.
 * @param {HTMLAnchorElement} trigger - Le lien .project-card__thumb-trigger cliqué.
 */
function openLightbox(trigger) {
  const card = trigger.closest('.project-card');
  const thumb = trigger.querySelector('img');
  const cardTitle = card?.querySelector('.project-card__title');
  const cardText = card?.querySelector('.project-card__text');
  const cardTags = card?.querySelector('.tag-list');

  image.src = trigger.href;
  image.alt = thumb ? thumb.alt : '';
  title.textContent = cardTitle ? cardTitle.textContent.replace(/\s+/g, ' ').trim() : '';
  text.textContent = cardText ? cardText.textContent.replace(/\s+/g, ' ').trim() : '';
  tags.innerHTML = cardTags ? cardTags.innerHTML : '';

  dialog.showModal();
}

/**
 * Initialise la lightbox des photos de projet. Ne fait rien si la
 * grille de projets, le dialog ou l'image d'aperçu sont absents du DOM.
 */
export function init() {
  if (!grid || !dialog || !image || !title || !text || !tags) return;

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
