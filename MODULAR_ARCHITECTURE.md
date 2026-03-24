# Modular Architecture

Este documento define como o ecossistema foi particionado em dominios e qual e o papel de cada repositorio.

## Objetivo

Sair do modelo "tudo mora no mesmo repositorio" para um modelo em que cada dominio tem:

- fronteira tecnica clara
- deploy proprio
- ritmo proprio
- custo cognitivo proprio

## Repositorios alvo

### neoflowoff-tiktok

Papel:

- workspace raiz de transicao
- coordenacao local
- docs e compatibilidade temporaria

Nao deve ser:

- fonte de verdade permanente de todos os modulos

### neo-content-landing

Papel:

- experiencia publica
- marketing e entrada

Origem atual:

- `packages/landing`

### neo-content-dashboard

Papel:

- interface operacional interna
- leitura do estado do sistema

Origem atual:

- `packages/dashboard`

Dependencia principal:

- `VITE_API_BASE_URL`

### neo-content-accounts

Papel:

- backend central de contas e operacao
- OAuth
- webhooks
- filas
- banco
- SDK TikTok
- inteligencia auxiliar

Origem atual:

- `packages/api`
- `packages/db`
- `packages/worker`
- `packages/neo-intelligence`
- `tiktok-sdk`

### neo-content-engine

Papel:

- pipeline local-first de criacao de conteudo
- mineracao de oportunidades
- geracao de roteiro, audio e video
- upload opcional de ativos

Estado atual:

- repo irmao em `../neo-content-engine`
- remoto proprio ja criado

## Mapa de responsabilidade

### Landing

- atracao
- narrativa publica
- paginas institucionais

### Dashboard

- visibilidade operacional
- consumo de API
- leitura de saude e performance

### Accounts

- logica transacional
- conexao com TikTok Shop
- persistencia
- automacao assicrona

### Engine

- producao local de ativos
- pipeline de conteudo
- estado pesado fora do Git

## Regras de fronteira

### 1. Dominio nao cruza repositorio por conveniencia

Se um modulo precisa de deploy, cadence ou dependencias muito diferentes, ele nao deve continuar no mesmo repo por nostalgia.

### 2. Storage pesado nao entra no Git

Vale especialmente para `neo-content-engine`.

- `runtime/` e local
- mp3, mp4, imagens e csvs processados ficam fora do historico Git
- object storage entra quando fizer sentido operacional

### 3. Railway organiza servicos, nao define dominio

Workspace de infraestrutura e uma coisa.
Fronteira de codigo e outra.

### 4. Compatibilidade temporaria deve ser explicita

Bridges de comando existem para transicao.
Nao sao a arquitetura final.

## Estado atual da extracao

### Concluido

- `neo-content-engine` extraido para repo proprio local
- ponte do workspace raiz apontando para o repo irmao
- espelho antigo em `apps/content-engine` removido do fluxo

### Proximo

- extrair `neo-content-landing`
- extrair `neo-content-dashboard`
- extrair `neo-content-accounts`

## Mapa de pastas atual para corte futuro

### Vai sair deste repo

- `packages/landing`
- `packages/dashboard`
- `packages/api`
- `packages/db`
- `packages/worker`
- `packages/neo-intelligence`
- `tiktok-sdk`

### Ja saiu em pratica

- `content-engine` para `../neo-content-engine`

### Fica como apoio temporario

- `docs`
- `tools`
- `Makefile`
- `package.json`

## Principio operacional

Cada modulo deve poder responder sozinho a 3 perguntas:

- como roda
- como faz deploy
- de quem depende

Se a resposta exigir abrir outro repo para entender a existencia dele, a separacao ainda esta incompleta.
