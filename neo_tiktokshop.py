import os
import json
import time
import subprocess
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
import openai

# ==========================================
# ENV DETECTION & SECRETS WRAPPER
# ==========================================
try:
    from google.colab import drive, userdata
    IN_COLAB = True
except ImportError:
    IN_COLAB = False
    drive = None
    userdata = None
    load_dotenv() # Load local .env if not in Colab

def get_secret(key, default=None):
    if IN_COLAB and userdata:
        try: return userdata.get(key)
        except: pass
    return os.getenv(key, default)

# ==========================================
# PERSISTENCE & INFRA
# ==========================================
if IN_COLAB and drive:
    drive.mount('/content/drive')
    BASE_DIR = '/content/drive/MyDrive/TikTok_Arbitrage_Node'
else:
    # Use current directory or a local path for non-Colab environments
    BASE_DIR = get_secret('LOCAL_BASE_DIR', './TikTok_Arbitrage_Node')

for d in ['inputs', 'outputs', 'assets']:
    os.makedirs(os.path.join(BASE_DIR, d), exist_ok=True)

# Neural Authentication
try:
    os.environ["OPENAI_API_KEY"] = get_secret('OPENAI_API_KEY')
    client = openai.OpenAI()
except Exception as e:
    print("\033[91m[FALHA DE SISTEMA] Secret 'OPENAI_API_KEY' não configurada.\033[0m")


# ==========================================
# [BLOCO 2] MOTORES DE SÍNTESE E VÍDEO
# Funções core do pipeline
# ==========================================
def synthesize_narrative_node(product_name: str, problem: str, offer: str) -> dict:
    system_prompt = """
    Você é um motor de arbitragem de atenção no TikTok. Gere 1 script de resposta direta (15s).
    Formato OBRIGATÓRIO de saída (JSON estrito):
    {
      "hook_text_screen": "TEXTO CURTO PARA TELA (MAX 4 PALAVRAS)",
      "tts_audio_script": "Roteiro completo (Hook -> Agitação -> Solução -> CTA)"
    }
    """
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={ "type": "json_object" },
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Produto: {product_name} | Problema: {problem} | Oferta: {offer}"}
            ],
            temperature=0.7
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        raise SystemExit(f"\033[91m[KILL SWITCH] Falha na LLM: {str(e)}\033[0m")

def synthesize_audio_node(tts_text: str, output_path: str, voice: str = "pt-BR-AntonioNeural"):
    command = ['edge-tts', '--voice', voice, '--text', tts_text, '--write-media', output_path]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def render_faceless_video(bg_video_path: str, audio_path: str, output_path: str, hook_text: str):
    safe_hook = hook_text.replace("'", "").replace(":", "")
    drawtext_filter = (
        f"drawtext=text='{safe_hook}':fontcolor=0xFF2D9C:fontsize=72:x=(w-text_w)/2:y=(h-text_h)/2:"
        f"bordercolor=0x00E6FF:borderw=4:enable='between(t,0,1.5)'"
    )
    command = [
        'ffmpeg', '-y',
        '-i', bg_video_path,
        '-i', audio_path,
        '-filter_complex', f"[0:v]eq=contrast=1.1:brightness=-0.02,{drawtext_filter}[v]",
        '-map', '[v]', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'ultrafast',
        '-c:a', 'aac', '-shortest',
        output_path
    ]
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


# ==========================================
# [BLOCO 3] ORQUESTRADOR MASTER (DATALINK ATIVO)
# Lê o CSV injetado pelo Nó 01 e processa a fila
# ==========================================
# The imports below were moved to the top of the cell for better code organization.
# import time
# import os
# import pandas as pd
# from pathlib import Path

