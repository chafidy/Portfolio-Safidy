-- Schéma du backoffice du portfolio (projet Supabase « portfolio-safidy »).
-- Appliqué le 2026-10-22 ; conservé ici comme référence.

-- Admins : comptes autorisés à écrire (ajoutés à la main, par user_id)
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create policy "admins: lecture de sa propre ligne" on public.admins
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.admins to authenticated;

create or replace function public.is_admin()
returns boolean
language sql stable security invoker
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

-- Projets
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  category text not null check (category in ('branding','ui-ux','web','design-graphique','packaging')),
  image_url text not null default '',
  image_alt text not null default '',
  tags jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index projects_sort_idx on public.projects (sort_order);
create trigger projects_updated_at before update on public.projects
  for each row execute function public.set_updated_at();
alter table public.projects enable row level security;

create policy "projects: lecture publique des publiés" on public.projects
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "projects: insertion admin" on public.projects
  for insert to authenticated with check ((select public.is_admin()));
create policy "projects: modification admin" on public.projects
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "projects: suppression admin" on public.projects
  for delete to authenticated using ((select public.is_admin()));

-- Articles de blog
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  excerpt text not null default '',
  content_html text not null default '',
  cover_url text not null default '',
  cover_alt text not null default '',
  tags text[] not null default '{}',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_published_idx on public.posts (published, published_at desc);
create trigger posts_updated_at before update on public.posts
  for each row execute function public.set_updated_at();
alter table public.posts enable row level security;

create policy "posts: lecture publique des publiés" on public.posts
  for select to anon, authenticated using (published or (select public.is_admin()));
create policy "posts: insertion admin" on public.posts
  for insert to authenticated with check ((select public.is_admin()));
create policy "posts: modification admin" on public.posts
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "posts: suppression admin" on public.posts
  for delete to authenticated using ((select public.is_admin()));

-- Stockage des images (bucket public en lecture, écriture admin)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp','image/png','image/jpeg','image/gif','image/svg+xml']);

create policy "media: upload admin" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and (select public.is_admin()));
create policy "media: modification admin" on storage.objects
  for update to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "media: suppression admin" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and (select public.is_admin()));
