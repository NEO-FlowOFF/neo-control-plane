# NΞØ FlowOFF TikTok Platform - Makefile

.PHONY: all install build dev clean db-generate setup fix-perms

all: setup build

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
	rm -rf tiktok-sdk/node_modules
	rm -rf tiktok-sdk/dist

# Instalação limpa com pnpm
install:
	@echo "📦 Instalando dependências..."
	pnpm install --no-frozen-lockfile

# Build de todos os pacotes na ordem correta
build:
	@echo "🏗️  Construindo pacotes..."
	pnpm run build --recursive

# Setup completo: Corrige permissões, limpa, instala e gera banco
setup: fix-perms clean install db-generate
	@echo "✅ Setup concluído com sucesso!"

# Gerar o cliente do banco de dados (Prisma)
db-generate:
	@echo "🗄️  Gerando cliente do banco de dados..."
	pnpm run db:generate --filter @neomello/db

# Atalhos para desenvolvimento
dev-api:
	pnpm run dev --filter @neomello/api

dev-worker:
	pnpm run dev --filter @neomello/worker

dev-dashboard:
	pnpm run dev --filter @neomello/dashboard