def run_dynamic_arbitrage_engine():
    print("\033[96m[SISTEMA INICIADO] Booting Arbitrage Engine (Datalink Node)...\033[0m")

    base_path = Path(BASE_DIR)
    input_csv = base_path / 'inputs' / 'pending_products.csv'
    archive_dir = base_path / 'inputs' / 'archive'
    os.makedirs(archive_dir, exist_ok=True)

    # 1. Validação de Estado
    if not input_csv.exists():
        print("\033[93m[IDLE] Nenhum lote de dados recebido do Nó 01. Sistema em repouso...\033[0m")
        return

    try:
        # 2. Ingestão de Dados
        df_pending = pd.read_csv(input_csv)
        print(f"\033[96m[INGESTÃO] {len(df_pending)} nós de valor detetados no lote.\033[0m")
    except Exception as e:
        print(f"\033[91m[FALHA DE LEITURA] Ficheiro CSV corrompido ou bloqueado: {e}\033[0m")
        return

    # 3. Loop de Produção
    for index, prod in df_pending.iterrows():
        print(f"\n\033[95m[PROCESSANDO NÓ] ID: {prod['id']} | {prod['name']}\033[0m")

        # O Nó 01 local envia caminhos absolutos do Mac/Windows.
        # Aqui forçamos a leitura do vídeo de base alojado no Drive.
        bg_video_path = str(base_path / 'assets' / 'sample_bg.mp4')

        if not os.path.exists(bg_video_path):
            print(f"\033[91m[FALHA DE DEPENDÊNCIA] Ativo base ausente: {bg_video_path}\033[0m")
            continue

        try:
            # A. Autoria Algorítmica (LLM)
            script_data = synthesize_narrative_node(prod['name'], str(prod['problem']), str(prod['offer']))

            # B. Síntese Neural (TTS)
            audio_path = str(base_path / 'assets' / f"{prod['id']}_audio.mp3")
            synthesize_audio_node(script_data['tts_audio_script'], audio_path)

            # C. Renderização H.264
            video_out = str(base_path / 'outputs' / f"{prod['id']}_final_render.mp4")
            render_faceless_video(bg_video_path, audio_path, video_out, script_data['hook_text_screen'])

            print(f"\033[92m[CICLO FECHADO] Ativo gerado com sucesso: {video_out}\033[0m")

        except Exception as e:
            # Falha contida: um erro de API não derruba o lote inteiro
            print(f"\033[91m[CRASH] Falha no loop do produto {prod['id']}: {e}\033[0m")
            continue

        time.sleep(2) # Backoff algorítmico de proteção de API

    # 4. Mutação de Estado (Caminho de Desligamento)
    # Move o CSV para o arquivo para não ser lido no próximo ciclo de execução.
    timestamp = int(time.time())
    archived_csv = archive_dir / f"processed_{timestamp}.csv"
    os.rename(input_csv, archived_csv)
    print(f"\n\033[92m[SISTEMA] Lote consumido. Dados arquivados em: {archived_csv}\033[0m")

# ==========================================
# GATILHO DE EXECUÇÃO
# ==========================================
# Descomente a linha abaixo para executar o nó.
# run_dynamic_arbitrage_engine()

# [LOCAL SETUP] Commented out Jupyter-specific shell commands
# os.system('pip install -q playwright tavily-python pandas')
# os.system('playwright install chromium')

from playwright.async_api import async_playwright
from tavily import TavilyClient
import asyncio

# ==========================================
# INFRAESTRUTURA E SECRETS (GLOBAL WRAPPER)
# ==========================================
# BASE_DIR is already defined at the top

LOCAL_DRIVE_SYNC_PATH = Path(BASE_DIR)

try:
    TAVILY_API_KEY = get_secret('TAVILY_API_KEY')
    if not TAVILY_API_KEY:
        raise ValueError("TAVILY_API_KEY not found. Please configure it in your environment or secrets.")
    tavily = TavilyClient(api_key=TAVILY_API_KEY)
    print("\033[92m[SUCESSO] Motor de OSINT Tavily autenticado.\033[0m")
