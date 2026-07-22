/**
 * FICHIER : theme.js
 * RÔLE    : Préparation du mode sombre — structure uniquement, aucune
 *           implémentation visuelle dans ce socle (pas de tokens dark ni
 *           de bouton de bascule dans le HTML). Pour l'activer plus
 *           tard : ajouter un bouton [data-theme-toggle] au header et
 *           les tokens du mode sombre dans _tokens.css.
 */

const THEME_STORAGE_KEY = 'safidy-portfolio-theme';
const toggleButton = document.querySelector('[data-theme-toggle]');

/**
 * Applique un thème sur <html> et mémorise le choix.
 * @param {'light' | 'dark'} theme
 */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

/**
 * Initialise la bascule de thème. Ne fait rien si aucun bouton
 * [data-theme-toggle] n'est présent dans le DOM.
 */
export function init() {
  if (!toggleButton) return;

  toggleButton.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    applyTheme(isDark ? 'light' : 'dark');
  });
}
