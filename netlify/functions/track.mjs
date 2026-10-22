/**
 * FICHIER : track.mjs
 * RÔLE    : Reçoit une page vue (POST /api/track, envoyée par
 *           js/modules/analytics.js) et l'enregistre dans Supabase avec la
 *           géolocalisation fournie par Netlify (pays, région, ville).
 * VIE PRIVÉE : aucun cookie, aucune IP stockée. Le visiteur est identifié
 *           par une empreinte anonyme (SHA-256 de IP + navigateur + jour +
 *           secret) qui change chaque jour et ne peut pas être inversée.
 * DÉPEND  : variable d'environnement Netlify TRACK_SECRET
 */

import { createHash } from 'node:crypto';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SITE_URL } from '../../admin/config.js';

const BOT_PATTERN = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|monitor|curl|wget|python|axios/i;
const SITE_HOST = new URL(SITE_URL).host;

function device(ua) {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return 'tablette';
  if (/mobi|iphone|android/i.test(ua)) return 'mobile';
  return 'ordinateur';
}

function browser(ua) {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/samsungbrowser/i.test(ua)) return 'Samsung Internet';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Autre';
}

// Hôte du référent externe (les navigations internes ne sont pas une source)
function referrerHost(referrer) {
  try {
    const host = new URL(referrer).host.replace(/^www\./, '');
    return host && host !== SITE_HOST && !host.endsWith('netlify.app') ? host : null;
  } catch {
    return null;
  }
}

export default async (request, context) => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });

  const ua = request.headers.get('user-agent') || '';
  const secret = process.env.TRACK_SECRET;
  if (!secret || !ua || BOT_PATTERN.test(ua)) return new Response(null, { status: 204 });

  let payload;
  try {
    payload = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }

  const path = String(payload.p || '/').slice(0, 300);
  if (path.startsWith('/admin')) return new Response(null, { status: 204 });

  const day = new Date().toISOString().slice(0, 10);
  const visitorHash = createHash('sha256').update(`${context.ip}|${ua}|${day}|${secret}`).digest('hex');
  const geo = context.geo || {};

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/record_page_view`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_secret: secret,
      p_path: path,
      p_referrer_host: referrerHost(payload.r),
      p_utm_source: payload.u ? String(payload.u).slice(0, 100) : null,
      p_country_code: geo.country?.code ?? null,
      p_country: geo.country?.name ?? null,
      p_region: geo.subdivision?.name ?? null,
      p_city: geo.city ?? null,
      p_device: device(ua),
      p_browser: browser(ua),
      p_visitor_hash: visitorHash,
    }),
  });
  if (!response.ok) console.error(`Supabase ${response.status} : ${await response.text()}`);

  return new Response(null, { status: 204 });
};

export const config = { path: '/api/track' };