except Exception as e:
    print(f"\033[91m[FALHA CRÍTICA] Erro ao carregar TAVILY_API_KEY: {e}\033[0m")

# ==========================================
# MOTOR DE INTELIGÊNCIA (TAVILY)
# ==========================================
def get_saturation_penalty(product_name: str) -> float:
    """
    Usa o Tavily para buscar menções recentes do produto ligadas ao TikTok.
    Retorna um multiplicador de penalidade: muitos resultados = alta saturação.
    """
    try:
        print(f"[\033[95mOSINT\033[0m] Sondando saturação web para: {product_name}")
        query = f'"{product_name}" "TikTok Shop" OR "TikTok made me buy it"'
        response = tavily.search(query=query, search_depth="basic", max_results=5)

        # Heurística simples: mais resultados e menções = maior saturação
        results_count = len(response.get('results', []))
        penalty = 1.0 - (results_count * 0.15) # Reduz o score em até 75% se o oceano estiver vermelho
        return max(0.1, penalty)
    except Exception as e:
        print(f"\033[91m[FALHA TAVILY] {e}\033[0m")
        return 0.5 # Penalidade média em caso de falha da API

# ==========================================
# MOTOR DE EXTRAÇÃO (PLAYWRIGHT)
# ==========================================
async def run_local_miner_node():
    print("\033[96m[SISTEMA INICIADO] Booting Local Data Miner...\033[0m")

    USER_DATA_DIR = "./chrome_session_tiktok"

    async with async_playwright() as p:
        # Launching with headless=False to see the mining process locally
        browser = await p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False # Set to False locally so you can see it working
        )
        page = await browser.new_page()

        try:
            # URL alvo da tela de Análise de Produtos Mais Vendidos (Brasil)
            await page.goto("https://seller-br.tiktok.com/compass/product-analysis/top-selling-products", timeout=60000)
            print("[SISTEMA] Aguardando carregamento do DOM...")

            # --- INSTRUÇÕES IMPORTANTES PARA OS SELETORES ---
            # Os seletores podem ser passados via environment variables
            PRODUCT_CARD_SELECTOR = get_secret('TIKTOK_PRODUCT_CARD_SELECTOR')
            PRODUCT_TITLE_SELECTOR = get_secret('TIKTOK_PRODUCT_TITLE_SELECTOR')
            COMMISSION_AMOUNT_SELECTOR = get_secret('TIKTOK_COMMISSION_AMOUNT_SELECTOR')

            if not all([PRODUCT_CARD_SELECTOR, PRODUCT_TITLE_SELECTOR, COMMISSION_AMOUNT_SELECTOR]):
                raise ValueError("Os seletores do TikTok Affiliate não foram configurados. Verifique se estão no .env ou secrets.")

            # --- FIM DAS INSTRUÇÕES ---

            await page.wait_for_selector(PRODUCT_CARD_SELECTOR, timeout=15000)
            product_elements = await page.locator(PRODUCT_CARD_SELECTOR).all()

            extracted_data = []

            for item in product_elements[:5]: # Limita aos 5 primeiros para teste
                name = await item.locator(PRODUCT_TITLE_SELECTOR).inner_text()
                commission_str = await item.locator(COMMISSION_AMOUNT_SELECTOR).inner_text()
                
                # NOVO: Limpeza robusta para lidar com ranges e sufixos (ex: 603K ~ 957K)
                def parse_tiktok_number(val_str):
                    # Pega o primeiro valor se for um range
                    first_part = val_str.split('~')[0].strip()
                    clean_val = first_part.replace('R$', '').replace('$', '').replace(',', '.').strip()
                    
                    multiplier = 1.0
                    if 'K' in clean_val.upper():
                        multiplier = 1000.0
                        clean_val = clean_val.upper().replace('K', '')
                    elif 'M' in clean_val.upper():
                        multiplier = 1000000.0
                        clean_val = clean_val.upper().replace('M', '')
                    
                    try:
                        return float(clean_val) * multiplier
                    except:
                        return 0.0

                commission = parse_tiktok_number(commission_str)

                # Injeta a inteligência do Tavily
                saturation_multiplier = get_saturation_penalty(name)
                final_score = commission * saturation_multiplier

                # Só processa se o Score compensar o risco de CPU
                if final_score > 2.0:
                    extracted_data.append({
                        "id": f"TX_{int(time.time())}",
                        "name": name,
                        "problem": "Problema não definido (Requer LLM)", # Será preenchido na Nuvem
                        "offer": f"R$ {commission} de comissão",
                        "bg_video": str(LOCAL_DRIVE_SYNC_PATH / "assets" / "sample_bg.mp4"), # Fallback default
                        "score": final_score
                    })

            # ==========================================
            # PERSISTÊNCIA (PONTE LOCAL -> NUVEM)
            # ==========================================
            if extracted_data:
                df = pd.DataFrame(extracted_data)
                csv_path = LOCAL_DRIVE_SYNC_PATH / "pending_products.csv"
                df.to_csv(csv_path, index=False)
                print(f"\033[92m[CICLO FECHADO] {len(extracted_data)} nós salvos em {csv_path}\033[0m")
                print("O Google Drive Desktop sincronizará este arquivo com a nuvem automaticamente.")
            else:
                print("\033[93m[ALERTA] Nenhum produto atingiu o threshold de score.\033[0m")

        except Exception as e:
            print(f"\033[91m[KILL SWITCH] Falha no DOM ou Timeout: {e}\033[0m")
        finally:
            await browser.close()

