-- Ki-eventos schema v1. Run in Supabase SQL Editor on a new project.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text,
 account_type text not null default 'personal' check (account_type in ('personal','professional')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.events (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 120),
 slug text not null unique,
 event_type text not null default 'other' check (event_type in ('wedding','birthday','baptism','engagement','graduation','corporate','private','other')),
 description text,
 host_names text,
 starts_at timestamptz,
 location_name text,
 location_address text,
 maps_url text,
 cover_image_url text,
 is_published boolean not null default false,
 rsvp_deadline timestamptz,
 allow_maybe boolean not null default true,
 max_companions integer not null default 0 check (max_companions between 0 and 10),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.rsvps (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null references public.events(id) on delete cascade,
 guest_name text not null check (length(trim(guest_name)) between 1 and 120),
 contact text,
 status text not null check (status in ('yes','no','maybe')),
 companions integer not null default 0 check (companions between 0 and 10),
 message text check (message is null or length(message) <= 500),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists events_owner_id_idx on public.events(owner_id);
create index if not exists events_slug_idx on public.events(slug);
create index if not exists rsvps_event_id_idx on public.rsvps(event_id);

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.rsvps enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists events_select_own on public.events;
create policy events_select_own on public.events for select to authenticated using ((select auth.uid()) = owner_id);
drop policy if exists events_insert_own on public.events;
create policy events_insert_own on public.events for insert to authenticated with check ((select auth.uid()) = owner_id);
drop policy if exists events_update_own on public.events;
create policy events_update_own on public.events for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists events_delete_own on public.events;
create policy events_delete_own on public.events for delete to authenticated using ((select auth.uid()) = owner_id);

drop policy if exists rsvps_owner_select on public.rsvps;
create policy rsvps_owner_select on public.rsvps for select to authenticated using (exists(select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())));
drop policy if exists rsvps_owner_delete on public.rsvps;
create policy rsvps_owner_delete on public.rsvps for delete to authenticated using (exists(select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())));
drop policy if exists rsvps_owner_update on public.rsvps;
create policy rsvps_owner_update on public.rsvps for update to authenticated using (exists(select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid()))) with check (exists(select 1 from public.events e where e.id = event_id and e.owner_id = (select auth.uid())));

-- Public invite reads only the published event by slug; it never returns RSVP rows or guest lists.
create or replace function public.get_public_event(p_slug text)
returns jsonb language sql stable security definer set search_path = public
as $$
 select jsonb_build_object(
  'id',e.id,'owner_id',e.owner_id,'title',e.title,'slug',e.slug,'event_type',e.event_type,
  'description',e.description,'host_names',e.host_names,'starts_at',e.starts_at,
  'location_name',e.location_name,'location_address',e.location_address,'maps_url',e.maps_url,
  'cover_image_url',e.cover_image_url,'is_published',e.is_published,'rsvp_deadline',e.rsvp_deadline,
  'allow_maybe',e.allow_maybe,'max_companions',e.max_companions,'created_at',e.created_at
 ) from public.events e where e.slug=p_slug and e.is_published=true
 limit 1;
$$;
revoke all on function public.get_public_event(text) from public;
grant execute on function public.get_public_event(text) to anon, authenticated;

-- Public RSVP is inserted via this constrained RPC, never by direct anonymous table access.
create or replace function public.submit_public_rsvp(
 p_slug text, p_guest_name text, p_contact text, p_status text, p_companions integer, p_message text
) returns jsonb language plpgsql security definer set search_path = public
as $$
declare ev public.events%rowtype;
begin
 select * into ev from public.events where slug=p_slug and is_published=true limit 1;
 if not found then raise exception 'Este convite não está disponível.'; end if;
 if ev.rsvp_deadline is not null and ev.rsvp_deadline < now() then raise exception 'O prazo para confirmar presença terminou.'; end if;
 if length(trim(coalesce(p_guest_name,''))) < 1 or length(p_guest_name)>120 then raise exception 'Indica um nome válido.'; end if;
 if p_status not in ('yes','no','maybe') then raise exception 'Resposta inválida.'; end if;
 if p_status='maybe' and not ev.allow_maybe then raise exception 'Este evento não aceita resposta Talvez.'; end if;
 if p_companions < 0 or p_companions > ev.max_companions then raise exception 'Número de acompanhantes inválido.'; end if;
 if length(coalesce(p_message,'')) > 500 then raise exception 'A mensagem é demasiado longa.'; end if;
 insert into public.rsvps(event_id,guest_name,contact,status,companions,message)
 values(ev.id,trim(p_guest_name),nullif(trim(coalesce(p_contact,'')),''),p_status,p_companions,nullif(trim(coalesce(p_message,'')),''));
 return jsonb_build_object('success',true);
end;
$$;
revoke all on function public.submit_public_rsvp(text,text,text,text,integer,text) from public;
grant execute on function public.submit_public_rsvp(text,text,text,text,integer,text) to anon, authenticated;

-- Deliberately no anon SELECT/INSERT policy on rsvps. Public submissions go through RPC.
-- For production, add rate limiting/abuse prevention at an Edge Function or gateway layer.
