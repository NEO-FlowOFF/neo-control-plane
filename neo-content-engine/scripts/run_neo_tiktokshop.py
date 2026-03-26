#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import base64
import csv
import json
import mimetypes
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import edge_tts
import pandas as pd
import requests
from dotenv import load_dotenv
from minio import Minio
from openai import OpenAI

SCRIPT_PATH = Path(__file__).resolve()
MODULE_DIR = SCRIPT_PATH.parents[1]
MODULE_ENV_FILE = MODULE_DIR / ".env"
DEFAULT_BRANDING_FILE = MODULE_DIR / "branding.json"
DEFAULT_RUNTIME_DIR = MODULE_DIR / "runtime"
DEFAULT_BRANDING = {
    "voice": "pt-BR-AntonioNeural",
    "video": {
        "background_color": "0x111827",
        "hook_text_color": "0xFF2D9C",
        "hook_border_color": "0x00E6FF",
        "font_size": 72,
    },
}


def resolve_default_env_file() -> Path:
    return MODULE_ENV_FILE


def resolve_default_branding_file() -> Path:
    return DEFAULT_BRANDING_FILE


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Executa pipeline local do neo_tiktokshop com upload em MinIO."
    )
    parser.add_argument("--env-file", default=str(resolve_default_env_file()))
    parser.add_argument("--branding-file", default=str(resolve_default_branding_file()))
    parser.add_argument("--runtime-dir", default=str(DEFAULT_RUNTIME_DIR))
    parser.add_argument(
        "--input-csv",
        default=str(DEFAULT_RUNTIME_DIR / "inputs" / "pending_products.csv"),
    )
    parser.add_argument("--max-products", type=int, default=None)
    parser.add_argument("--sleep-between-products", type=float, default=None)
    parser.add_argument("--voice", default="")
    parser.add_argument("--openai-model", default="")
    parser.add_argument("--strict-openai", action="store_true")
    parser.add_argument("--skip-openai", action="store_true")
    parser.add_argument("--skip-upload", action="store_true")
    parser.add_argument("--product-id", default="")
    parser.add_argument("--product-name", default="Mini seladora portatil")
    parser.add_argument(
        "--problem",
        default="Embalagem aberta estraga alimentos e gera desperdicio",
    )
    parser.add_argument("--offer", default="Comissao alta no TikTok Shop")
    return parser.parse_args()


def require_binary(binary: str) -> None:
    if shutil.which(binary):
        return
    raise RuntimeError(f"Dependencia ausente no sistema: {binary}")


def load_json_config(path: Path, default: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return json.loads(json.dumps(default))
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"Config invalida em {path}: esperado objeto JSON.")
    merged = json.loads(json.dumps(default))
    for key, value in payload.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key].update(value)
        else:
            merged[key] = value
    return merged


def ensure_runtime_dirs(base: Path) -> dict[str, Path]:
    paths = {
        "inputs": base / "inputs",
        "outputs": base / "outputs",
        "assets": base / "assets",
        "archive": base / "inputs" / "archive",
    }
    for path in paths.values():
        path.mkdir(parents=True, exist_ok=True)
    return paths


def ensure_background_video(path: Path, background_color: str) -> None:
    if path.exists():
        return
    cmd = [
        "ffmpeg",
        "-y",
        "-f",
        "lavfi",
        "-i",
        f"color=c={background_color}:size=1080x1920:rate=30",
        "-t",
        "15",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        str(path),
    ]
    subprocess.run(
        cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )


def default_script(product_name: str, problem: str, offer: str) -> dict[str, str]:
    hook = "OFERTA HOJE"
    tts = (
        f"Produto em foco: {product_name}. "
        f"Dor central: {problem}. "
        f"Oferta: {offer}. "
        "Hook forte, dor clara, solucao simples e CTA direto para gerar acao."
    )
    return {"hook_text_screen": hook, "tts_audio_script": tts}


def normalize_cell(value: Any) -> str:
    if value is None or pd.isna(value):
        return ""
    text = str(value).strip()
    return "" if text.lower() == "nan" else text


def escape_drawtext_text(value: str) -> str:
    normalized = re.sub(r"[\n\r]+", " ", value).strip()
    escaped = (
        normalized.replace("\\", r"\\")
        .replace(":", r"\:")
        .replace(",", r"\,")
        .replace("%", r"\%")
        .replace("[", r"\[")
        .replace("]", r"\]")
        .replace("'", "")
    )
    escaped = re.sub(r"\s{2,}", " ", escaped)
    return escaped[:48] or "OFERTA"