if __name__ == "__main__":
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        loop.create_task(run_local_miner_node())
    else:
        asyncio.run(run_local_miner_node())

# [LOCAL SETUP] Playwright browser installs
# os.system('playwright install chrome')
# os.system('playwright install chromium')
# os.system('playwright install --force chromium')

# Removed redundant top-level await for local execution
# await run_local_miner_node()

import hmac
import hashlib
import urllib.parse
import requests
# Base URL da API do TikTok Shop (Lendo do .env ou padrão produção)
TIKTOK_SHOP_API_BASE_URL = get_secret('TIKTOK_SHOP_API_BASE_URL', "https://open-api.tiktokglobalshop.com")

# Acesse as credenciais dos Secrets ou Environment Variables
access_token = get_secret('TIKTOK_ACCESS_TOKEN')
app_key = get_secret('TIKTOK_APP_KEY')
client_secret = get_secret('TIKTOK_CLIENT_SECRET')

# Verificação básica
if not all([access_token, app_key, client_secret]):
    print("\033[91m[FALHA DE SEGURANÇA] Por favor, configure TIKTOK_ACCESS_TOKEN, TIKTOK_APP_KEY e TIKTOK_CLIENT_SECRET.\033[0m")

# --- Parâmetros da Requisição (ajuste conforme a documentação da API) ---
# Timestamp atual em segundos (não pode ser mais de 5 minutos diferente da geração da assinatura)
timestamp = str(int(time.time()))

# O caminho da API para Get Authorized Shops
# ATENÇÃO: Este caminho pode ter mudado junto com o domínio base. Verifique a documentação da API do TikTok.
api_path = "/authorization/202309/shops"

# Parâmetros de query para a requisição (ainda sem a assinatura)
query_params = {
    'app_key': app_key,
    'timestamp': timestamp
}

# Geração da assinatura (sign) - Padrão TikTok Shop V2
# 1. Obter todos os parâmetros de query e ordenar por chave
sorted_keys = sorted(query_params.keys())
# 2. Concatenar chave e valor: key1value1key2value2...
param_string = "".join([f"{k}{query_params[k]}" for k in sorted_keys])
# 3. Construir a string para assinar: app_secret + path + params + app_secret
string_to_sign = f"{client_secret}{api_path}{param_string}{client_secret}"

