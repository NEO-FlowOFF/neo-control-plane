# Neoflowoff TikTok Shop Platform

Plataforma unificada da **FlowOff** (`FLOWOFF MARKETING E ASSESSORIA DIGITAL LTDA - ME`) para gerenciamento e automação de múltiplos vendedores no ecossistema TikTok Shop.

## 🏢 Contexto Administrativo
- **Empresa:** FlowOff Marketing e Assessoria Digital
- **CNPJ:** `43.376.355/0001-92`
- **Papel:** Service Provider (Agência/Admin) para gestão de vendedores.

---

## 🏗️ Estrutura Multi-Seller

O projeto separa o "motor" das configurações de cada cliente para permitir escala rápida da equipe de vendas:

- **`packages/`**: O Core da plataforma (Código Compartilhado).
  - `@neomello/db`: Prisma 7, criptografia de tokens e controle de estado.
  - `@neomello/tiktok-sdk`: Cliente de API TikTok Shop.
  - `@neomello/api`: OAuth, Webhooks e endpoints de gerenciamento.
  - `@neomello/worker`: Automações, refresh de tokens e jobs assíncronos.
- **`accounts/`**: Configurações e identidades de cada vendedor (Instâncias).
  - `accounts/julia-jtt-tiktok/`: Instância inicial ativa.

---

## � Fluxo de Operação
Para detalhes de configuração de infraestrutura, variáveis de ambiente e comandos de build, consulte o guia técnico:

� **[SETUP.md](./SETUP.md)**

1. **Autorização**: Agência gera URL de autorização para o vendedor.
2. **Sincronização**: Troca de chaves e armazenamento seguro.
3. **Automação**: O motor processa inventário, anúncios e webhooks em tempo real.

---

## 🚀 Expansão da Equipe
Para adicionar um novo vendedor, siga o padrão de diretórios em `accounts/` e utilize o `workspaceId` para isolamento de dados.

---
*Mantido por Neomello para FlowOff Assessoria Digital.*