def synthesize_narrative(
    product_name: str,
    problem: str,
    offer: str,
    model: str,
    strict_openai: bool,
    skip_openai: bool,
) -> tuple[dict[str, str], str]:
    fallback = default_script(product_name, problem, offer)
    api_key = os.getenv("OPENAI_API_KEY")

    if skip_openai or not api_key:
        return fallback, "fallback_no_openai"

    client = OpenAI(api_key=api_key)
    model_candidates = [candidate for candidate in [model, "gpt-4o"] if candidate]
    tested: list[str] = []
    last_error: Exception | None = None

    for model_name in model_candidates:
        if model_name in tested:
            continue
        tested.append(model_name)
        try:
            response = client.chat.completions.create(
                model=model_name,
                response_format={"type": "json_object"},
                temperature=0.7,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Voce gera 1 script de resposta direta de 15s para TikTok. "
                            "Retorne JSON estrito com chaves hook_text_screen e tts_audio_script. "
                            "hook_text_screen deve ter no maximo 4 palavras."
                        ),
                    },
                    {
                        "role": "user",
                        "content": f"Produto: {product_name} | Problema: {problem} | Oferta: {offer}",
                    },
                ],
            )
            payload = json.loads(response.choices[0].message.content)
            hook_text = str(payload.get("hook_text_screen", "")).strip()
            tts_text = str(payload.get("tts_audio_script", "")).strip()
            if not hook_text or not tts_text:
                raise ValueError("Resposta OpenAI incompleta.")
            return {
                "hook_text_screen": hook_text,
                "tts_audio_script": tts_text,
            }, f"openai_ok:{model_name}"
        except Exception as exc:
            last_error = exc
            continue

    if strict_openai:
        raise RuntimeError(
            f"Falha OpenAI em modo estrito: {last_error}"
        ) from last_error
    return (
        fallback,
        f"fallback_openai_error:{type(last_error).__name__ if last_error else 'UnknownError'}",
    )


async def synthesize_audio(tts_text: str, voice: str, output_path: Path) -> None:
    communicator = edge_tts.Communicate(text=tts_text, voice=voice)
    await communicator.save(str(output_path))


