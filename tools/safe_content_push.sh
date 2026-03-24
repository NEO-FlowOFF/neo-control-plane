#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MSG="${1:-}"
if [[ -z "$MSG" ]]; then
  echo "Uso: tools/safe_content_push.sh \"mensagem do commit\""
  exit 1
fi
DRY_RUN="${DRY_RUN:-0}"
PUSH="${PUSH:-0}"

BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$BRANCH" == "main" || "$BRANCH" == "master" ]]; then
  echo "Bloqueado: nao fazer push direto em $BRANCH."
  exit 1
fi

SAFE_PATHS=(
  "docs/PIPELINE_NEO_TIKTOKSHOP.md"
  "docs/PIPELINE_NEO_TIKTOKSHOP_RUNBOOK.md"
  "tools/safe_content_push.sh"
  "tools/content_engine_bridge.sh"
  "manifests"
  "WORKSPACE_STATUS.md"
  "MODULAR_ARCHITECTURE.md"
  "RAILWAY_WORKSPACE.md"
  "AGENTS.md"
  "Makefile"
  "package.json"
  ".env.example"
  ".gitignore"
)

echo "Staging apenas arquivos do escopo de transicao do content-engine..."
git add -A -- "${SAFE_PATHS[@]}"

if git diff --cached --quiet; then
  echo "Nada staged no escopo seguro."
  exit 1
fi

echo "Validando arquivos proibidos no stage..."
if git diff --cached --name-only | rg -n '(^\.env$|^\.claude/|\.pem$|\.key$|id_rsa|\.p12$|\.jks$|\.crt$|\.cer$)' >/dev/null; then
  echo "Bloqueado: arquivo sensivel detectado no stage."
  git diff --cached --name-only | rg -n '(^\.env$|^\.claude/|\.pem$|\.key$|id_rsa|\.p12$|\.jks$|\.crt$|\.cer$)'
  exit 1
fi

echo "Validando segredos no diff staged..."
STAGED_DIFF="$(git diff --cached -U0)"
if printf '%s' "$STAGED_DIFF" | rg -n '(sk-[A-Za-z0-9]{20,}|tvly-[A-Za-z0-9_-]{10,}|AKIA[0-9A-Z]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)' >/dev/null; then
  echo "Bloqueado: padrao de segredo detectado no diff staged."
  exit 1
fi

echo "Validando conflitos e whitespace..."
git diff --cached --check >/dev/null

echo "Rodando sanity check python do content-engine..."
if [[ -x "../neo-content-engine/.venv/bin/python" ]]; then
  ../neo-content-engine/.venv/bin/python -m py_compile \
    ../neo-content-engine/scripts/mine_tiktok_shop.py \
    ../neo-content-engine/scripts/run_neo_tiktokshop.py
else
  python3 -m py_compile \
    ../neo-content-engine/scripts/mine_tiktok_shop.py \
    ../neo-content-engine/scripts/run_neo_tiktokshop.py
fi

if [[ "$DRY_RUN" == "1" ]]; then
  echo "DRY_RUN=1: validacoes concluidas, commit/push nao executados."
  echo "Arquivos staged:"
  git diff --cached --name-only
  exit 0
fi

echo "Commit..."
git commit -m "$MSG"

if [[ "$PUSH" != "1" ]]; then
  echo "Push desativado por padrao. Commit local concluido."
  echo "Para enviar ao remoto de forma explicita: PUSH=1 make safe-content-push MSG='...'"
  exit 0
fi

echo "Push em origin/$BRANCH..."
git push origin "$BRANCH"

echo "OK: commit e push concluido com validacao de seguranca."
