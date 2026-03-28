#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ACCOUNTS_DIR="${ACCOUNTS_DIR:-$ROOT_DIR/../neo-content-accounts-api}"
DASHBOARD_DIR="${DASHBOARD_DIR:-$ROOT_DIR/../neo-content-dashboard}"
LANDING_DIR="${LANDING_DIR:-$ROOT_DIR/../neo-content-landing}"
ENGINE_DIR="${ENGINE_DIR:-$ROOT_DIR/../neo-content-engine}"

CMD="${1:-}"
if [[ -z "$CMD" ]]; then
  echo "Usage: tools/workspace_orchestrator.sh <command>"
  exit 1
fi

require_dir() {
  local dir="$1"
  local name="$2"
  if [[ ! -d "$dir" ]]; then
    echo "Missing $name directory: $dir" >&2
    exit 1
  fi
}

run_in() {
  local dir="$1"
  shift
  (
    cd "$dir"
    "$@"
  )
}

doctor() {
  require_dir "$ACCOUNTS_DIR" "accounts"
  require_dir "$DASHBOARD_DIR" "dashboard"
  require_dir "$LANDING_DIR" "landing"
  require_dir "$ENGINE_DIR" "engine"

  echo "workspace_orchestrator=ok"
  echo "accounts=$ACCOUNTS_DIR"
  echo "dashboard=$DASHBOARD_DIR"
  echo "landing=$LANDING_DIR"
  echo "engine=$ENGINE_DIR"
}

case "$CMD" in
  doctor)
    doctor
    ;;

  build)
    doctor
    run_in "$ACCOUNTS_DIR" pnpm run build
    run_in "$DASHBOARD_DIR" pnpm run build
    run_in "$LANDING_DIR" pnpm run build
    ;;

  check)
    doctor
    run_in "$ACCOUNTS_DIR" pnpm run check
    run_in "$LANDING_DIR" pnpm run check
    run_in "$DASHBOARD_DIR" pnpm exec tsc --noEmit
    ;;

  db:generate)
    require_dir "$ACCOUNTS_DIR" "accounts"
    run_in "$ACCOUNTS_DIR" pnpm run db:generate
    ;;

  db:validate)
    require_dir "$ACCOUNTS_DIR" "accounts"
    run_in "$ACCOUNTS_DIR" pnpm run db:validate
    ;;

  dev:api)
    require_dir "$ACCOUNTS_DIR" "accounts"
    run_in "$ACCOUNTS_DIR" pnpm run dev:api
    ;;

  dev:worker)
    require_dir "$ACCOUNTS_DIR" "accounts"
    run_in "$ACCOUNTS_DIR" pnpm run dev:worker
    ;;

  dev:dashboard)
    require_dir "$DASHBOARD_DIR" "dashboard"
    run_in "$DASHBOARD_DIR" pnpm run dev
    ;;

  dev:landing)
    require_dir "$LANDING_DIR" "landing"
    run_in "$LANDING_DIR" pnpm run dev
    ;;

  content:setup)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make setup
    ;;

  content:mine)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make mine-real
    ;;

  content:run)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make run-real
    ;;

  content:auto)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make run-real
    ;;

  content:research-auto)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make now
    ;;

  content:runtime-ls)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make runtime-ls
    ;;

  content:runtime-clean)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make runtime-clean
    ;;

  content:runtime-clean-keep-example)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make runtime-clean-keep-example
    ;;

  minio:up)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make minio-up
    ;;

  minio:bucket)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make minio-bucket-public
    ;;

  minio:ls)
    require_dir "$ENGINE_DIR" "engine"
    run_in "$ENGINE_DIR" make runtime-ls
    ;;

  minio:down)
    echo "minio:down is managed inside neo-content-engine. Use Docker directly if needed."
    ;;

  *)
    echo "Unknown command: $CMD" >&2
    exit 1
    ;;
esac
