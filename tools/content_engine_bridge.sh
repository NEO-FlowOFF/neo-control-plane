#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STANDALONE_DIR="${CONTENT_ENGINE_STANDALONE_DIR:-$ROOT_DIR/../neo-content-engine}"

if [[ ! -d "$STANDALONE_DIR" ]]; then
  echo "Content Engine standalone nao encontrado em: $STANDALONE_DIR"
  echo "Fonte de verdade esperada: ../neo-content-engine"
  exit 1
fi

TARGET="${1:-help}"
shift || true
EXTRA_ARGS=("$@")

echo "[content-engine] comando legado do monorepo redirecionado para $STANDALONE_DIR"
if [[ ${#EXTRA_ARGS[@]} -gt 0 ]]; then
  exec make -C "$STANDALONE_DIR" "$TARGET" ARGS="${EXTRA_ARGS[*]}"
fi

exec make -C "$STANDALONE_DIR" "$TARGET"
