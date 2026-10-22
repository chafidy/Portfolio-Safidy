/**
 * FICHIER : config.js
 * RÔLE    : Configuration Supabase partagée entre le backoffice (navigateur)
 *           et le script de génération des pages (Node, scripts/build.mjs).
 * NOTE    : La clé « anon » est publique par conception : la sécurité repose
 *           sur les règles RLS de la base (lecture des contenus publiés pour
 *           tous, écriture réservée aux comptes de la table public.admins).
 */

export const SUPABASE_URL = 'https://zkegyzezraabotbubxoy.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprZWd5emV6cmFhYm90YnVieG95Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NTE0NTEsImV4cCI6MjEwODIyNzQ1MX0.jXbmBUMRQWuVklJaVv26KGPi7L3OHD8mNIGhXjWhTEM';

export const SITE_URL = 'https://safidyraharijesy.netlify.app';
export const MEDIA_BUCKET = 'media';

export const CATEGORIES = {
  'branding': 'Branding & Logo',
  'ui-ux': 'UI/UX & Mobile',
  'web': 'Développement Web',
  'design-graphique': 'Design Graphique',
  'packaging': 'Packaging',
};

export const TAG_COLORS = {
  purple: 'Violet',
  honey: 'Miel',
  ink: 'Encre',
  leaf: 'Vert',
};