# 4. Gerar o hash HMAC-SHA256 usando o client_secret como chave
signature = hmac.new(
    client_secret.encode('utf-8'), 
    string_to_sign.encode('utf-8'), 
    hashlib.sha256
).hexdigest()

# Adiciona a assinatura aos parâmetros de query
query_params['sign'] = signature

# --- Headers da Requisição ---
headers = {
    'Content-Type': 'application/json',
    'x-tts-access-token': access_token
}

# Constrói a URL completa com os parâmetros de query
full_url = f"{TIKTOK_SHOP_API_BASE_URL}{api_path}?{urllib.parse.urlencode(query_params)}"

print("Preparando para chamar a API 'Get Authorized Shops'...")
print(f"URL: {full_url}")
print(f"Headers: {headers}")

try:
    # Faça a requisição GET
    response = requests.get(
        full_url,
        headers=headers
    )

    # Verifique o status da resposta
    response.raise_for_status() # Lança um erro para status HTTP ruins (4xx ou 5xx)

    # Imprima a resposta JSON
    try:
        authorized_shops_data = response.json()
        print("\nResposta da API 'Get Authorized Shops':")
        print(json.dumps(authorized_shops_data, indent=2))
    except json.JSONDecodeError:
        print("\nResposta da API (Texto plano - Falha ao decodificar JSON):")
        print(response.text)

except requests.exceptions.HTTPError as http_err:
    print(f"\033[91m[ERRO HTTP] {http_err}\033[0m")
    print(f"Resposta do servidor: {response.text}")
except requests.exceptions.RequestException as req_err:
    print(f"\033[91m[ERRO DE REQUISIÇÃO] {req_err}\033[0m")
    if 'response' in locals() or 'response' in globals():
        print(f"Conteúdo da resposta: {response.text}")
except Exception as e:
    print(f"\033[91m[ERRO GERAL] {e}\033[0m")

# ==========================================
# [BLOCO 1] SETUP DE INFRAESTRUTURA (COLAB EXCLUSIVE)
# ==========================================
if IN_COLAB:
    # os.system('apt-get update -qq')
    # os.system('apt-get install -y ffmpeg libatk-bridge2.0-0 libgtk-3-0 espeak-ng')
    # os.system('pip install -q openai elevenlabs edge-tts pandas google-colab playwright tavily-python')
    pass

# [CÉLULA DE INJEÇÃO DE MOCKUP] - GERAÇÃO DE ASSET SINTÉTICO

# Configuração do caminho de destino (Automaticamente detectado: Drive ou Local)
base_path = Path(BASE_DIR) / 'assets'
output_bg = str(base_path / 'sample_bg.mp4')

# Certifica que o diretório existe (redundância de segurança)
os.makedirs(base_path, exist_ok=True)

print(f"\033[96m[SISTEMA] Iniciando fabricação de ativo sintético no Drive...\033[0m")

# Comando FFmpeg Complexo para gerar:
# 1. Um gerador de vídeo de teste (paleta de cores aleatória) de 15 segundos.
# 2. Resolução 1080x1920 (Formato TikTok Vertical).
# 3. Codec H.264 para compatibilidade total.

command = [
    'ffmpeg', '-y',
    '-f', 'lavfi', '-i', 'testsrc=size=1080x1920:rate=30', # Gerador de teste vertical
    '-t', '15', # Duração de 15 segundos
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p', # Profile de compatibilidade padrão
    output_bg
]

try:
    # Executa o comando. O log é ocultado para manter o terminal limpo.
    subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print(f"\033[92m[SUCESSO] Arquivo de teste 'sample_bg.mp4' gerado no Drive.\033[0m")
    print(f"Caminho verificado: {output_bg}")
except subprocess.CalledProcessError as e:
    print(f"\033[91m[FALHA CRÍTICA] Não foi possível gerar o ativo sintético: {e}\033[0m")
    print("Verifique se o Google Drive está realmente montado corretamente na Célula 1.")
