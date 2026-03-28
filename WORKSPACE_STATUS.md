# Workspace Status

Estado vivo da modularizacao do ecossistema TikTok Shop.

## Visao rapida

| Dominio | Repo alvo | Estado | Fonte de verdade atual | Railway |
| :-- | :-- | :-- | :-- | :-- |
| Landing | `neo-content-landing` | Extraido | `../neo-content-landing` | `landing` |
| Dashboard | `neo-content-dashboard` | Extraido | `../neo-content-dashboard` | `dashboard` |
| Accounts | `neo-content-accounts` | Extraido | `../neo-content-accounts` | `neo-tiktok-api` + `Postgres` + `Redis` |
| Engine | `neo-content-engine` | Extraido | `../neo-content-engine` | Fora do Railway |

## O que este root ainda faz

- coordena a transicao arquitetural
- centraliza manifests e documentacao transversal
- oferece bridges temporarias
- ainda hospeda espelhos transitorios de codigo ja extraido
- nao hospeda mais uma copia operacional do `content-engine`

## O que este root nao deve voltar a fazer

- crescer como monorepo definitivo
- recuperar `content-engine` como fonte de verdade
- confundir bridge de compatibilidade com ownership de dominio

## Sinal de saude

Use:

```bash
pnpm run workspace:doctor
```

ou:

```bash
make workspace-doctor
```

para validar a topologia local declarada em `manifests/`.
