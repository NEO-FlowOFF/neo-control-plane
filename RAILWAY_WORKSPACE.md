# Railway Workspace Map

Este documento explica como o workspace Railway se relaciona com a arquitetura modular do codigo.

## Ponto central

O Railway atual deve ser lido como workspace de servicos conectados, nao como prova de que tudo precisa continuar no mesmo repositorio.

## Servicos observados

- `landing`
- `dashboard`
- `neo-tiktok-api`
- `Postgres`
- `Redis`

## Relacao alvo entre servico e repositorio

### landing

Repo alvo:

- `neo-content-landing`

Papel:

- servir a superficie publica

### dashboard

Repo alvo:

- `neo-content-dashboard`

Papel:

- servir o painel operacional

Dependencia:

- consome a API de `neo-content-accounts-api`

### neo-tiktok-api

Repo alvo:

- `neo-content-accounts-api`

Papel:

- expor backend HTTP
- lidar com OAuth
- receber webhooks
- falar com Postgres e Redis

### Postgres

Papel:

- persistencia principal do dominio de contas e operacao

Consumidor alvo:

- `neo-content-accounts-api`

### Redis

Papel:

- filas e jobs assicrons

Consumidor alvo:

- `neo-content-accounts-api`

## O que fica fora do Railway

### neo-content-engine

Motivo:

- pipeline local-first
- estado pesado
- render e assets
- custo operacional diferente dos servicos web

Resumo:

- versiona no GitHub
- roda localmente
- publica ativos quando necessario

## Estrategia de migracao no Railway

### Etapa 1

- manter o workspace atual
- separar os repositorios sem desmontar os recursos de infra

### Etapa 2

- reconfigurar cada servico para apontar para o repo certo

### Etapa 3

- validar deploy e variaveis por servico

### Etapa 4

- remover dependencias residuais do workspace raiz antigo

## Variaveis e ownership

### neo-content-landing

- variaveis publicas e de build da landing

### neo-content-dashboard

- `VITE_API_BASE_URL`

### neo-content-accounts-api

- `DATABASE_URL`
- `REDIS_URL`
- credenciais TikTok Shop
- segredos de webhook
- segredos de OAuth

### neo-content-engine

- fora do Railway
- `.env` proprio no repo local

## Regra de leitura

Se um servico Railway pode existir sozinho, ele merece ser tratado como dominio proprio no Git.

Infraestrutura compartilhada e normal.
Repositorio compartilhado por habito e outra conversa.

## Documento de execucao

Para configurar cada no no painel, use:

- [RAILWAY_NODE_SETUP.md](./RAILWAY_NODE_SETUP.md)
