# NΞØ FlowOFF TikTok Platform - Blueprint & Roadmap

Este documento detalha o estado atual da plataforma, a arquitetura do monorepo e o plano de evolução para automação inteligente de TikTok Sellers.

## 🏗️ Arquitetura Atual (Monorepo PNPM)

A plataforma utiliza um monorepo gerenciado por **PNPM Workspaces**, garantindo que dependências compartilhadas sejam instaladas uma única vez e que pacotes locais (como o DB e o SDK) sejam vinculados (linked) automaticamente.

### 📦 Pacotes Principais

| Pacote | Função | Status |
| :--- | :--- | :--- |
| **`@neomello/api`** | Backend central (Fastify) que gerencia webhooks e Dashboard. | Operacional |
| **`@neomello/worker`**| Processamento em segundo plano (BullMQ) para tarefas pesadas. | Operacional |
| **`@neomello/db`** | Camada de persistência usando **Prisma v7** e PostgreSQL. | **Tipado & Pronto** |
| **`@neomello/intelligence`** | **[NOVO]** Motor de IA para geração de legendas e tokens. | **Build OK** |
| **`@neomello/tiktok-sdk`** | Integração direta com a API oficial do TikTok. | Operacional |
| **`@neomello/dashboard`** | Interface frontend para sellers (Vite/Vue). | Em desenvolvimento |

---

## 🧠 O Novo Módulo: `@neomello/intelligence`

Este pacote foi desenhado para ser o "cérebro" da plataforma, isolando a lógica de IA de outros serviços.

### Funcionalidades Implementadas:
1.  **Tokenizer Inteligente**: Usa a biblioteca `js-tiktoken` para contar tokens com precisão (encoding `cl100k_base`/GPT-4), garantindo que os prompts não estourem os limites da API e otimizando custos.
2.  **Content Intelligence**: Serviço integrado à OpenAI para gerar legendas vendedoras focadas em TikTok, com suporte a ganchos (hooks) e hashtags automáticas.
3.  **TS Config Moderno**: Configuração de TypeScript em modo ESM puro, compatível com as versões mais recentes das bibliotecas de IA.

---

## 🛠️ Guia de Manutenção & Setup

Após os ajustes de permissões e versões do Prisma, o workflow oficial é:

```bash
# Limpeza e Instalação (Usa o Makefile otimizado)
make setup

# Geração de Tipos do Banco (Sempre que o schema mudar)
pnpm run db:generate

# Build de tudo na ordem correta
make build
```

---

## 🗺️ Roadmap de Evolução (Fases)

### **Fase 1: Estabilização & IA Core (Atual)**
- [x] Migração total para PNPM Workspaces.
- [x] Setup do Prisma v7 com suporte a ESM.
- [x] Criação do pacote `@neomello/intelligence`.
- [ ] Implementação de logs detalhado para chamadas de IA.

### **Fase 2: Automação de Conteúdo (Próxima)**
- [ ] Integrar o `ContentIntelligence` no `Worker`.
- [ ] Gerar descrições automáticas sempre que um novo produto for sincronizado via Webhook.
- [ ] Implementar sistema de "Self-Healing": se o TikTok API falhar por token expirado, o Worker tenta renovar automaticamente usando o SDK.

### **Fase 3: Gestão de Multi-Sellers (`members/`)**
- [ ] Expandir a estrutura `members/` para gerenciar múltiplas lojas (ex: Julia-JTT, Store-B, etc).
- [ ] Dashboard centralizado para visualizar performance de todos os sellers ao mesmo tempo.
- [ ] Relatórios automáticos via API sobre posts realizados e engajamento.

### **Fase 4: Inteligência Avançada (Escala)**
- [ ] Suporte a análise de tendências do TikTok para sugerir edições de vídeo.
- [ ] Pesquisa Web integrada (usando MCP Tools como Tavily) para enriquecer descrições de produtos com informações de mercado.

---

## 📄 Notas de Versão (Fixes Recentes)
- **Prisma v7**: Removida a URL do Schema e centralizada no `prisma.config.ts`.
- **TypeScript**: Adicionado `tsconfig.json` na raiz para mapeamento global de pacotes (`@neomello/*`).
- **ESM**: Fixados erros de importação usando extensões `.js` geradas pelo compilador.
