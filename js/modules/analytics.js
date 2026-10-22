/**
 * MODULE  : analytics.js
 * RÔLE    : Mesure d'audience maison, sans cookie : envoie la page vue à
 *           /api/track (fonction Netlify) qui ajoute la géolocalisation et
 *           l'enregistre dans Supabase. Aucune donnée personnelle n'est
 *           conservée côté navigateur.
 * NOTE    : Les visites de l'administrateur sont ignorées (indicateur posé
 *           par le backoffice), tout comme le développement local.
 */

const ENDPOINT = '/api/track';
const IGNORE_KEY = 'analytics.ignore';

function isIgnored() {
  if (!/\.netlify\.app$|^safidyraharijesy\./.test(location.hostname)) return true;
  try { return localStorage.getItem(IGNORE_KEY) === '1'; } catch { return false; }
}

export function init() {
  if (isIgnored()) return;

  const payload = JSON.stringify({
    p: location.pathname,
    r: document.referrer,
    u: new URLSearchParams(location.search).get('utm_source'),
  });

  if (navigator.sendBeacon?.(ENDPOINT, payload)) return;
  fetch(ENDPOINT, { method: 'POST', body: payload, keepalive: true }).catch(() => {});
}
