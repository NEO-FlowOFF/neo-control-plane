# NΞØ FlowOFF TikTok Platform - Makefile

.PHONY: all help install build dev clean db-generate setup fix-perms check dev-api dev-worker dev-dashboard dev-landing dev-public dev-intelligence minio-up minio-down minio-bucket minio-ls content-setup content-mine content-run content-auto content-research-auto content-runtime-ls content-runtime-clean content-runtime-clean-keep-example neo-setup neo-mine neo-run neo-auto neo-research-auto safe-content-push workspace-doctor

ARGS ?=

all: setup build

help:
	@echo "Comandos principais:"
	@echo "  make dev          # Landing publica (Astro)"
	@echo "  make dev-landing  # Landing publica (Astro)"
	@echo "  make dev-public   # Alias para a landing publica"
	@echo "  make dev-dashboard# Dashboard interno (Vite/React)"
	@echo "  make dev-api      # API local (Fastify)"
	@echo "  make dev-worker   # Worker local"
	@echo "  make build        # Build completo do monorepo"
	@echo "  make check        # Type check do monorepo"
	@echo "  make minio-up     # Sobe ou inicia MinIO local"
	@echo "  make minio-bucket # Cria bucket e publica leitura"
	@echo "  make minio-ls     # Lista objetos do bucket"
	@echo "  make minio-down   # Para o container MinIO"
	@echo "  make workspace-doctor # Valida manifests e repositorios modulares"
	@echo "  make content-*     # Ponte para o repo standalone em ../neo-content-engine"
	@echo "  make content-setup # Prepara o repo standalone"
	@echo "  make content-mine  # Pesquisa produtos no repo standalone"
	@echo "  make content-run   # Renderiza e publica videos no repo standalone"
	@echo "  make content-auto  # MinIO + render/publicacao no repo standalone"
	@echo "  make content-research-auto # Pesquisa + render/publicacao no repo standalone"
	@echo "  make content-runtime-ls # Lista runtime do repo standalone"
	@echo "  make content-runtime-clean # Limpa runtime do repo standalone"
	@echo "  make content-runtime-clean-keep-example # Limpa runtime e preserva TX_TEST_IMG"
	@echo "  make safe-content-push MSG='mensagem' # Commit local com gate de seguranca (sem push)"
	@echo "  PUSH=1 make safe-content-push MSG='mensagem' # Push remoto explicito"
	@echo "  make neo-*         # Alias legado para content-*"

# Corrige permissões caso o sudo tenha sido usado
fix-perms:
	@echo "🔐 Corrigindo permissões..."
	sudo chown -R $$(whoami) .
	sudo chown -R $$(whoami) ~/.npm || true

# Limpeza total para evitar conflitos de cache e node_modules antigos
clean:
	@echo "🧹 Limpando ambiente..."
	rm -rf package-lock.json
	rm -rf pnpm-lock.yaml
	rm -rf node_modules
	rm -rf packages/*/node_modules
	rm -rf packages/*/dist
	rm -rf packages/db/generated
	rm -rf tiktok-sdk/node_modules
	rm -rf tiktok-sdk/dist

# Instalação limpa com pnpm
install:
	@echo "📦 Instalando dependências..."
	pnpm install --no-frozen-lockfile

# Verificação de tipos em todo o projeto
check:
	@echo "🔍 Verificando integridade do código (Type Check)..."
	pnpm run check

# Build de todos os pacotes na ordem correta
build:
	@echo "🏗️  Construindo pacotes..."
	pnpm run build

# Setup completo: Corrige permissões, limpa, instala e gera banco
setup: fix-perms clean install db-generate
	@echo "✅ Setup concluído com sucesso!"

# Gerar o cliente do banco de dados (Prisma)
db-generate:
	@echo "🗄️  Gerando cliente do banco de dados..."
	pnpm run db:generate

# Atalhos para desenvolvimento
dev: dev-landing

dev-landing:
	pnpm --filter @neomello/landing run dev

dev-public: dev-landing

dev-api:
	pnpm --filter @neomello/api run dev

dev-worker:
	pnpm --filter @neomello/worker run dev

dev-dashboard:
	pnpm --filter @neomello/dashboard run dev

dev-intelligence:
	pnpm --filter @neomello/intelligence run dev

minio-up:
	pnpm run minio:up

minio-bucket:
	pnpm run minio:bucket

minio-ls:
	pnpm run minio:ls

minio-down:
	pnpm run minio:down

content-setup:
	bash tools/content_engine_bridge.sh setup

content-mine:
	bash tools/content_engine_bridge.sh mine $(filter-out $@,$(MAKECMDGOALS))

content-run:
	bash tools/content_engine_bridge.sh run $(filter-out $@,$(MAKECMDGOALS))

content-auto:
	bash tools/content_engine_bridge.sh auto $(ARGS)

content-research-auto:
	bash tools/content_engine_bridge.sh research-auto $(ARGS)

content-runtime-ls:
	bash tools/content_engine_bridge.sh runtime-ls

content-runtime-clean:
	bash tools/content_engine_bridge.sh runtime-clean

content-runtime-clean-keep-example:
	bash tools/content_engine_bridge.sh runtime-clean-keep-example

neo-setup: content-setup

neo-mine: content-mine

neo-run: content-run

neo-auto: content-auto

neo-research-auto: content-research-auto

safe-content-push:
	@test -n "$(MSG)" || (echo "Use: make safe-content-push MSG='mensagem do commit'" && exit 1)
	./tools/safe_content_push.sh "$(MSG)"

workspace-doctor:
	node tools/workspace_doctor.js

%:
	@:
