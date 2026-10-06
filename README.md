# Cukis

Sistema simples de vendas de cookies — anote cliente, sabor, quantidade e valor; veja totais, top sabores e quanto cada cliente comprou.

**Stack:** Vite · React · TypeScript · Tailwind CSS · Supabase · Vercel

## Funcionalidades

- Login com email/senha (Supabase Auth)
- Cadastro de sabores com preço padrão
- Nova venda com **vários sabores** na mesma venda
- Nova venda com valor automático do sabor (editável)
- Marcar venda como **paga** ou **pendente** (filtro + toggle rápido)
- Cliente digitado na venda: se for novo, cadastra; se já existe, reutiliza (autocomplete)
- Lista de vendas com filtros (cliente, sabor, pagamento, período)
- Dashboard: total vendido, recebido, a receber, top sabores e top clientes
- Página de clientes com total gasto
- **Cartão fidelidade**: meta configurável (6, 10, 15, 20… cookies), prêmio e data de início; gera um PNG do cartão para mandar no WhatsApp e registra a entrega do prêmio

## Setup local

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Abra **SQL Editor** e execute o arquivo [`supabase/schema.sql`](supabase/schema.sql)
   - Projeto já existente: rode só [`supabase/migration_loyalty.sql`](supabase/migration_loyalty.sql) para ativar a fidelidade
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

## Backup automático (Supabase → GitHub)

Todo dia o GitHub Action exporta os dados para a pasta [`backups/`](backups/) e faz commit no repo (mantém os últimos 30 dias + `latest/`).

### Configurar uma vez

No GitHub → **Settings → Secrets and variables → Actions**, crie:

| Secret | Valor |
|--------|--------|
| `SUPABASE_URL` | `https://xxxxx.supabase.co` |
| `SUPABASE_SECRET_KEY` | secret key (`sb_secret_...`) do Supabase |

Depois: **Actions → Daily Supabase backup → Run workflow** (teste manual).

### Local

No `.env` (além das vars `VITE_`):

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

```bash
npm run backup                 # gera backups/latest + pasta datada
npm run restore                # restaura backups/latest/data.json
npm run restore -- caminho.json
```

O restore **apaga e recria** cookies/clientes/vendas/itens. Não mexe nos usuários de Auth.

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

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Desenvolvimento local |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run backup` | Exporta dados do Supabase para `backups/` |
| `npm run restore` | Restaura `backups/latest` no Supabase |

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
