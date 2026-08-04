-- Rode no SQL Editor se o banco já existir (migra vendas antigas para itens)

-- 1. Tabela de itens
create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  cookie_id uuid not null references public.cookies (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  total numeric(10, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sale_items_cookie_id_idx on public.sale_items (cookie_id);

alter table public.sale_items enable row level security;

drop policy if exists "Authenticated users can manage sale_items" on public.sale_items;
create policy "Authenticated users can manage sale_items"
  on public.sale_items for all
  to authenticated
  using (true)
  with check (true);

-- 2. Migrar linhas antigas (só se ainda existirem as colunas antigas)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sales'
      and column_name = 'cookie_id'
  ) then
    insert into public.sale_items (sale_id, cookie_id, quantity, unit_price, total)
    select id, cookie_id, quantity, unit_price, total
    from public.sales
    where cookie_id is not null
      and not exists (
        select 1 from public.sale_items si where si.sale_id = sales.id
      );

    alter table public.sales drop column if exists cookie_id;
    alter table public.sales drop column if exists quantity;
    alter table public.sales drop column if exists unit_price;
    alter table public.sales drop column if exists total;
  end if;
end $$;

drop index if exists sales_cookie_id_idx;
