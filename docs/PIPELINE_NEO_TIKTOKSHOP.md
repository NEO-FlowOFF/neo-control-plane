# Content Engine TikTok Shop

Fluxo oficial migrado para o repositorio standalone local em `../neo-content-engine`.

Este documento agora existe so como ponte de navegacao dentro do monorepo.

## Fonte de verdade

- Codigo oficial: `../neo-content-engine`
- Interface CLI oficial:
  - `scripts/mine_tiktok_shop.py`
  - `scripts/run_neo_tiktokshop.py`
  - `scripts/clean_runtime.py`
- Bootstrap oficial: `../neo-content-engine/README.md`

## O que permanece no monorepo

- Compatibilidade local por meio de `make content-*` e `pnpm run content:*`
- Documentacao curta de migracao
- Nenhuma logica legacy deve ser reativada a partir de `neo_tiktokshop.py`

## Comandos de ponte

```bash
make content-setup
make content-run
pnpm run content:run
```

Todos esses comandos delegam para o repo standalone.
