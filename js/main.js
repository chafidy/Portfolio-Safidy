/**
 * FICHIER : main.js
 * RÔLE    : Point d'entrée unique du JavaScript. Importe et initialise
 *           chaque module. Aucune logique métier ne vit ici — uniquement
 *           l'orchestration. Le HTML et le CSS fonctionnent sans ce
 *           fichier (amélioration progressive).
 */

import { init as initNavigation } from './modules/navigation.js';
import { init as initReveal } from './modules/reveal.js';
import { init as initCounter } from './modules/counter.js';
import { init as initFilter } from './modules/filter.js';
import { init as initForm } from './modules/form.js';
import { init as initTheme } from './modules/theme.js';
import { init as initLightbox } from './modules/lightbox.js';
import { init as initChatbot } from './modules/chatbot.js';
import { init as initAnalytics } from './modules/analytics.js';

document.documentElement.classList.add('has-js');

initNavigation();
initReveal();
initCounter();
initFilter();
initForm();
initTheme();
initLightbox();
initChatbot();
initAnalytics();