def looks_like_image_url(value: str) -> bool:
    val = value.lower()
    return any(val.endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp"])


def looks_like_video_url(value: str) -> bool:
    val = value.lower()
    return any(val.endswith(ext) for ext in [".mp4", ".mov", ".webm", ".m4v"])


def download_binary(url: str, output_path: Path, media_type: str, timeout: int) -> bool:
    try:
        response = requests.get(url, timeout=timeout)
        if response.status_code != 200:
            return False
        content_type = response.headers.get("content-type", "").lower()
        if media_type not in content_type:
            return False
        output_path.write_bytes(response.content)
        return True
    except Exception:
        return False


def download_image(image_url: str, output_path: Path) -> bool:
    if looks_like_image_url(image_url):
        try:
            response = requests.get(image_url, timeout=20)
            if response.status_code != 200:
                return False
            output_path.write_bytes(response.content)
            return True
        except Exception:
            return False
    return download_binary(image_url, output_path, "image", timeout=20)


def download_video(video_url: str, output_path: Path) -> bool:
    if looks_like_video_url(video_url):
        try:
            response = requests.get(video_url, timeout=30)
            if response.status_code != 200:
                return False
            output_path.write_bytes(response.content)
            return True
        except Exception:
            return False
    return download_binary(video_url, output_path, "video", timeout=30)


def env_flag(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def generate_image_with_openai(
    product: dict[str, Any], output_path: Path
) -> tuple[bool, str]:
    if not env_flag("NEO_GENERATE_IMAGE_IF_MISSING", True):
        return False, "image_gen_disabled"

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return False, "image_gen_no_openai_key"

    model = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1").strip() or "gpt-image-1"
    size = os.getenv("NEO_IMAGE_SIZE", "1024x1536").strip() or "1024x1536"
    quality = os.getenv("NEO_IMAGE_QUALITY", "low").strip() or "low"
    prompt = (
        "Foto publicitaria vertical 9:16 de produto para ecommerce e TikTok Shop. "
        f"Produto: {product.get('name', 'Produto viral')}. "
        f"Dor do cliente: {product.get('problem', 'dor nao informada')}. "
        f"Oferta: {product.get('offer', 'oferta nao informada')}. "
        "Fundo limpo, iluminacao de estudio, foco nitido no produto, sem textos, sem logos, sem marca d'agua."
    )

    try:
        client = OpenAI(api_key=api_key)
        result = client.images.generate(
            model=model,
            prompt=prompt,
            size=size,
            quality=quality,
        )
        data = result.data[0]
        if getattr(data, "b64_json", None):
            output_path.write_bytes(base64.b64decode(data.b64_json))
            return True, f"image_gen_openai_ok:{model}"
        if getattr(data, "url", None):
            if download_image(str(data.url), output_path):
                return True, f"image_gen_openai_ok:{model}"
        return False, "image_gen_openai_empty_response"
    except Exception as exc:
        return False, f"image_gen_openai_error:{type(exc).__name__}"


def resolve_visual_asset(
    product: dict[str, Any], assets_path: Path
) -> tuple[str, Path | None, str]:
    video_path_raw = str(product.get("video_path", "")).strip()
    if video_path_raw:
        local = Path(video_path_raw).expanduser()
        if local.exists():
            return "video", local, "product_video_path"

    video_url = str(product.get("video_url", "")).strip()
    if video_url:
        ext = Path(urlparse(video_url).path).suffix or ".mp4"
        local = assets_path / f"{product['id']}_video{ext}"
        if local.exists() or download_video(video_url, local):
            return "video", local, "product_video_url"

    image_path_raw = str(product.get("image_path", "")).strip()
    if image_path_raw:
        local = Path(image_path_raw).expanduser()
        if local.exists():
            return "image", local, "product_image_path"

    image_url = str(product.get("image_url", "")).strip()
    if image_url:
        ext = Path(urlparse(image_url).path).suffix or ".jpg"
        local = assets_path / f"{product['id']}_image{ext}"
        if local.exists() or download_image(image_url, local):
            return "image", local, "product_image_url"

    generated = assets_path / f"{product['id']}_generated.png"
    if generated.exists():
        return "image", generated, "product_image_generated_cached"
    generated_ok, generated_status = generate_image_with_openai(product, generated)
    if generated_ok:
        return "image", generated, generated_status

    return "background", None, f"fallback_background:{generated_status}"


def get_video_branding(branding: dict[str, Any]) -> dict[str, Any]:
    video = branding.get("video", {})
    return {
        "background_color": str(video.get("background_color", "0x111827")),
        "hook_text_color": str(video.get("hook_text_color", "0xFF2D9C")),
        "hook_border_color": str(video.get("hook_border_color", "0x00E6FF")),
        "font_size": int(video.get("font_size", 72)),
    }


def render_video(
    bg_video_path: Path,
    asset_kind: str,
    visual_path: Path | None,
    audio_path: Path,
    output_path: Path,
    hook_text: str,
    branding: dict[str, Any],
) -> str:
    safe_hook = escape_drawtext_text(hook_text)
    video_branding = get_video_branding(branding)
    text_color = video_branding["hook_text_color"]
    border_color = video_branding["hook_border_color"]
    font_size = video_branding["font_size"]
    if asset_kind == "image" and visual_path is not None:
        filter_with_text = (
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
            f"crop=1080:1920,eq=contrast=1.05:brightness=-0.01,"
            f"drawtext=text='{safe_hook}':fontcolor={text_color}:fontsize={font_size}:"
            f"x=(w-text_w)/2:y=(h-text_h)/2:bordercolor={border_color}:borderw=4:"
            f"enable='between(t,0,1.5)'[v]"
        )
        filter_plain = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,eq=contrast=1.05:brightness=-0.01[v]"
        )
        cmd_with_text = [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(visual_path),
            "-i",
            str(audio_path),
            "-filter_complex",
            filter_with_text,
            "-map",
            "[v]",
            "-map",
            "1:a",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-c:a",
            "aac",
            "-shortest",
            str(output_path),
        ]
        cmd_plain = [
            "ffmpeg",
            "-y",
            "-loop",
            "1",
            "-i",
            str(visual_path),
            "-i",
            str(audio_path),
            "-filter_complex",
            filter_plain,
            "-map",
            "[v]",
            "-map",
            "1:a",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-c:a",
            "aac",
            "-shortest",
            str(output_path),
        ]
    elif asset_kind == "video" and visual_path is not None:
        filter_with_text = (
            f"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
            f"crop=1080:1920,eq=contrast=1.05:brightness=-0.01,"
            f"drawtext=text='{safe_hook}':fontcolor={text_color}:fontsize={font_size}:"
            f"x=(w-text_w)/2:y=(h-text_h)/2:bordercolor={border_color}:borderw=4:"
            f"enable='between(t,0,1.5)'[v]"
        )
        filter_plain = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,eq=contrast=1.05:brightness=-0.01[v]"
        )
        cmd_with_text = [
            "ffmpeg",
            "-y",
            "-stream_loop",
            "-1",
            "-i",
            str(visual_path),
            "-i",
            str(audio_path),
            "-filter_complex",
            filter_with_text,
            "-map",
            "[v]",
            "-map",
            "1:a",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-c:a",
            "aac",
            "-shortest",
            str(output_path),
        ]
        cmd_plain = [
            "ffmpeg",
            "-y",
            "-stream_loop",
            "-1",
            "-i",
            str(visual_path),
            "-i",
            str(audio_path),
            "-filter_complex",
            filter_plain,
            "-map",
            "[v]",
            "-map",
            "1:a",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-c:a",
            "aac",
            "-shortest",
            str(output_path),
        ]
    else:
        filter_with_text = (
            f"[0:v]eq=contrast=1.1:brightness=-0.02,"
            f"drawtext=text='{safe_hook}':fontcolor={text_color}:fontsize={font_size}:"
            f"x=(w-text_w)/2:y=(h-text_h)/2:bordercolor={border_color}:borderw=4:"
            f"enable='between(t,0,1.5)'[v]"
        )
        cmd_with_text = [
            "ffmpeg",
            "-y",
            "-i",
            str(bg_video_path),
            "-i",
            str(audio_path),
            "-filter_complex",
            filter_with_text,
            "-map",
            "[v]",
            "-map",
            "1:a",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-c:a",
            "aac",
            "-shortest",
            str(output_path),
        ]

        cmd_plain = [
            "ffmpeg",
            "-y",
            "-i",
            str(bg_video_path),
            "-i",
            str(audio_path),
            "-map",
            "0:v",
            "-map",
            "1:a",
            "-c:v",
            "libx264",
            "-preset",
            "ultrafast",
            "-c:a",
            "aac",
            "-shortest",
            str(output_path),
        ]

    try:
        subprocess.run(
            cmd_with_text,
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        return "render_with_text"
    except Exception:
        subprocess.run(
            cmd_plain, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
        )
        return "render_without_text"


def get_minio_client() -> tuple[Minio, str, str]:
    endpoint_raw = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
    parsed = urlparse(endpoint_raw)
    endpoint = parsed.netloc or parsed.path
    secure = parsed.scheme == "https"
    access_key = os.getenv("MINIO_ROOT_USER", "minioadmin")
    secret_key = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin123")
    bucket = os.getenv("MINIO_BUCKET", "tiktok-assets")
    client = Minio(
        endpoint=endpoint,
        access_key=access_key,
        secret_key=secret_key,
        secure=secure,
    )
    return client, bucket, endpoint_raw


def ensure_bucket_exists(client: Minio, bucket: str) -> None:
    exists = client.bucket_exists(bucket)
    if not exists:
        client.make_bucket(bucket)


def minio_public_read_enabled() -> bool:
    return env_flag("NEO_MINIO_PUBLIC_READ", False)


def ensure_bucket_public_read(client: Minio, bucket: str) -> None:
    ensure_bucket_exists(client, bucket)

    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"AWS": ["*"]},
                "Action": ["s3:GetObject"],
                "Resource": [f"arn:aws:s3:::{bucket}/*"],
            }
        ],
    }
    client.set_bucket_policy(bucket, json.dumps(policy))


