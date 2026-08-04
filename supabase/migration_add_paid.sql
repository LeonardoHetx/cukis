-- Rode no SQL Editor do Supabase se o projeto já existir
-- Adiciona controle de pagamento nas vendas

alter table public.sales
  add column if not exists paid boolean not null default false;

create index if not exists sales_paid_idx on public.sales (paid);
