# Configuração Técnica (Setup) - Neoflowoff TikTok Platform

Este documento contém as especificações técnicas, comandos de infraestrutura e variáveis de ambiente necessárias para operar a plataforma.

## 🛠️ Serviços Railway

### Infraestrutura
- **PostgreSQL**: Requer suporte a `pgcrypto` ou `gen_random_uuid()`. Utiliza um único banco com isolamento multi-tenant por `workspaceId`.
- **Redis**: Utilizado para gestão de filas BullMQ e Job Scheduling.

### Comandos de Operação
- **Build**: `npm run db:generate && npm run build`
- **Iniciar API**: `npm run start --workspace @neomello/api`
- **Iniciar Worker**: `npm run start --workspace @neomello/worker`

---

## 🔐 Variáveis de Ambiente (.env)

### Globais / Compartilhadas
- `DATABASE_URL`: String de conexão PostgreSQL.
- `REDIS_URL`: String de conexão Redis.
- `TOKEN_ENCRYPTION_KEY`: Chave de 32 bytes (hex/base64) para criptografia simétrica dos tokens OAuth.

### API (`@neomello/api`)
- `PORT`: Porta do servidor (default: 3000).
- `API_BASE_URL`: URL pública da sua API (ex: Railway app URL).
- `TIKTOK_SHOP_APP_KEY`: Client Key do App no TikTok Developers.
- `TIKTOK_SHOP_APP_SECRET`: Client Secret do App no TikTok Developers.
- `TIKTOK_SHOP_AUTHORIZE_URL`: URL de autorização do TikTok Shop.
- `TIKTOK_SHOP_TOKEN_URL`: URL de troca/refresh de token do TikTok Shop.
- `TIKTOK_SHOP_REDIRECT_URI`: Deve coincidir com o configurado no TikTok Developers.
- `OAUTH_STATE_SECRET`: Segredo para assinar o `state` do OAuth (min 16 chars).
- `TIKTOK_WEBHOOK_SECRET`: Chave secreta para validação de assinatura de webhooks.

### Worker (`@neomello/worker`)
- `TIKTOK_SHOP_API_BASE_URL`: Endpoint base da API de parceiros do TikTok Shop.
- `TIKTOK_SHOP_AUTH_REVOKED_EVENT`: Nome do evento de desautorização (ex: `AUTHORIZATION_REVOKED`).

---

## 🏗️ Guia de Desenvolvimento (Monorepo)

O projeto utiliza **NPM Workspaces**. Para gerenciar dependências ou rodar comandos em pacotes específicos:

```bash
# Rodar build em todos os pacotes
npm run build --workspaces

# Gerar cliente Prisma
npm run db:generate --workspace @neomello/db

# Adicionar dependência ao SDK
npm install <package> --workspace @neomello/tiktok-sdk
```

---
*Documento de referência técnica para a equipe de engenharia da FlowOff.*