def upload_object(
    client: Minio, bucket: str, object_name: str, file_path: Path
) -> None:
    content_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    client.fput_object(
        bucket_name=bucket,
        object_name=object_name,
        file_path=str(file_path),
        content_type=content_type,
    )


def build_public_url(base_url: str, bucket: str, object_name: str) -> str:
    public_base = os.getenv("MINIO_PUBLIC_BASE_URL", base_url).rstrip("/")
    return f"{public_base}/{bucket}/{object_name}"


def load_product_rows(input_csv: Path) -> tuple[list[str], list[dict[str, str]]]:
    if not input_csv.exists():
        return [], []

    with input_csv.open("r", newline="", encoding="utf-8") as fp:
        reader = csv.DictReader(fp)
        if reader.fieldnames is None:
            return [], []
        fieldnames = list(reader.fieldnames)
        rows = [
            {field: normalize_cell(row.get(field, "")) for field in fieldnames}
            for row in reader
        ]
    return fieldnames, rows


def load_products_from_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    products: list[dict[str, Any]] = []
    batch_id = int(time.time())
    for idx, row_data in enumerate(rows, start=1):
        products.append(
            {
                "id": normalize_cell(row_data.get("id")) or f"TX_{batch_id}_{idx}",
                "name": normalize_cell(row_data.get("name")) or "Produto sem nome",
                "problem": normalize_cell(row_data.get("problem"))
                or "Problema nao definido",
                "offer": normalize_cell(row_data.get("offer"))
                or "Oferta nao definida",
                "image_url": normalize_cell(row_data.get("image_url")),
                "image_path": normalize_cell(row_data.get("image_path")),
                "video_url": normalize_cell(row_data.get("video_url")),
                "video_path": normalize_cell(row_data.get("video_path")),
            }
        )
    return products


