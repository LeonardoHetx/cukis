# Backups automáticos do Supabase

Gerados por `npm run backup` e pelo GitHub Action diário.

- `latest/` — último backup
- `YYYY-MM-DD_HHMMSSZ/` — histórico (mantém os últimos 30)

Arquivo principal: `data.json`

Para restaurar: `npm run restore` (usa `latest` por padrão).
