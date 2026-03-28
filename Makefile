.PHONY: all help doctor clean install build check setup db-generate db-validate \
	dev dev-landing dev-public dev-dashboard dev-api dev-worker \
	minio-up minio-bucket minio-ls minio-down \
	content-setup content-mine content-run content-auto content-research-auto \
	content-runtime-ls content-runtime-clean content-runtime-clean-keep-example \
	neo-setup neo-mine neo-run neo-auto neo-research-auto safe-content-push

all: check

help:
	@echo "Workspace Orchestrator"
	@echo "  make doctor                 # Valida repositorios soberanos vizinhos"
	@echo "  make build                  # Build accounts + dashboard + landing"
	@echo "  make check                  # Check accounts + landing + dashboard"
	@echo "  make dev-landing            # Astro no repo neo-content-landing"
	@echo "  make dev-dashboard          # Vite no repo neo-content-dashboard"
	@echo "  make dev-api                # API no repo neo-content-accounts"
	@echo "  make dev-worker             # Worker no repo neo-content-accounts"
	@echo "  make content-setup          # Setup no repo neo-content-engine"
	@echo "  make content-mine           # Mineracao no repo neo-content-engine"
	@echo "  make content-run            # Render no repo neo-content-engine"
	@echo "  make content-research-auto  # Fluxo mine + run no repo neo-content-engine"


doctor:
	pnpm run doctor

clean:
	rm -rf node_modules
	rm -rf .pnpm-store
	rm -rf .vercel

install:
	@echo "Este workspace agora e um orquestrador. Instale dependencias nos repositorios soberanos."

build:
	pnpm run build

check:
	pnpm run check

setup: content-setup
	@echo "Setup concluido no repo neo-content-engine."

db-generate:
	pnpm run db:generate

db-validate:
	pnpm run db:validate

dev: dev-landing

dev-landing:
	pnpm run dev:landing

dev-public: dev-landing

dev-dashboard:
	pnpm run dev:dashboard

dev-api:
	pnpm run dev:api

dev-worker:
	pnpm run dev:worker

minio-up:
	pnpm run minio:up

minio-bucket:
	pnpm run minio:bucket

minio-ls:
	pnpm run minio:ls

minio-down:
	pnpm run minio:down

content-setup:
	pnpm run content:setup

content-mine:
	pnpm run content:mine

content-run:
	pnpm run content:run

content-auto:
	pnpm run content:auto

content-research-auto:
	pnpm run content:research-auto

content-runtime-ls:
	pnpm run content:runtime-ls

content-runtime-clean:
	pnpm run content:runtime-clean

content-runtime-clean-keep-example:
	pnpm run content:runtime-clean-keep-example

neo-setup: content-setup

neo-mine: content-mine

neo-run: content-run

neo-auto: content-auto

neo-research-auto: content-research-auto

safe-content-push:
	@echo "Safe content push deve ser executado no repositorio ../neo-content-engine."
	@echo "Exemplo: cd ../neo-content-engine && git status"
	@exit 1
