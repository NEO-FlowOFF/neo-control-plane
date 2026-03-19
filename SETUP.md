# 🛠️ NΞØ FlowOFF - Guia Técnico de Setup

Este documento contém as instruções técnicas necessárias para preparar o ambiente de desenvolvimento e produção do **NΞØ FlowOFF**.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js**: v20 ou superior.
- **PNPM**: v9 ou superior (Gerenciador de pacotes principal).
- **Docker**: Opcional, mas recomendado para rodar Redis e PostgreSQL localmente.

---

## 🚀 Início Rápido

O projeto utiliza um `Makefile` para automatizar as tarefas mais complexas de permissões e instalação.

### Resumo dos Comandos Principais

- **`make setup`**: Faz a limpeza, instala tudo e gera o banco (ideal para começar o dia).
- **`make build`**: Constrói todos os pacotes na ordem correta.
- **`make check`**: Valida se existe algum erro de código em qualquer parte do monorepo (Type Check completo).
- **`make dev-dashboard`**: Sobe o frontend que acabamos de refatorar para visualização das mudanças.

> [!TIP]
> Recentemente corrigimos avisos internos (_lints_) nos arquivos do Dashboard (`AppLayout.tsx` e `Ranking.tsx`), garantindo um build 100% limpo.

---

## 🗄️ Banco de Dados (Prisma v6)

O monorepo utiliza **Prisma v6.19.2** com geração de cliente local para evitar conflitos entre pacotes.

- **Gerar Cliente**: `pnpm run db:generate` (ou `make db-generate`)
- **Validar Schema**: `pnpm run db:validate`

> [!IMPORTANT]
> O cliente é gerado em `packages/db/generated/client`. Sempre que o schema for alterado, você deve rodar o comando de geração.

---

## 📂 Estrutura de Desenvolvimento

## 🛠 Início Rápido

Para começar rapidamente com o ambiente técnico e comandos do sistema:

```bash
make setup      # Prepara todo o ambiente (recomendado)
make build      # Constrói todos os pacotes
make check      # Verifica erros de código
```

## 📂 Estrutura do Repositório

```text
neoflowoff-tiktok/
├── packages/
│   ├── api/            Backend (Fastify)
│   ├── worker/         Processador de Tarefas (BullMQ)
│   ├── db/             Camada de Dados (Prisma v6)
│   ├── intelligence/   Motor Neural de IA
│   └── dashboard/      Frontend (Vite/React)
├── tiktok-sdk/         Integração API TikTok
├── members/            Configurações de Sellers
└── docs/               Documentação da Plataforma
```

────────────────────────────────────────

Para rodar os módulos individualmente durante o desenvolvimento:

| Comando                 | Descrição                                   |
| :---------------------- | :------------------------------------------ |
| `make dev-api`          | Inicia o Backend Fastify em modo watch.     |
| `make dev-worker`       | Inicia o processador de filas BullMQ.       |
| `make dev-dashboard`    | Inicia o Dashboard (Vite/React).            |
| `make dev-intelligence` | Inicia o motor de IA em modo de compilação. |

---

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto seguindo o modelo `.env.example`.

O `dashboard` usa Vite com `envDir` apontando para a raiz do monorepo, então `VITE_API_BASE_URL` também deve ser definido nesse mesmo `.env` raiz para desenvolvimento local e builds consistentes.

Principais variáveis:

- `DATABASE_URL`: Conexão PostgreSQL.
- `DB_CONNECT_TIMEOUT_MS`: Timeout de bootstrap da API para falhar rápido quando o banco não responde.
- `REDIS_URL`: Conexão Redis para as filas do BullMQ.
- `OPENAI_API_KEY`: Necessária para o `@neomello/intelligence`.
- `TIKTOK_SHOP_APP_KEY` e `TIKTOK_SHOP_APP_SECRET`: Integração com a API de parceiros do TikTok Shop.
- `TIKTOK_WEBHOOK_SECRET`, `TIKTOK_WEBHOOK_SIGNATURE_HEADER` e `TIKTOK_WEBHOOK_TIMESTAMP_HEADER`: Validação dos webhooks recebidos.
- `VITE_API_BASE_URL`: Base URL consumida pelo dashboard para consultar a API. Em dev local, use `http://localhost:3000`.

---

## 🧹 Manutenção

Se encontrar problemas com permissões de arquivos ou `node_modules` corrompidos:

```bash
make fix-perms  # Corrige a autoria dos arquivos para o usuário atual
make clean      # Remove todos os node_modules e artefatos de build
```

---

```text
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃ CAPACIDADES DA PLATAFORMA
┣━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
┃
┃ 🤖 Inteligência Neural
┃    └─ Conteúdo otimizado GPT-4 Turbo
┃       via @neomello/intelligence
┃
┃ ⚙️ Automação de Fluxo (Flow)
┃    └─ Sincronização via Webhook
┃       e fila de postagem automática
┃
┃ 📊 Dashboard Multi-Store
┃    └─ Gestão centralizada para
┃       múltiplas contas de sellers
┃
┃ 🛡️ Self-Healing SDK
┃    └─ Atualização automática de tokens
┃       via @neomello/tiktok-sdk
┃
┃ 🏗️ Infraestrutura Escalável
┃    └─ BullMQ + Redis para alto
┃       volume de processamento
┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

> [!NOTE]
> Para detalhes sobre a visão estratégica e roadmap, consulte o [README.md](./README.md).
