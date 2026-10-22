-- Projets « À la une » : affichés dans la section « Projets récents » de l'accueil.
-- Appliqué le 2026-10-22 ; conservé ici comme référence.

alter table public.projects add column featured boolean not null default false;
create index projects_featured_idx on public.projects (featured) where featured;

-- Au plus 6 projets à la une
create or replace function public.check_featured_limit()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.featured and (select count(*) from public.projects where featured and id <> new.id) >= 6 then
    raise exception 'Maximum 6 projets à la une' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;
create trigger projects_featured_limit before insert or update of featured on public.projects
  for each row when (new.featured) execute function public.check_featured_limit();

-- Reprise des 6 projets affichés sur l'accueil avant la migration
update public.projects set featured = true
where image_url in ('assets/project/p1.webp','assets/project/p2.webp','assets/project/p3.webp',
                    'assets/project/p4.webp','assets/project/p5.webp','assets/project/p6.webp');
