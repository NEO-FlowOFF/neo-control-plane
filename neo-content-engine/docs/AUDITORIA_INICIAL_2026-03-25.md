# Auditoria Inicial do Content Engine

Data: 2026-03-25
Escopo: `neo-content-engine`
Status: apto para endurecimento, nao para confianca operacional plena

## Leitura Executiva

O modulo ja tem um fluxo funcional concentrado em dois scripts principais:

- `scripts/mine_tiktok_shop.py`
- `scripts/run_neo_tiktokshop.py`

Isso basta para provar conceito.
Nao basta para operar com previsibilidade.

O ponto cego aqui nao e sintaxe.
E semantica operacional.
Fila, repeticao segura, degradacao controlada e governanca de storage ainda estao expostos.

## Achados Prioritarios

### 1. [P1] Arquivamento elimina itens nao processados

Arquivo:
- `scripts/run_neo_tiktokshop.py`

Trecho afetado:
- corte de lote por `max_products`
- arquivamento integral do CSV ao final da execucao

Problema:
O script limita a execucao com `products = products[: args.max_products]`, mas depois move o CSV inteiro para `runtime/inputs/archive`.
Na pratica, o throughput e limitado, mas a fila remanescente e descartada.

Impacto:
- perda silenciosa de backlog
- falsa sensacao de processamento completo
- impossibilidade de confiar no comportamento por lote

Como resolver:
1. Separar `products_to_process` de `products_remaining`.
2. Processar apenas o recorte solicitado.
3. Regravar `pending_products.csv` com o restante nao processado.
4. Arquivar apenas os itens realmente consumidos, ou arquivar um snapshot de auditoria separado.
5. Registrar no metadata final quantos itens entraram, quantos sairam e quantos permaneceram na fila.

Direcao recomendada:
Transformar o CSV em fila explicita, nao em arquivo descartavel.

### 2. [P1] Falha de um item derruba o lote apos efeitos parciais

Arquivo:
- `scripts/run_neo_tiktokshop.py`

Trecho afetado:
- loop principal de processamento por produto

Problema:
O pipeline executa TTS, render e upload dentro de um loop sem isolamento transacional por item.
Se um produto falha depois de outros ja terem gerado audio, video ou upload, a execucao aborta com efeitos parciais.

Impacto:
- lote fica em estado misto
- rerun pode duplicar artefatos
- debug fica opaco
- uma falha periferica contamina a execucao inteira

Como resolver:
1. Envolver cada produto em `try/except` proprio.
2. Registrar `status=success|failed` por item.
3. Persistir erro estruturado no metadata individual.
4. Continuar para o proximo item quando a falha nao for sistêmica.
5. Retornar codigo de saida final baseado em resumo do lote:
   - `0` se tudo passou
   - `1` se houve falhas parciais ou totais

Direcao recomendada:
O lote precisa operar como carteira de jobs independentes, nao como uma unica vela acesa em sala com corrente de ar.

### 3. [P1] Upload torna o bucket publico por padrao

Arquivo:
- `scripts/run_neo_tiktokshop.py`

Trecho afetado:
- `ensure_bucket_public_read`

Problema:
Sempre que upload esta habilitado, o script garante leitura publica no bucket.
Isso e uma decisao de seguranca forte demais para nascer como default.

Impacto:
- exposicao involuntaria de artefatos
- risco de reconfigurar bucket compartilhado sem intencao
- acoplamento indevido entre "fazer upload" e "abrir acesso publico"

Como resolver:
1. Introduzir flag explicita, por exemplo `NEO_MINIO_PUBLIC_READ=1`.
2. So aplicar policy publica quando houver opt-in.
3. Manter upload privado como default.
4. Emitir aviso explicito em log quando policy publica for ativada.
5. Validar se o bucket ja possui politica antes de sobrescrever.

Direcao recomendada:
Publicacao e permissao nao sao a mesma acao.
Misturar as duas e convite para incidente com verniz de automacao.

### 4. [P2] Smoke local depende de TTS externo

Arquivo:
- `scripts/run_neo_tiktokshop.py`

Trecho afetado:
- `synthesize_audio`

Problema:
Mesmo com `--skip-upload --skip-openai`, o pipeline ainda depende de `edge_tts`, que por sua vez depende de acesso ao endpoint remoto da Microsoft.
O smoke anunciado no README nao e realmente local.

Impacto:
- reproducibilidade fraca
- onboarding dependente de rede
- testes minimos quebram em ambiente isolado

Como resolver:
1. Adicionar `--skip-tts` para smoke minimo real.
2. Adicionar fallback offline para gerar audio mudo ou sintetico com `ffmpeg`.
3. Atualizar README para distinguir:
   - smoke offline
   - smoke com rede
   - pipeline completo
4. Marcar no metadata qual modo de audio foi usado.

Direcao recomendada:
Se o teste mais basico depende de internet, ele nao e smoke.
E uma prece com timeout.

## Riscos Secundarios

### 5. Contrato de erro desalinhado no Makefile

Arquivos:
- `scripts/run_neo_tiktokshop.py`
- `Makefile`

Problema:
O script recomenda `make minio-up` e `make minio-bucket`, mas esses targets nao existem.

Como resolver:
1. Criar os targets citados.
2. Ou ajustar a mensagem de erro para os comandos reais disponiveis.

### 6. Modulo ainda parece transicao local, nao dominio consolidado

Sinais observados:
- scripts centrais ainda aparecem como nao rastreados no Git do workspace atual
- runtime local contem artefatos executados recentemente
- quase toda a logica vive em scripts longos, sem testes automatizados

Como resolver:
1. Consolidar versionamento do modulo soberano.
2. Adicionar testes minimos para parsing, fila e metadata.
3. Extrair funcoes criticas para modulos reutilizaveis e testaveis.

## Ordem Recomendada de Correcao

1. Preservar fila remanescente no CSV.
2. Isolar falha por item e resumir lote com status estruturado.
3. Colocar leitura publica do bucket sob opt-in explicito.
4. Criar smoke offline real para bootstrap local.
5. Ajustar README e Makefile para refletirem o contrato real.
6. Depois disso, iniciar refatoracao modular e testes.

## Criterio de Pronto Para Comecar de Verdade

O modulo pode ser considerado pronto para entrar em fase de trabalho serio quando cumprir o seguinte:

- processa lote sem perder backlog
- falha de um item nao mata o lote inteiro
- upload nao altera seguranca por default
- smoke basico roda sem depender de rede externa
- README descreve o comportamento real do sistema

## Conclusao

Podemos comecar.
Mas com lucidez, nao com supersticao.

Hoje existe um pipeline.
Ainda nao existe um motor confiavel.

O proximo passo correto nao e adicionar feature.
E retirar o direito do acaso de decidir o comportamento do sistema.
