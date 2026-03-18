# 🛠️ NΞØ FlowOFF - Guia Técnico de Setup

Este documento contém as instruções técnicas necessárias para preparar o ambiente de desenvolvimento e produção do **NΞØ FlowOFF**.

---

## 📋 Pré-requisitos

Antes de começar, certifique-se de ter instalado:
*   **Node.js**: v20 ou superior.
*   **PNPM**: v9 ou superior (Gerenciador de pacotes principal).
*   **Docker**: Opcional, mas recomendado para rodar Redis e PostgreSQL localmente.

---

## 🚀 Início Rápido

O projeto utiliza um `Makefile` para automatizar as tarefas mais complexas de permissões e instalação.

### Resumo dos Comandos Principais
*   **`make setup`**: Faz a limpeza, instala tudo e gera o banco (ideal para começar o dia).
*   **`make build`**: Constrói todos os pacotes na ordem correta.
*   **`make check`**: Valida se existe algum erro de código em qualquer parte do monorepo (Type Check completo).
*   **`make dev-dashboard`**: Sobe o frontend que acabamos de refatorar para visualização das mudanças.

> [!TIP]
> Recentemente corrigimos avisos internos (*lints*) nos arquivos do Dashboard (`AppLayout.tsx` e `Ranking.tsx`), garantindo um build 100% limpo.

---

## 🗄️ Banco de Dados (Prisma v7)

O monorepo utiliza **Prisma v7** com geração de cliente local para evitar conflitos de shadowing entre pacotes.

*   **Gerar Cliente**: `pnpm run db:generate` (ou `make db-generate`)
*   **Validar Schema**: `pnpm run db:validate`

> [!IMPORTANT]
> O cliente é gerado em `packages/db/generated/client`. Sempre que o schema for alterado, você deve rodar o comando de geração.

---

## 📂 Estrutura de Desenvolvimento

Para rodar os módulos individualmente durante o desenvolvimento:

| Comando | Descrição |
| :--- | :--- |
| `make dev-api` | Inicia o Backend Fastify em modo watch. |
| `make dev-worker` | Inicia o processador de filas BullMQ. |
| `make dev-dashboard` | Inicia o Dashboard (Vite/React). |
| `make dev-intelligence` | Inicia o motor de IA em modo de compilação. |

---

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto seguindo o modelo `.env.example`.

Principais variáveis:
*   `DATABASE_URL`: Conexão PostgreSQL.
*   `REDIS_URL`: Conexão Redis para as filas do BullMQ.
*   `OPENAI_API_KEY`: Necessária para o `@neomello/intelligence`.
*   `TIKTOK_SHOP_APP_KEY/SECRET`: Integrar com a API de parceiros do TikTok.

---

## 🧹 Manutenção

Se encontrar problemas com permissões de arquivos ou `node_modules` corrompidos:
```bash
make fix-perms  # Corrige a autoria dos arquivos para o usuário atual
make clean      # Remove todos os node_modules e artefatos de build
```

---

> [!NOTE]
> Para detalhes sobre a visão estratégica e roadmap, consulte o [README.md](./README.md).
