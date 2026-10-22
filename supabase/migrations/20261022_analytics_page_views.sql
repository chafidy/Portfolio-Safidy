-- Mesure d'audience sans cookie (pages vues + géolocalisation Netlify).
-- Appliqué le 2026-10-22 ; conservé ici comme référence.
-- Le secret partagé avec la fonction Netlify (variable TRACK_SECRET) est
-- stocké à part dans private.settings (clé 'track_secret') — jamais ici.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.settings (
  key text primary key,
  value text not null
);

create table public.page_views (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  path text not null,
  referrer_host text,
  utm_source text,
  country_code text,
  country text,
  region text,
  city text,
  device text,
  browser text,
  visitor_hash text not null
);
create index page_views_created_idx on public.page_views (created_at desc);
alter table public.page_views enable row level security;

create policy "page_views: lecture admin" on public.page_views
  for select to authenticated using ((select public.is_admin()));
create policy "page_views: suppression admin" on public.page_views
  for delete to authenticated using ((select public.is_admin()));

-- Appelée uniquement par netlify/functions/track.mjs (secret obligatoire)
create or replace function public.record_page_view(
  p_secret text, p_path text, p_referrer_host text, p_utm_source text,
  p_country_code text, p_country text, p_region text, p_city text,
  p_device text, p_browser text, p_visitor_hash text
) returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if p_secret is null or p_secret is distinct from
     (select value from private.settings where key = 'track_secret') then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  insert into public.page_views
    (path, referrer_host, utm_source, country_code, country, region, city, device, browser, visitor_hash)
  values (
    left(coalesce(p_path, '/'), 300), left(p_referrer_host, 200), left(p_utm_source, 100),
    left(p_country_code, 2), left(p_country, 80), left(p_region, 80), left(p_city, 80),
    left(p_device, 20), left(p_browser, 30), left(p_visitor_hash, 64)
  );
end;
$$;
revoke execute on function public.record_page_view(text,text,text,text,text,text,text,text,text,text,text) from public, authenticated;
grant execute on function public.record_page_view(text,text,text,text,text,text,text,text,text,text,text) to anon;

-- Synthèse de l'onglet Statistiques du backoffice (RLS : admin uniquement).
-- Voir la définition complète appliquée en base : analytics_summary(p_days).
