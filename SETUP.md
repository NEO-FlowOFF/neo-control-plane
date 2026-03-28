# Setup Técnico do Workspace Orquestrador

Este repositório deixou de ser monorepo de código de produto.
Ele agora funciona como camada de coordenação local entre repositórios soberanos.

## Definição oficial

Este repositório é o **Control Plane** do ecossistema.
Ele centraliza coordenação, documentação, auditoria e atalhos operacionais entre módulos.

## Escopo do Control Plane

- Governança técnica e runbooks
- Orquestração local entre repositórios soberanos
- Auditoria, diagnóstico e padronização operacional

## Fora do escopo do Control Plane

- Código de produto (API, worker, dashboard, landing, engine)
- Deploy direto de produção dos módulos soberanos
- Fonte primária de variáveis de ambiente de cada módulo

## Repositórios soberanos esperados

- `../neo-content-accounts-api`
- `../neo-content-dashboard`
- `../neo-content-landing`
- `../neo-content-engine`

Se algum deles não existir, rode `make doctor`.

## Comandos na raiz

- `make doctor`: valida se os 4 repositórios existem
- `make build`: build em accounts + dashboard + landing
- `make check`: check em accounts + landing + build do dashboard
- `make dev-api`: desenvolvimento de API no `neo-content-accounts-api`
- `make dev-worker`: desenvolvimento de worker no `neo-content-accounts-api`
- `make dev-dashboard`: desenvolvimento de dashboard no `neo-content-dashboard`
- `make dev-landing`: desenvolvimento de landing no `neo-content-landing`

## Pipeline de conteúdo

Todos os comandos abaixo são ponte para `../neo-content-engine`:

- `make content-setup`
- `make content-mine`
- `make content-run`
- `make content-auto`
- `make content-research-auto`
- `make content-runtime-ls`
- `make content-runtime-clean`
- `make content-runtime-clean-keep-example`

## Banco e Prisma

A geração/validação de banco foi movida para `neo-content-accounts-api`:

- `make db-generate` não existe mais nesta raiz
- use `pnpm run db:generate` e `pnpm run db:validate` na raiz, que delegam para `../neo-content-accounts-api`

## Variáveis de ambiente

As variáveis agora pertencem ao domínio correto:

- `neo-content-accounts-api/.env`
- `neo-content-dashboard/.env` (quando aplicável)
- `neo-content-landing/.env` (quando aplicável)
- `neo-content-engine/.env`

Esta raiz não é mais fonte primária de `.env` operacional.

## Regra operacional

Se a mudança for de produto, código, deploy, integrações ou dados, edite no repositório soberano.
Use esta raiz apenas para coordenação e atalhos.

## Railway: mapeamento recomendado

Para manter consistência entre arquitetura e deploy:

- Serviço `neo-tiktok-api`: apontar para o repositório `neo-content-accounts-api`
- Serviço `neo-content-worker`: apontar para o repositório `neo-content-accounts-api`
- Start API: `pnpm start:api`
- Start Worker: `pnpm start:worker`
- Build/Install: usar `nixpacks.toml` do `neo-content-accounts-api` sem comando legado de monorepo antigo

Observação: API e Worker compartilharem o mesmo repositório é decisão intencional de coesão de domínio.
Separar para outro repositório só é indicado quando houver necessidade real de ciclo de release isolado.
