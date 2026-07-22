/**
 * FICHIER : navigation.js
 * RÔLE    : Menu mobile (burger), fond translucide du header au scroll,
 *           et scroll-spy (aria-current sur le lien de section visible).
 *           Aucun listener de scroll brut : tout passe par
 *           IntersectionObserver.
 */

const header = document.querySelector('.header');
const burger = document.getElementById('header-burger');
const nav = document.getElementById('primary-navigation');
const navList = nav?.querySelector('.header__nav-list');
const navLinks = nav ? [...nav.querySelectorAll('.header__nav-link')] : [];
const sentinel = document.getElementById('header-sentinel');
const sections = [...document.querySelectorAll('main section[id]')];
const desktopQuery = window.matchMedia('(min-width: 900px)');

/**
 * Ouvre ou ferme le panneau de navigation mobile.
 * @param {boolean} open - État souhaité du menu.
 */
function setMenuOpen(open) {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Fermer le menu de navigation' : 'Ouvrir le menu de navigation');
  nav.classList.toggle('header__nav--open', open);
}

/**
 * Met à jour le lien de navigation actif en fonction de la section
 * actuellement visible dans le viewport.
 * @param {string} sectionId - Identifiant de la section active.
 */
function setActiveLink(sectionId) {
  navLinks.forEach((link) => {
    const isActive = link.getAttribute('href') === `#${sectionId}`;
    if (isActive) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Initialise le module navigation : menu mobile, header sticky translucide
 * et scroll-spy. Ne fait rien si le header ou la nav sont absents du DOM.
 */
export function init() {
  if (!header || !burger || !nav) return;

  burger.addEventListener('click', () => {
    const isOpen = burger.getAttribute('aria-expanded') === 'true';
    setMenuOpen(!isOpen);
  });

  navList?.addEventListener('click', (event) => {
    if (event.target.closest('.header__nav-link')) {
      setMenuOpen(false);
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
      setMenuOpen(false);
      burger.focus();
    }
  });

  desktopQuery.addEventListener('change', (event) => {
    if (event.matches) setMenuOpen(false);
  });

  if (sentinel) {
    const headerObserver = new IntersectionObserver(([entry]) => {
      header.classList.toggle('header--scrolled', !entry.isIntersecting);
    });
    headerObserver.observe(sentinel);
  }

  if (sections.length && navLinks.length) {
    const spyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveLink(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    sections.forEach((section) => spyObserver.observe(section));
  }
}
