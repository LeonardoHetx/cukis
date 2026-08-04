# Cukis

Sistema simples de vendas de cookies — anote cliente, sabor, quantidade e valor; veja totais, top sabores e quanto cada cliente comprou.

**Stack:** Vite · React · TypeScript · Tailwind CSS · Supabase · Vercel

## Funcionalidades

- Login com email/senha (Supabase Auth)
- Cadastro de sabores com preço padrão
- Nova venda com valor automático do sabor (editável)
- Marcar venda como **paga** ou **pendente** (filtro + toggle rápido)
- Cliente digitado na venda: se for novo, cadastra; se já existe, reutiliza (autocomplete)
- Lista de vendas com filtros (cliente, sabor, pagamento, período)
- Dashboard: total vendido, recebido, a receber, top sabores e top clientes
- Página de clientes com total gasto

## Setup local

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Abra **SQL Editor** e execute o arquivo [`supabase/schema.sql`](supabase/schema.sql)
3. Em **Authentication → Users**, crie um usuário (email + senha) para a sua irmã
4. Em **Project Settings → API**, copie:
   - Project URL
   - `anon` `public` key

### 2. App

```bash
cp .env.example .env
```

Preencha o `.env`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

```bash
npm install
npm run dev
```

Abra o endereço do Vite (geralmente `http://localhost:5173`) e entre com o email/senha criados.

## Deploy na Vercel

1. Suba o repositório no GitHub
2. Em [vercel.com](https://vercel.com) → **Add New Project** → importe o repo
3. Framework: **Vite** (detectado automaticamente)
4. Em **Environment Variables**, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy

Pronto — a URL da Vercel é o sistema dela.

### Auth (opcional)

Se o login falhar por “Email not confirmed”, no Supabase vá em **Authentication → Providers → Email** e desative **Confirm email** (para uso interno isso costuma ser suficiente).

## Scripts

| Comando         | Descrição              |
|-----------------|------------------------|
| `npm run dev`   | Desenvolvimento local  |
| `npm run build` | Build de produção      |
| `npm run preview` | Preview do build     |

## Estrutura

```
src/
  components/   # UI, layout, autocomplete
  contexts/     # Auth
  lib/          # Supabase, helpers
  pages/        # Telas
  types/        # Tipos
supabase/
  schema.sql    # Tabelas + RLS + seed
```
