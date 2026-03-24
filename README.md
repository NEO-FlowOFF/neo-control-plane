# neoflowoff-tiktok

Workspace raiz de transicao do ecossistema modular TikTok Shop da NEO FlowOFF.

Este repositorio nao deve mais ser lido como casa definitiva de toda a plataforma. Ele agora cumpre 3 papeis:

- workspace local para coordenar a migracao modular
- ponte temporaria para dominios que ja foram extraidos
- base atual do que ainda sera separado em repositorios proprios

## Leitura rapida

O desenho modular alvo e este:

- `neo-content-landing`
- `neo-content-dashboard`
- `neo-content-accounts`
- `neo-content-engine`

Hoje, o estado real e:

- `neo-content-engine` ja foi extraido para repo irmao em `../neo-content-engine`
- o espelho antigo em `apps/content-engine` foi aposentado
- `landing`, `dashboard` e `accounts` ainda vivem aqui, mas ja tem fronteiras definidas
- a raiz `neoflowoff-tiktok` existe para coordenar a transicao, nao para crescer indefinidamente

## Modulos e fronteiras

### 1. neo-content-landing

Responsabilidade:

- site publico
- vitrine institucional
- superficie de entrada

Origem atual neste workspace:

- `packages/landing`

### 2. neo-content-dashboard

Responsabilidade:

- painel operacional
- consumo da API de contas
- visualizacao de saude, ranking e operacao

Origem atual neste workspace:

- `packages/dashboard`

### 3. neo-content-accounts

Responsabilidade:

- OAuth TikTok Shop
- persistencia em Postgres
- webhooks
- filas e jobs
- SDK e inteligencia auxiliar

Origem atual neste workspace:

- `packages/api`
- `packages/db`
- `packages/worker`
- `packages/neo-intelligence`
- `tiktok-sdk`

### 4. neo-content-engine

Responsabilidade:

- pesquisa de oportunidades
- geracao de roteiro, audio e video
- upload opcional de ativos
- pipeline local-first para TikTok Shop

Repo atual:

- `../neo-content-engine`
- remoto: [NEO-FlowOFF/neo-content-engine](https://github.com/NEO-FlowOFF/neo-content-engine)

Observacao critica:

- o engine roda localmente
- GitHub serve para versionar e transportar
- Railway nao e o destino natural desse modulo neste momento

## Como este workspace funciona hoje

### Nos visuais na raiz

Para leitura operacional imediata no Finder, a raiz agora expõe 4 nos:

- `neo-content-engine`
- `neo-content-landing`
- `neo-content-dashboard`
- `neo-content-accounts`

Esses nos existem para navegacao e clareza arquitetural.
Eles nao substituem a fonte de verdade de cada dominio.

### O que continua aqui

- codigo que ainda sera extraido
- docs de transicao
- comandos de compatibilidade
- referencias do Railway atual

### O que ja foi externalizado

- `content-engine`

Os comandos abaixo na raiz sao apenas ponte:

```bash
make content-setup
make content-run -- --skip-upload --skip-openai
pnpm run content:run
```

Eles delegam para:

```bash
../neo-content-engine
```

## Railway

No Railway, a leitura correta e de workspace com servicos, nao de monolito disfarçado.

Servicos atuais observados:

- `landing`
- `dashboard`
- `neo-tiktok-api`
- `Postgres`
- `Redis`

Relacao alvo entre Railway e repositorios:

- `landing` -> `neo-content-landing`
- `dashboard` -> `neo-content-dashboard`
- `neo-tiktok-api` -> `neo-content-accounts`
- `Postgres` -> recurso do workspace consumido por `neo-content-accounts`
- `Redis` -> recurso do workspace consumido por `neo-content-accounts`
- `neo-content-engine` -> fora do Railway, local-first

## Estado de transicao

Este repositorio ainda contem codigo de dominios que vao sair. Portanto:

- nem todo diretorio aqui deve continuar existindo a longo prazo
- nem todo comando aqui representa a casa final do modulo
- a raiz deve ser lida como workspace de migracao arquitetural

## Documentos na raiz

- [SETUP.md](./SETUP.md)
  Setup tecnico atual do workspace raiz
- [MODULAR_ARCHITECTURE.md](./MODULAR_ARCHITECTURE.md)
  Mapa de dominios, repositorios e estrategia de extracao
- [RAILWAY_WORKSPACE.md](./RAILWAY_WORKSPACE.md)
  Mapa entre servicos Railway e repositorios modulares
- [NEXTSTEPS.md](./NEXTSTEPS.md)
  backlog tecnico do backend TikTok Shop

## Regra de ouro

Quando houver duvida entre "onde esta agora" e "onde deve viver", use a segunda pergunta.

Arquitetura modular nao e sobre mover pasta. E sobre impedir que um dominio continue pagando aluguel cognitivo dentro do outro.
