-- Cukis — schema do banco
-- Cole e execute no SQL Editor do Supabase

-- Extensão para UUID
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

-- Índice case-insensitive para busca de clientes
create unique index if not exists customers_name_lower_idx
  on public.customers (lower(trim(name)));

-- Vendas
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete restrict,
  cookie_id uuid not null references public.cookies (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  total numeric(10, 2) not null check (total >= 0),
  paid boolean not null default false,
  sold_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists sales_sold_at_idx on public.sales (sold_at desc);
create index if not exists sales_customer_id_idx on public.sales (customer_id);
create index if not exists sales_cookie_id_idx on public.sales (cookie_id);
create index if not exists sales_paid_idx on public.sales (paid);

-- RLS: apenas usuários autenticados
alter table public.cookies enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;

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

-- Sabores de exemplo (opcional — remova se não quiser)
insert into public.cookies (name, default_price)
select * from (values
  ('Chocolate Chip', 8.00::numeric),
  ('Red Velvet', 9.00::numeric),
  ('Nutella', 10.00::numeric),
  ('Doce de Leite', 9.00::numeric),
  ('Cookies & Cream', 9.50::numeric)
) as v(name, default_price)
where not exists (select 1 from public.cookies limit 1);
