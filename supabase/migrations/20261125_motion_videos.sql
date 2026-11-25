-- Vidéos motion (reels verticaux 9:16) affichées dans la section « Motion »
-- de l'accueil et gérées depuis l'onglet « Motion » du backoffice.

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  video_url text not null,
  poster_url text not null default '',
  duration_seconds numeric(7, 2) not null default 0,
  tags text[] not null default '{}',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index videos_sort_idx on public.videos (sort_order);
create trigger videos_updated_at before update on public.videos
  for each row execute function public.set_updated_at();
alter table public.videos enable row level security;

create policy "videos: lecture publique des publiées" on public.videos
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "videos: insertion admin" on public.videos
  for insert to authenticated with check ((select public.is_admin()));
create policy "videos: modification admin" on public.videos
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "videos: suppression admin" on public.videos
  for delete to authenticated using ((select public.is_admin()));

-- Au plus 6 vidéos publiées
create or replace function public.check_videos_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.published and (select count(*) from public.videos where published and id <> new.id) >= 6 then
    raise exception 'Maximum 6 vidéos publiées' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger videos_published_limit before insert or update of published on public.videos
  for each row when (new.published) execute function public.check_videos_limit();

-- Le bucket « media » accepte désormais les vidéos MP4 / WebM.
-- 50 Mo par fichier : plafond d'upload de l'offre gratuite Supabase.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/webp','image/png','image/jpeg','image/gif','image/svg+xml','video/mp4','video/webm']
where id = 'media';
