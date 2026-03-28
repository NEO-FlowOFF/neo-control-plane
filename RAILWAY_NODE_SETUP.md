# Railway Node Setup

Configuracao operacional para recriar ou reapontar cada no do workspace Railway.

Use este arquivo como checklist direto no painel.

## Regra central

- Workspace Railway: `neo-control-plane`
- Branch recomendada para deploy inicial: `main`
- Root Directory: vazio, salvo se voce decidir mudar a raiz do repo no futuro
- `neo-content-engine` nao vai para o Railway neste momento

## 1. landing

Nome do servico:

- `landing`

Repositorio:

- [NEO-FlowOFF/neo-content-landing](https://github.com/NEO-FlowOFF/neo-content-landing)

Tipo:

- Web Service

Build:

- Install Command: `pnpm install`
- Build Command: `pnpm build`

Start:

- Start Command: `pnpm preview --host 0.0.0.0 --port $PORT`

Rede:

- Public Networking: ligado

Variaveis:

- nenhuma obrigatoria no estado atual

Observacoes:

- este servico e Astro
- serve a superficie publica
- se no futuro a landing passar a consumir alguma API publica, adicione as variaveis aqui, nao no workspace inteiro

## 2. dashboard

Nome do servico:

- `dashboard`

Repositorio:

- [NEO-FlowOFF/neo-content-dashboard](https://github.com/NEO-FlowOFF/neo-content-dashboard)

Tipo:

- Web Service

Build:

- Install Command: `pnpm install`
- Build Command: `pnpm build`

Start:

- Start Command: `pnpm preview --host 0.0.0.0 --port $PORT`

Rede:

- Public Networking: ligado

Variaveis obrigatorias:

- `VITE_API_BASE_URL=https://neo-tiktok-api.up.railway.app`

Observacoes:

- o dashboard quebra build de producao sem `VITE_API_BASE_URL`
- quando o dominio real da API mudar, atualize essa variavel

## 3. neo-tiktok-api

Nome do servico:

- `neo-tiktok-api`

Repositorio:

- [NEO-FlowOFF/neo-content-accounts-api](https://github.com/NEO-FlowOFF/neo-content-accounts-api)

Tipo:

- Web Service

Build:

- Install Command: `pnpm install`
- Build Command: `pnpm build`

Start:

- Start Command: `pnpm start:api`

Rede:

- Public Networking: ligado
- Healthcheck Path: `/health`

Variaveis obrigatorias:

- `PORT=$PORT`
- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `REDIS_URL=${{Redis.REDIS_URL}}`
- `API_BASE_URL=https://neo-tiktok-api.up.railway.app`
- `DB_CONNECT_TIMEOUT_MS=10000`
- `TIKTOK_SHOP_APP_KEY=...`
- `TIKTOK_SHOP_APP_SECRET=...`
- `TIKTOK_SHOP_AUTHORIZE_URL=...`
- `TIKTOK_SHOP_TOKEN_URL=...`
- `TIKTOK_SHOP_REDIRECT_URI=https://neo-tiktok-api.up.railway.app/oauth/tiktok-shop/callback`
- `OAUTH_STATE_SECRET=...`
- `TIKTOK_WEBHOOK_SECRET=...`
- `TIKTOK_WEBHOOK_SIGNATURE_HEADER=x-tiktok-signature`
- `TIKTOK_WEBHOOK_TIMESTAMP_HEADER=x-tiktok-timestamp`

Valores recomendados para TikTok Shop:

- `TIKTOK_SHOP_AUTHORIZE_URL=https://services.us.tiktokshop.com/open_api/v1.3/authorize`
- `TIKTOK_SHOP_TOKEN_URL=https://auth.tiktok-shops.com/api/v2/token/get`

Observacoes:

- `API_BASE_URL` precisa bater com o dominio publico real do servico
- `TIKTOK_SHOP_REDIRECT_URI` precisa bater exatamente com o callback cadastrado no app da TikTok Shop
- a API usa Postgres e Redis. Nao trate Redis como opcional se quiser jobs consistentes

## 4. neo-tiktok-worker

Nome do servico:

- `neo-tiktok-worker`

Repositorio:

- [NEO-FlowOFF/neo-content-accounts-api](https://github.com/NEO-FlowOFF/neo-content-accounts-api)

Tipo:

- Worker Service

Build:

- Install Command: `pnpm install`
- Build Command: `pnpm build`

Start:

- Start Command: `pnpm start:worker`

Rede:

- Public Networking: desligado

Variaveis obrigatorias:

- `DATABASE_URL=${{Postgres.DATABASE_URL}}`
- `REDIS_URL=${{Redis.REDIS_URL}}`
- `OPENAI_API_KEY=...`
- `TIKTOK_SHOP_API_BASE_URL=https://open-api.tiktokglobalshop.com`
- `TIKTOK_SHOP_TOKEN_URL=https://auth.tiktok-shops.com/api/v2/token/get`
- `TIKTOK_SHOP_APP_KEY=...`
- `TIKTOK_SHOP_APP_SECRET=...`
- `TIKTOK_SHOP_AUTH_REVOKED_EVENT=AUTHORIZATION_REVOKED`
- `TIKTOK_SHOP_INVENTORY_UPDATE_PATH=/product/inventory/update`

Observacoes:

- esse no ainda nao existia no desenho antigo, mas deveria existir
- deixar fila e processamento dentro da API e pedir gargalo com polidez

## 5. Postgres

Nome do recurso:

- `Postgres`

Tipo:

- Railway Postgres

Uso:

- consumido por `neo-tiktok-api`
- consumido por `neo-tiktok-worker`

Variavel compartilhada:

- `DATABASE_URL`

Observacoes:

- nao replique `DATABASE_URL` manualmente se puder referenciar a variavel do recurso

## 6. Redis

Nome do recurso:

- `Redis`

Tipo:

- Railway Redis

Uso:

- consumido por `neo-tiktok-api`
- consumido por `neo-tiktok-worker`

Variavel compartilhada:

- `REDIS_URL`

Observacoes:

- BullMQ sem Redis e so vontade de processamento sem sistema nervoso

## 7. O que fica fora

`neo-content-engine`:

- repo: [NEO-FlowOFF/neo-content-engine](https://github.com/NEO-FlowOFF/neo-content-engine)
- modo operacional: local-first
- motivo: render, runtime pesado, assets e fluxo de producao fora do perfil ideal do Railway neste momento

## 8. Ordem de configuracao

1. Ajustar `Postgres`
2. Ajustar `Redis`
3. Apontar `neo-tiktok-api` para `neo-content-accounts-api`
4. Criar `neo-tiktok-worker` usando `neo-content-accounts-api`
5. Apontar `dashboard` para `neo-content-dashboard`
6. Apontar `landing` para `neo-content-landing`
7. Confirmar que `VITE_API_BASE_URL` usa o dominio real final da API
8. Testar `/health` da API

## 9. Checklist final

- `landing` abre publicamente
- `dashboard` abre publicamente
- `dashboard` fala com a API correta
- `neo-tiktok-api/health` responde `{ "ok": true }`
- `neo-tiktok-worker` sobe sem crash de variavel ausente
- `DATABASE_URL` e `REDIS_URL` estao vindo dos recursos Railway
- callback TikTok Shop aponta para o dominio real da API
