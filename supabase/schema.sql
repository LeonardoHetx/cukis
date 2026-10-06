-- Cukis — schema do banco
-- Cole e execute no SQL Editor do Supabase (projeto novo)

create extension if not exists "pgcrypto";

-- Sabores de cookies
create table if not exists public.cookies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  default_price numeric(10, 2) not null check (default_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Clientes (criados sob demanda na venda)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  constraint customers_name_unique unique (name)
);

create unique index if not exists customers_name_lower_idx
  on public.customers (lower(trim(name)));

-- Venda (cabeçalho)
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  paid boolean not null default false,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Itens da venda (vários sabores por venda)
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  cookie_id uuid not null references public.cookies (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

-- Cartão fidelidade: configuração única (sempre id = 1)
create table if not exists public.loyalty_settings (
  id smallint primary key default 1 check (id = 1),
  goal integer not null default 10 check (goal > 0),
  reward text not null default '1 cookie grátis',
  starts_at date not null default current_date,
  created_at timestamptz not null default now()
);

-- Prêmios entregues (cada resgate "gasta" a meta da época)
create table if not exists public.loyalty_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  cookies_used integer not null check (cookies_used > 0),
  reward text not null,
  redeemed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists sales_sold_at_idx on public.sales (sold_at desc);
create index if not exists sales_customer_id_idx on public.sales (customer_id);
create index if not exists sales_paid_idx on public.sales (paid);
create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_items_cookie_id_idx on public.sale_items (cookie_id);
create index if not exists loyalty_redemptions_customer_id_idx
  on public.loyalty_redemptions (customer_id);

alter table public.cookies enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.loyalty_settings enable row level security;
alter table public.loyalty_redemptions enable row level security;

create policy "Authenticated users can manage cookies"
  on public.cookies for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage customers"
  on public.customers for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage sales"
  on public.sales for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage sale_items"
  on public.sale_items for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage loyalty_settings"
  on public.loyalty_settings for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage loyalty_redemptions"
  on public.loyalty_redemptions for all
  to authenticated
  using (true)
  with check (true);

insert into public.loyalty_settings (id) values (1)
on conflict (id) do nothing;

insert into public.cookies (name, default_price)
select * from (values
  ('Chocolate Chip', 8.00::numeric),
  ('Red Velvet', 9.00::numeric),
  ('Nutella', 10.00::numeric),
  ('Doce de Leite', 9.00::numeric),
  ('Cookies & Cream', 9.50::numeric)
) as v(name, default_price)
where not exists (select 1 from public.cookies limit 1);