def split_queue_rows(
    rows: list[dict[str, str]], max_products: int | None
) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    if max_products is None or max_products <= 0:
        return rows, []
    return rows[:max_products], rows[max_products:]


def write_product_rows(
    output_csv: Path, fieldnames: list[str], rows: list[dict[str, str]]
) -> None:
    if not rows:
        output_csv.unlink(missing_ok=True)
        return

    output_csv.parent.mkdir(parents=True, exist_ok=True)
    with output_csv.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(fp, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: normalize_cell(row.get(field, "")) for field in fieldnames})


def archive_processed_rows(
    rows: list[dict[str, str]], fieldnames: list[str], archive_dir: Path
) -> Path | None:
    if not rows:
        return None

    target = archive_dir / f"processed_{int(time.time())}.csv"
    write_product_rows(target, fieldnames, rows)
    return target


def write_result_metadata(metadata_path: Path, result: dict[str, Any]) -> None:
    metadata_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main() -> int:
    args = parse_args()
    load_dotenv(args.env_file, override=False)
    branding = load_json_config(Path(args.branding_file).resolve(), DEFAULT_BRANDING)
    if args.max_products is None:
        args.max_products = int(os.getenv("NEO_RUN_MAX_PRODUCTS", "2"))
    if args.sleep_between_products is None:
        args.sleep_between_products = max(
            0.0, float(os.getenv("NEO_RUN_SLEEP_BETWEEN_PRODUCTS", "0"))
        )
    if not args.openai_model:
        args.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    if not args.voice:
        args.voice = str(branding.get("voice", DEFAULT_BRANDING["voice"]))

    try:
        require_binary("ffmpeg")
    except RuntimeError as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1

    runtime_dir = Path(args.runtime_dir).resolve()
    paths = ensure_runtime_dirs(runtime_dir)
    input_csv = Path(args.input_csv).resolve()
    base_video = paths["assets"] / "sample_bg.mp4"
    ensure_background_video(
        base_video, get_video_branding(branding)["background_color"]
    )

    queue_fieldnames, queue_rows = load_product_rows(input_csv)
    processed_queue_rows: list[dict[str, str]] = []
    remaining_queue_rows: list[dict[str, str]] = []

    if input_csv.exists() and not queue_rows:
        print(
            json.dumps(
                {
                    "ok": True,
                    "count": 0,
                    "results": [],
                    "queue_processed": 0,
                    "queue_remaining": 0,
                },
                ensure_ascii=False,
            )
        )
        return 0

    products = load_products_from_rows(queue_rows)
    if products:
        processed_queue_rows, remaining_queue_rows = split_queue_rows(
            queue_rows, args.max_products
        )
        products = products[: len(processed_queue_rows)]
    else:
        product_id = args.product_id.strip() or f"TX_{int(time.time())}"
        products = [
            {
                "id": product_id,
                "name": args.product_name,
                "problem": args.problem,
                "offer": args.offer,
                "image_url": "",
                "image_path": "",
                "video_url": "",
                "video_path": "",
            }
        ]

    upload_enabled = not args.skip_upload
    minio_client: Minio | None = None
    bucket = ""
    endpoint_raw = ""
    if upload_enabled:
        try:
            minio_client, bucket, endpoint_raw = get_minio_client()
            ensure_bucket_exists(minio_client, bucket)
            if minio_public_read_enabled():
                ensure_bucket_public_read(minio_client, bucket)
        except Exception as exc:
            print(
                json.dumps(
                    {
                        "ok": False,
                        "error": f"Falha MinIO: {exc}",
                        "hint": "Rode make minio-up e make minio-bucket, ou use --skip-upload.",
                    }
                )
            )
            return 1

    queue_batch_rows = processed_queue_rows[:]
    queued_items = list(zip(products, queue_batch_rows or [None] * len(products), strict=False))
    queue_succeeded_rows: list[dict[str, str]] = []
    queue_failed_rows: list[dict[str, str]] = []
    results: list[dict[str, Any]] = []
    failed_count = 0
    public_read_enabled = minio_public_read_enabled()

    total_items = len(queued_items)
    for idx, (product, queue_row) in enumerate(queued_items, start=1):
        audio_path = paths["assets"] / f"{product['id']}_audio.mp3"
        video_path = paths["outputs"] / f"{product['id']}_final_render.mp4"
        metadata_path = paths["outputs"] / f"{product['id']}_meta.json"
        object_video = f"{product['id']}_final_render.mp4"
        object_meta = f"{product['id']}_meta.json"
        result: dict[str, Any] = {
            "id": product["id"],
            "name": product["name"],
            "status": "running",
            "audio_path": str(audio_path),
            "video_path": str(video_path),
            "meta_path": str(metadata_path),
            "upload_visibility": "public" if public_read_enabled else "private",
            "queue_index": idx,
            "queue_total": total_items,
            "voice": args.voice,
        }

        try:
            script_data, llm_status = synthesize_narrative(
                product_name=product["name"],
                problem=product["problem"],
                offer=product["offer"],
                model=args.openai_model,
                strict_openai=args.strict_openai,
                skip_openai=args.skip_openai,
            )
            result["hook_text_screen"] = script_data["hook_text_screen"]
            result["llm_status"] = llm_status

            asset_kind, visual_path, visual_source = resolve_visual_asset(
                product, paths["assets"]
            )
            result["visual_source"] = visual_source
            result["visual_kind"] = asset_kind

            asyncio.run(
                synthesize_audio(script_data["tts_audio_script"], args.voice, audio_path)
            )
            result["audio_status"] = "ok"

            render_status = render_video(
                bg_video_path=base_video,
                asset_kind=asset_kind,
                visual_path=visual_path,
                audio_path=audio_path,
                output_path=video_path,
                hook_text=script_data["hook_text_screen"],
                branding=branding,
            )
            result["render_status"] = render_status

            if upload_enabled and minio_client is not None:
                upload_object(minio_client, bucket, object_video, video_path)
                if public_read_enabled:
                    result["video_url"] = build_public_url(
                        endpoint_raw, bucket, object_video
                    )
                    result["meta_url"] = build_public_url(
                        endpoint_raw, bucket, object_meta
                    )

            result["status"] = "success"
            write_result_metadata(metadata_path, result)

            if upload_enabled and minio_client is not None:
                upload_object(minio_client, bucket, object_meta, metadata_path)

            if queue_row is not None:
                queue_succeeded_rows.append(queue_row)
        except Exception as exc:
            failed_count += 1
            result["status"] = "failed"
            result["error"] = {
                "type": type(exc).__name__,
                "message": str(exc),
            }
            write_result_metadata(metadata_path, result)
            if queue_row is not None:
                queue_failed_rows.append(queue_row)

        results.append(result)

        if idx < total_items and args.sleep_between_products > 0:
            time.sleep(args.sleep_between_products)

    archive_path: Path | None = None
    if queue_rows:
        next_queue_rows = queue_failed_rows + remaining_queue_rows
        archive_path = archive_processed_rows(
            queue_succeeded_rows, queue_fieldnames, paths["archive"]
        )
        write_product_rows(input_csv, queue_fieldnames, next_queue_rows)

    success_count = len(results) - failed_count
    status = "success"
    if failed_count and success_count:
        status = "partial_failure"
    elif failed_count:
        status = "failed"

    print(
        json.dumps(
            {
                "ok": failed_count == 0,
                "status": status,
                "count": len(results),
                "success_count": success_count,
                "failed_count": failed_count,
                "results": results,
                "queue_processed": len(queue_succeeded_rows),
                "queue_failed": len(queue_failed_rows),
                "queue_remaining": len(queue_failed_rows) + len(remaining_queue_rows),
                "queue_archive_csv": str(archive_path) if archive_path else "",
                "upload_public_read": public_read_enabled,
                "sleep_between_products": args.sleep_between_products,
                "branding_file": str(Path(args.branding_file).resolve()),
            },
            ensure_ascii=False,
        )
    )
    return 1 if failed_count else 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(json.dumps({"ok": False, "error": "Interrompido pelo usuario"}))
        sys.exit(130)
