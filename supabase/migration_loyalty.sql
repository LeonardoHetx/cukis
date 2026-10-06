-- Rode no SQL Editor do Supabase se o projeto já existir
-- Adiciona o cartão fidelidade (configuração + resgates)

-- Configuração única (sempre id = 1)
create table if not exists public.loyalty_settings (
  id smallint primary key default 1 check (id = 1),
  goal integer not null default 10 check (goal > 0),
  reward text not null default '1 cookie grátis',
  starts_at date not null default current_date,
  created_at timestamptz not null default now()
);

insert into public.loyalty_settings (id) values (1)
on conflict (id) do nothing;

-- Prêmios entregues (cada resgate "gasta" a meta da época)
create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  cookies_used integer not null check (cookies_used > 0),
  reward text not null,
  redeemed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists loyalty_redemptions_customer_id_idx
  on public.loyalty_redemptions (customer_id);

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_redemptions enable row level security;

drop policy if exists "Authenticated users can manage loyalty_settings" on public.loyalty_settings;
create policy "Authenticated users can manage loyalty_settings"
  on public.loyalty_settings for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can manage loyalty_redemptions" on public.loyalty_redemptions;
create policy "Authenticated users can manage loyalty_redemptions"
  on public.loyalty_redemptions for all
  to authenticated
  using (true)
  with check (true);
