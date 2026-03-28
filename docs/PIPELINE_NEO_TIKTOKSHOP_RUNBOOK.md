# Content Engine TikTok Shop - Runbook 1 Pagina

Guia de operacao rapida para executar, validar e recuperar o pipeline sem ambiguidade.

## 1. Objetivo

Executar este ciclo com custo controlado:

1. Minerar produtos.
2. Gerar roteiro e audio.
3. Renderizar video vertical.
4. Publicar no MinIO quando desejado.

## 2. Pre-flight (2 minutos)

Validar:

- Docker ativo.
- `ffmpeg` instalado.
- `.env` preenchido com:
  - `TAVILY_API_KEY`
  - `OPENAI_API_KEY`
  - `MINIO_*` (se houver upload)

## 3. Comandos oficiais

Setup inicial:

```bash
make content-setup
```

Smoke test economico (recomendado):

```bash
NEO_MINE_LIMIT_PRODUCTS=1 NEO_RUN_MAX_PRODUCTS=1 make content-research-auto
```

Rodar apenas pesquisa:

```bash
make content-mine
```

Rodar apenas render/upload a partir de CSV pronto:

```bash
NEO_RUN_MAX_PRODUCTS=2 make content-auto
```

Teste fechado sem upload:

```bash
NEO_RUN_MAX_PRODUCTS=1 \
../neo-content-engine/.venv/bin/python ../neo-content-engine/scripts/run_neo_tiktokshop.py --skip-upload
```

## 4. Onde olhar saida

- CSV atual: `../neo-content-engine/runtime/inputs/pending_products.csv`
- Videos: `../neo-content-engine/runtime/outputs/*_final_render.mp4`
- Metadados: `../neo-content-engine/runtime/outputs/*_meta.json`
- CSV processado: `../neo-content-engine/runtime/inputs/archive/processed_<timestamp>.csv`

Limpeza de runtime:

```bash
make content-runtime-ls
make content-runtime-clean
# ou preservando exemplo TX_TEST_IMG
make content-runtime-clean-keep-example
```

## 5. Sinais de saude

Sucesso esperado por item:

- `llm_status` com `openai_ok:<modelo>` ou fallback controlado.
- `render_status` com `render_with_text` ou `render_without_text`.
- `visual_source` ideal:
  - `product_image_url`
  - `product_image_path`
  - `image_gen_openai_ok:<modelo>`

Se vier `fallback_background:*`, o video saiu sem imagem de produto.

## 6. Incidentes e resposta rapida

### A) Video sem imagem de produto

Acao:

1. Verificar `image_url` no CSV.
2. Se vazio, preencher manualmente para itens criticos.
3. Alternativa: usar `image_path` local.
4. Se quiser IA, confirmar acesso do projeto ao modelo de imagem OpenAI.

### B) Falha de Tavily

Acao:

1. Validar `TAVILY_API_KEY` no `.env`.
2. Rodar novamente `make content-mine`.

### C) Falha de MinIO

Acao:

```bash
make minio-up
make minio-bucket
make content-auto
```

## 7. Politica de custo

Para operacao diaria:

- `NEO_MINE_LIMIT_PRODUCTS=1..2`
- `NEO_RUN_MAX_PRODUCTS=1..2`
- Subir limite somente quando o lote estiver validado.

## 8. Git no repositorio soberano

Commit local:

```bash
cd ../neo-content-engine
git status
git add .
git commit -m "content-engine: ajuste"
```

Push remoto:

```bash
cd ../neo-content-engine
git push
```

## 9. Checklist final de execucao

1. Rode smoke test com 1 item.
2. Confirme `visual_source` sem fallback em pelo menos 1 produto.
3. Confirme MP4 em `../neo-content-engine/runtime/outputs`.
4. Somente depois aumente lote.
