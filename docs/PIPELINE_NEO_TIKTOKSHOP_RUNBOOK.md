# Content Engine TikTok Shop - Runbook Curto

Operacao oficial movida para `../neo-content-engine`.

## Pre-flight

- `ffmpeg` instalado
- Docker ativo se houver upload local para MinIO
- `.env` preenchido dentro de `../neo-content-engine`

## Comandos oficiais

```bash
cd ../neo-content-engine
make setup
make run -- --skip-upload --skip-openai
```

Ou, a partir da raiz do monorepo:

```bash
make content-setup
make content-run
```

## Politica operacional

- `neo_tiktokshop.py` e legado historico
- `runtime/` fica fora do Git
- videos, mp3, imagens e csvs processados permanecem locais ou em object storage
