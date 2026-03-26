# Diagnostico de Autenticacao TikTok Shop

Data: 2026-03-26
Modulo: `neo-content-engine`
Contexto: integracao do `mine` com TikTok Shop API no workspace `neoflowoff-tiktok`

## Resumo Executivo

O `content-engine` esta funcional no fallback Tavily, mas a perna TikTok Shop API continua sem entrar em producao por falha estrutural de autorizacao da conta parceira no TikTok Shop Partner Center.

O erro observado no pipeline local nao e apenas de `shop_cipher` vazio. A causa mais provavel esta a montante:

- `Avaliacao de registro de parceiro`: reprovada
- motivo exibido: `The business owner ID was unclear or fully shown.`

Enquanto essa etapa nao for aprovada, a cadeia de autorizacao tende a permanecer inconsistente:

- `authorization/202309/shops` responde `401 Unauthorized`
- `TIKTOK_SHOP_CIPHER` permanece vazio
- `mode=auto` cai para `creator`
- `creator` tambem responde `401`
- o `mine` opera apenas com Tavily

## Evidencias Coletadas

### Projeto local

No `.env` do modulo:

- `TIKTOK_ACCESS_TOKEN=set`
- `TIKTOK_SHOP_APP_KEY=set`
- `TIKTOK_SHOP_APP_SECRET=set`
- `TIKTOK_SHOP_CIPHER=empty`

No `make doctor`:

```text
.env=ok
OPENAI_API_KEY=set
TAVILY_API_KEY=set
TIKTOK_ACCESS_TOKEN=set
TIKTOK_SHOP_APP_KEY=set
TIKTOK_SHOP_APP_SECRET=set
TIKTOK_SHOP_CIPHER=empty
```

No `make mine`:

```json
{
  "rows_tiktok_api": 0,
  "rows_tavily": 44,
  "tiktok_status": "creator=request_error:HTTPError:401 ..."
}
```

No helper de shops:

```bash
.venv/bin/python scripts/get_tiktok_shop_cipher.py --env-file .env
```

Resposta:

```text
HTTPError: 401 Client Error: Unauthorized
endpoint: https://open-api.tiktokglobalshop.com/authorization/202309/shops
```

### Partner Center

Foi confirmado que:

- o servico `NEØ TikTok Shop Connector` existe e esta `Ativado`
- `service_id`: `7614526955808622356`
- `app_key`: `6jaom6jf6th41`
- a URL de callback esta configurada como:
  - `https://neo-tiktok-api.up.railway.app/oauth/tiktok-shop/callback`
- os pacotes de API estao anexados ao servico

Foi identificado que:

- `7614526955808622356` e o `service_id`, nao o `shop_id`
- o dashboard de uso mostra chamadas, mas nao comprova autorizacao valida de loja
- os campos `shop_id`, `shop_cipher` e `access_token` nao apareceram de forma utilizavel na ferramenta de teste

E, principalmente:

- a home do Partner Center mostra `Avaliacao de registro de parceiro` reprovada
- motivo: `The business owner ID was unclear or fully shown.`

## Interpretacao Correta

O sistema nao esta travado por um detalhe de variavel.

Ele esta travado por identidade regulatoria incompleta no Partner Center.

Sem o registro de parceiro aprovado:

- a autorizacao da loja pode nao se consolidar
- os tokens podem nascer invalidos ou incompletos para os endpoints sensiveis
- o `shop_cipher` pode nunca ser emitido corretamente
- a API pode continuar respondendo `401`, mesmo com `app_key`, `secret` e callback corretos

Em outras palavras:

- `service_id` sem parceiro aprovado nao fecha o circuito
- `app_key` sem autorizacao real de loja nao abre a API
- `token` antigo ou emitido em contexto quebrado continua sendo cracha falso

## Ordem Correta de Correcao

### 1. Corrigir o registro de parceiro

No Partner Center:

- clicar em `Reenviar` na etapa `Avaliacao de registro de parceiro`
- reenviar a documentacao do `business owner ID`

O documento precisa estar:

- totalmente visivel
- sem cortes
- nitido
- legivel
- com todos os dados que a TikTok exige claramente expostos

### 2. Aguardar aprovacao do registro

Nao adianta insistir em `shop_cipher` antes disso.
Primeiro a conta parceira precisa estar validada.

### 3. Reautorizar o servico

Depois da aprovacao:

- usar a URL de autorizacao do servico:
  - `https://services.tiktokshop.com/open/authorize?service_id=7614526955808622356`

Ou autorizar via fluxo equivalente no Partner Center.

### 4. Obter credenciais vivas da loja

Depois da autorizacao:

- confirmar `shop_id`
- confirmar `shop_cipher`
- confirmar `access_token`

### 5. Atualizar o modulo local

No `.env` de `neo-content-engine`:

- preencher `TIKTOK_ACCESS_TOKEN`
- preencher `TIKTOK_SHOP_CIPHER`

### 6. Revalidar localmente

Rodar:

```bash
make doctor
.venv/bin/python scripts/get_tiktok_shop_cipher.py --env-file .env
make mine
```

Resultado esperado:

- `TIKTOK_SHOP_CIPHER=set`
- `rows_tiktok_api > 0`
- `tiktok_status` saindo de `401`

## Distincoes Criticas

Para evitar nova confusao:

- `service_id`: identifica o servico/app no Partner Center
- `app_key`: identifica a credencial publica do app
- `shop_id`: identifica a loja autorizada
- `shop_cipher`: identificador operacional da loja para endpoints seller
- `access_token`: credencial de acesso emitida apos autorizacao valida

Misturar essas identidades quebra o raciocinio e leva a configuracoes falsas.

## Estado Atual do Projeto

O `neo-content-engine` esta pronto para operar com Tavily e OpenAI.
O bloqueio real da perna TikTok API nao esta mais no Python do modulo.

O bloqueio agora esta no onboarding e aprovacao da conta parceira no TikTok Shop Partner Center.

## Proximo Passo Recomendado

Executar primeiro o checklist de reenvio do registro de parceiro e somente depois retomar:

- autorizacao da loja
- obtencao de `shop_cipher`
- validacao do `mine` com TikTok API ativa
