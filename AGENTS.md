<!-- markdownlint-disable MD003 MD007 MD013 MD022 MD023 MD025 MD029 MD032 MD033 MD034 -->

```text
========================================
   NEOFLOWOFF TIKTOK WORKSPACE · AGENTS
========================================
Status: ACTIVE
Mode: TRANSITION_WORKSPACE
Package Manager: pnpm
========================================
```

## ⟠ Objetivo

Este root existe para coordenar a transicao do ecossistema TikTok Shop
de um repositorio concentrado para um modelo modular.

Ele versiona:

- documentacao estrutural
- bridges temporarias de compatibilidade
- scripts de coordenacao local
- codigo que ainda nao foi extraido

Ele nao deve ser tratado como casa definitiva
de todos os modulos do ecossistema.

────────────────────────────────────────

## ⧉ Fontes Canonicas

- `README.md` define o papel desta raiz no ecossistema.
- `MODULAR_ARCHITECTURE.md` define dominios,
  fronteiras e repositorios alvo.
- `RAILWAY_WORKSPACE.md` define a relacao entre Railway
  e os repositorios modulares.
- `NEXTSTEPS.md` continua como backlog tecnico do backend TikTok Shop.

Se houver conflito entre codigo herdado desta raiz
e a arquitetura declarada nesses documentos,
prevalece a arquitetura declarada.

────────────────────────────────────────

## ⨷ Contrato de Roteamento

1. Descobrir primeiro se a tarefa pertence a este workspace
   ou a um repositorio irmao.
2. Se a tarefa for sobre `content-engine`,
   operar em `../neo-content-engine`.
3. Se a tarefa for sobre landing publica,
   operar em `../neo-content-landing`.
4. Se a tarefa for sobre dashboard,
   operar em `../neo-content-dashboard`.
5. Se a tarefa for sobre OAuth, webhooks, DB, worker,
   SDK TikTok ou inteligencia auxiliar,
   operar em `../neo-content-accounts-api`.
6. Nunca confundir bridge de compatibilidade
   com fonte de verdade do dominio.

────────────────────────────────────────

## ⍟ Regras Duras

- Nunca tratar esta pasta como monorepo final.
- Nunca reimportar para esta raiz um modulo
  que ja foi extraido para repo soberano.
- Nunca usar `apps/content-engine` como fonte de verdade.
  O dominio oficial vive em `../neo-content-engine`.
- Nunca usar `neo_tiktokshop.py` como fluxo oficial.
  Ele e legado historico.
- Nunca misturar storage pesado de runtime com historico Git.
- Toda mudanca de topologia, migracao de ownership,
  bridge temporaria, docs estruturais e mapa Railway
  nasce aqui.
- Toda mudanca de produto deve nascer
  no repositorio soberano correto
  assim que ele existir.

────────────────────────────────────────

## ◬ Operacao Local

- Este workspace usa `pnpm` para a camada Node.
- O `content-engine` roda localmente em repo irmao,
  com Python e `make`.
- A raiz expõe nos visuais para navegacao rapida:
  - `neo-content-engine`
  - `neo-content-landing`
  - `neo-content-dashboard`
  - `neo-content-accounts-api`
- Os comandos `make content-*` e `pnpm run content:*`
  nesta raiz sao apenas ponte para `../neo-content-engine`.
- Antes de alterar qualquer comando raiz,
  verificar se ele e ponte,
  compatibilidade temporaria
  ou fonte real do dominio.

────────────────────────────────────────

## ◯ Fronteiras

### Ja extraido

- `neo-content-landing`
  em `/Users/nettomello/CODIGOS/neo-content-landing`
- `neo-content-dashboard`
  em `/Users/nettomello/CODIGOS/neo-content-dashboard`
- `neo-content-accounts-api`
  em `/Users/nettomello/CODIGOS/neo-content-accounts-api`
- `neo-content-engine`
  em `/Users/nettomello/CODIGOS/neo-content-engine`

### Ainda nesta raiz, mas apenas como espelho transitorio

- `packages/landing` -> `neo-content-landing`
- `packages/dashboard` -> `neo-content-dashboard`
- `packages/api` -> `neo-content-accounts-api`
- `packages/db` -> `neo-content-accounts-api`
- `packages/worker` -> `neo-content-accounts-api`
- `packages/neo-intelligence` -> `neo-content-accounts-api`
- `tiktok-sdk` -> `neo-content-accounts-api`

### Infraestrutura observada

No Railway, este ecossistema opera como workspace de servicos:

- `landing`
- `dashboard`
- `neo-tiktok-api`
- `Postgres`
- `Redis`

Essa topologia de servicos nao autoriza manter
os dominios acoplados no mesmo Git por comodidade.

────────────────────────────────────────

## ⌁ Regra de Decisao

Quando houver duvida entre:

- "editar aqui porque esta mais perto"
- "editar no dominio certo porque e a fronteira correta"

escolha a segunda.

Atalho local quase sempre cobra juros arquiteturais depois.
