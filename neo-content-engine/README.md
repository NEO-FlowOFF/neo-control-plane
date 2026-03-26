# Content Engine Standalone

Repositorio standalone do motor de pesquisa, geracao e publicacao de conteudo TikTok Shop.

Este diretorio e a raiz operacional da extracao. O monorepo pai existe apenas como ponte local.

Legado fora do fluxo oficial:

- `neo_tiktokshop.py` permanece apenas como referencia historica no monorepo.

## Fluxo

1. `mine_tiktok_shop.py`: pesquisa oportunidades e gera CSV de entrada.
2. `run_neo_tiktokshop.py`: gera roteiro, audio, video e publica no MinIO.
3. Midia do video: prioriza `video_path` e `video_url`, depois `image_path` e `image_url`, tenta thumbnail via TikTok `oEmbed`, e so depois cai em geracao OpenAI (se habilitada).

## Comandos locais do modulo

```bash
make setup
make doctor
make mine-real
make run-real RUN_ARGS="--skip-upload"
make now LIMIT_PRODUCTS=5 MAX_PRODUCTS=2 RUN_ARGS="--skip-upload"
make minio-up
make minio-bucket-private
make minio-bucket-public
```

Rota unica para usar agora:

```bash
make now LIMIT_PRODUCTS=5 MAX_PRODUCTS=2 RUN_ARGS="--skip-upload"
```

Leitura pratica:

- `mine-real` pesquisa e gera a fila em `runtime/inputs/pending_products.csv`
- `run-real` consome a fila e gera video e metadata
- `now` executa `mine-real` e depois `run-real`
- `doctor` verifica se o `.env` local tem as chaves criticas
- `minio-bucket-private` mantem o bucket privado
- `minio-bucket-public` abre leitura publica apenas por opt-in local

Arquivos de configuracao declarativa:

- `branding.json` define voz e identidade visual do render.
- `research_config.json` define queries, fontes, score e criterios de corte da mineracao.

## Variaveis esperadas

Use `.env` na raiz deste repositorio standalone.
Se preferir, copie `.env.example` para `.env` e ajuste os valores reais.

- `OPENAI_API_KEY`
- `TAVILY_API_KEY`
- `OPENAI_MODEL`
- `TIKTOK_ACCESS_TOKEN`
- `TIKTOK_SHOP_APP_KEY`
- `TIKTOK_SHOP_APP_SECRET`
- `TIKTOK_SHOP_CIPHER`
- `TIKTOK_SHOP_API_BASE_URL`
- `NEO_GENERATE_IMAGE_IF_MISSING`
- `OPENAI_IMAGE_MODEL`
- `NEO_IMAGE_SIZE`
- `NEO_IMAGE_QUALITY`
- `NEO_MINE_MAX_RESULTS_PER_QUERY`
- `NEO_MINE_LIMIT_PRODUCTS`
- `NEO_RUN_MAX_PRODUCTS`
- `NEO_RUN_SLEEP_BETWEEN_PRODUCTS`
- `NEO_MINIO_PUBLIC_READ`
- `MINIO_ENDPOINT`
- `MINIO_PUBLIC_BASE_URL`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `MINIO_BUCKET`

## Entradas e saidas

- Entrada CSV: `runtime/inputs/pending_products.csv`
- Saida video: `runtime/outputs/*_final_render.mp4`
- Saida metadata: `runtime/outputs/*_meta.json`
- Midia opcional por item no CSV: `video_url`, `video_path`, `image_url`, `image_path`
- Sinais adicionais por item no CSV: `source_type`, `source_id`, `commission_rate`, `commission_amount`, `price_amount`, `sales_count`, `rating`, `review_count`, `score_breakdown`

## Regras operacionais

- O modulo resolve apenas `.env` local.
- A limpeza de runtime usa `scripts/clean_runtime.py`.
- `runtime/` e `.venv/` ficam fora do Git.
- Assets pesados continuam locais ou em object storage.
- Upload para MinIO permanece privado por padrao.
- URLs publicas so sao emitidas quando `NEO_MINIO_PUBLIC_READ=1`.
- O contrato oficial de CLI vive aqui.
- `branding.json` e `research_config.json` permitem mover voz, cores, score e criterio de selecao para fora do Python.

## Mineracao e score

O `mine_tiktok_shop.py` agora combina duas fontes:

- TikTok Shop API para catalogo afiliado real
- Tavily para contexto e enriquecimento semantico

O score final fica explicito em `research_config.json` e hoje considera:

- `commission_rate`
- `commission_amount`
- `sales_velocity`
- `rating`
- `reviews`
- `media_richness`
- `source_confidence`
- `source_priority`
- `query_match`
- `title_clarity`

Criticos operacionais:

- `sources.tiktok_api.mode=auto` tenta `seller` primeiro quando houver `TIKTOK_SHOP_CIPHER`, e cai para `creator` como fallback
- `sources.tiktok_api.mode=creator` usa `affiliate_creator/.../open_collaborations/products/search`
- `sources.tiktok_api.mode=seller` usa `affiliate_seller/.../open_collaborations/products/search` e exige `TIKTOK_SHOP_CIPHER`
- o engine aceita `TIKTOK_SHOP_APP_KEY` e `TIKTOK_SHOP_APP_SECRET` como nomes canonicos, com fallback para aliases legacy
- sem credenciais TikTok, o `mine` continua com Tavily se ele estiver habilitado

## Bootstrap

Dependencias de sistema:

- `python3`
- `ffmpeg`
- Docker opcional para MinIO local

Smoke test local:

```bash
make setup
make run -- --skip-upload --skip-openai
```
