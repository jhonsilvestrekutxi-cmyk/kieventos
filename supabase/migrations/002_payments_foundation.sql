-- Foundation only: no payment provider is activated by this migration.
create table if not exists public.plans (
 id uuid primary key default gen_random_uuid(),
 code text not null unique,
 name text not null,
 description text,
 price_aoa bigint not null default 0 check (price_aoa >= 0),
 interval text not null default 'one_time' check (interval in ('one_time','monthly','yearly')),
 features jsonb not null default '{}'::jsonb,
 active boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 plan_id uuid not null references public.plans(id),
 provider text not null check (provider in ('multicaixa_gpo','appypay','proxypay','manual')),
 provider_reference text,
 status text not null default 'pending' check (status in ('pending','paid','failed','cancelled','refunded','expired')),
 amount_aoa bigint not null check (amount_aoa >= 0),
 currency text not null default 'AOA' check (currency = 'AOA'),
 created_at timestamptz not null default now(),
 paid_at timestamptz,
 metadata jsonb not null default '{}'::jsonb
);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
alter table public.plans enable row level security;
alter table public.subscriptions enable row level security;
drop policy if exists plans_read_active on public.plans;
create policy plans_read_active on public.plans for select to anon, authenticated using (active = true);
drop policy if exists subscriptions_select_own on public.subscriptions;
create policy subscriptions_select_own on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));
-- Never allow a browser to mark its own subscription as paid.
-- Insert/update subscriptions only from a trusted server/Edge Function using a secret key.
