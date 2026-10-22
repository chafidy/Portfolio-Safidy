/**
 * FICHIER : supabase-keepalive.mjs
 * RÔLE    : Fonction planifiée Netlify. Interroge Supabase une fois par jour
 *           pour que le projet gratuit ne soit jamais mis en pause (pause
 *           automatique après 7 jours sans activité).
 */

import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../../admin/config.js';

export default async () => {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  console.log(`Supabase keep-alive : HTTP ${response.status}`);
  return new Response(null, { status: response.ok ? 200 : 502 });
};

export const config = { schedule: '@daily' };
