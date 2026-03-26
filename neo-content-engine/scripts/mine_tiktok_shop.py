#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import hashlib
import hmac
import json
import math
import os
import re
import time
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from openai import OpenAI
from tavily import TavilyClient

SCRIPT_PATH = Path(__file__).resolve()
MODULE_DIR = SCRIPT_PATH.parents[1]
MODULE_ENV_FILE = MODULE_DIR / ".env"
DEFAULT_CONFIG_FILE = MODULE_DIR / "research_config.json"
DEFAULT_OUTPUT_CSV = MODULE_DIR / "runtime" / "inputs" / "pending_products.csv"
DEFAULT_TIKTOK_API_BASE_URL = "https://open-api.tiktokglobalshop.com"

DEFAULT_QUERIES = [
    "TikTok Shop Brasil produto viral casa e cozinha",
    "TikTok Shop Brasil beleza produto mais vendido",
    "TikTok Shop afiliado alta comissao produto tendencia",
]
DEFAULT_RESEARCH_CONFIG = {
    "queries": DEFAULT_QUERIES,
    "selection": {
        "max_results_per_query": 15,
        "limit_products": 20,
        "source_row_limit_for_llm": 40,
        "min_confidence": 0.0,
        "min_score": 0.45,
        "min_commission_rate": 0.0,
        "min_sales_count": 0,
        "require_image_or_video": False,
        "score": {
            "weights": {
                "commission_rate": 0.24,
                "commission_amount": 0.12,
                "sales_velocity": 0.18,
                "rating": 0.08,
                "reviews": 0.05,
                "media_richness": 0.12,
                "source_confidence": 0.08,
                "source_priority": 0.06,
                "query_match": 0.04,
                "title_clarity": 0.03,
            },
            "normalization": {
                "max_commission_rate": 0.3,
                "max_commission_amount": 25.0,
                "max_sales_count": 5000,
                "max_review_count": 2000,
            },
            "source_priority": {
                "tiktok_api": 1.0,
                "tavily": 0.55,
            },
        },
    },
    "sources": {
        "tavily": True,
        "tiktok_api": {
            "enabled": True,
            "mode": "creator",
            "base_url": DEFAULT_TIKTOK_API_BASE_URL,
            "version": "202405",
            "page_size": 20,
            "query_body_strategy": "title_keywords",
            "body": {},
        },
    },
}

STOPWORDS = {
    "a",
    "alta",
    "ao",
    "as",
    "brasil",
    "com",
    "da",
    "de",
    "do",
    "dos",
    "e",
    "em",
    "mais",
    "na",
    "no",
    "o",
    "oferta",
    "para",
    "por",
    "produto",
    "shop",
    "tendencia",
    "tiktok",
    "viral",
}


def resolve_default_env_file() -> Path:
    return MODULE_ENV_FILE


def resolve_default_config_file() -> Path:
    return DEFAULT_CONFIG_FILE


def deep_merge_dict(base: dict[str, Any], incoming: dict[str, Any]) -> dict[str, Any]:
    for key, value in incoming.items():
        if isinstance(value, dict) and isinstance(base.get(key), dict):
            deep_merge_dict(base[key], value)
        else:
            base[key] = value
    return base


def load_json_config(path: Path, default: dict[str, Any]) -> dict[str, Any]:
    if not path.exists():
        return json.loads(json.dumps(default))
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise RuntimeError(f"Config invalida em {path}: esperado objeto JSON.")
    merged = json.loads(json.dumps(default))
    return deep_merge_dict(merged, payload)


def safe_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return default
    normalized = re.sub(r"[^\d,.\-]", "", text)
    if normalized.count(",") == 1 and normalized.count(".") > 1:
        normalized = normalized.replace(".", "").replace(",", ".")
    elif "," in normalized and "." not in normalized:
        normalized = normalized.replace(",", ".")
    try:
        return float(normalized)
    except ValueError:
        return default


def safe_int(value: Any, default: int = 0) -> int:
    return int(round(safe_float(value, default)))


def clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def first_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def clean_name(title: str) -> str:
    candidate = re.split(r"[\-|:|•|/]", title)[0].strip()
    candidate = re.sub(
        r"\b(tiktok|shop|brasil|oficial|affiliate|afiliado)\b",
        "",
        candidate,
        flags=re.I,
    )
    candidate = re.sub(r"\s{2,}", " ", candidate).strip(" -:|/")
    return candidate[:90] if candidate else "Produto tendencia TikTok Shop"


def tokenize(text: str) -> list[str]:
    return [
        token
        for token in re.findall(r"[a-z0-9à-ÿ]+", text.lower())
        if token not in STOPWORDS and len(token) > 2
    ]


def keyword_match_score(name: str, source_title: str, source_query: str) -> float:
    query_tokens = set(tokenize(source_query))
    if not query_tokens:
        return 0.5
    target_tokens = set(tokenize(f"{name} {source_title}"))
    if not target_tokens:
        return 0.0
    overlap = len(query_tokens & target_tokens)
    return clamp(overlap / max(1, min(len(query_tokens), 6)))


def title_clarity_score(name: str) -> float:
    text = re.sub(r"\s+", " ", name).strip()
    if not text:
        return 0.0
    words = text.split()
    score = 1.0
    if len(words) < 2:
        score -= 0.35
    if len(words) > 16:
        score -= 0.2
    if re.search(r"[!]{2,}|[#]{2,}", text):
        score -= 0.15
    uppercase_ratio = sum(1 for char in text if char.isupper()) / max(1, len(text))
    if uppercase_ratio > 0.45:
        score -= 0.2
    return clamp(score)


def guess_image_url_from_result(url: str) -> str:
    clean = url.strip()
    if re.search(r"\.(png|jpe?g|webp)(\?.*)?$", clean, flags=re.I):
        return clean
    return ""


def fetch_tiktok_oembed_thumbnail(url: str) -> str:
    if "tiktok.com/" not in url:
        return ""
    oembed_url = f"https://www.tiktok.com/oembed?url={quote(url, safe='')}"
    try:
        response = requests.get(
            oembed_url,
            timeout=20,
            headers={"User-Agent": "Mozilla/5.0"},
        )
        if response.status_code != 200:
            return ""
        payload = response.json()
        thumbnail = str(payload.get("thumbnail_url", "")).strip()
        return thumbnail
    except Exception:
        return ""


def resolve_image_url(source_url: str, cache: dict[str, str]) -> str:
    direct = guess_image_url_from_result(source_url)
    if direct:
        return direct
    cached = cache.get(source_url)
    if cached is not None:
        return cached
    thumb = fetch_tiktok_oembed_thumbnail(source_url)
    cache[source_url] = thumb
    return thumb


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Pesquisa oportunidades e gera pending_products.csv para o pipeline neo_tiktokshop."
    )
    parser.add_argument("--env-file", default=str(resolve_default_env_file()))
    parser.add_argument("--config-file", default=str(resolve_default_config_file()))
    parser.add_argument("--output-csv", default=str(DEFAULT_OUTPUT_CSV))
    parser.add_argument("--max-results-per-query", type=int, default=None)
    parser.add_argument("--limit-products", type=int, default=None)
    parser.add_argument("--openai-model", default="")
    parser.add_argument("--skip-openai", action="store_true")
    parser.add_argument("--strict-openai", action="store_true")
    parser.add_argument("--query", action="append", default=[])
    return parser.parse_args()


def run_tavily_search(
    client: TavilyClient, queries: list[str], max_results_per_query: int
) -> list[dict[str, Any]]:
    gathered: list[dict[str, Any]] = []
    seen = set()
    for query in queries:
        response = client.search(
            query=query, search_depth="basic", max_results=max_results_per_query
        )
        for item in response.get("results", []):
            url = str(item.get("url", "")).strip()
            title = str(item.get("title", "")).strip()
            content = str(item.get("content", "")).strip()
            key = url or f"{query}:{title}"
            if not key or key in seen:
                continue
            seen.add(key)
            gathered.append(
                {
                    "source_type": "tavily",
                    "source_id": key,
                    "query": query,
                    "url": url,
                    "title": title,
                    "content": content,
                    "image_url": "",
                    "video_url": "",
                    "commission_rate": 0.0,
                    "commission_amount": 0.0,
                    "price_amount": 0.0,
                    "sales_count": 0,
                    "rating": 0.0,
                    "review_count": 0,
                }
            )
    return gathered


def normalize_tiktok_source_config(value: Any) -> dict[str, Any]:
    if isinstance(value, bool):
        return {
            "enabled": value,
            "mode": "creator",
            "base_url": DEFAULT_TIKTOK_API_BASE_URL,
            "version": "202405",
            "page_size": 20,
            "query_body_strategy": "title_keywords",
            "body": {},
        }
    if isinstance(value, dict):
        config = normalize_tiktok_source_config(True)
        deep_merge_dict(config, value)
        return config
    return normalize_tiktok_source_config(False)


def get_first_http_url(value: Any) -> str:
    if isinstance(value, str):
        return value.strip() if value.strip().startswith("http") else ""
    if isinstance(value, list):
        for item in value:
            found = get_first_http_url(item)
            if found:
                return found
        return ""
    if isinstance(value, dict):
        for key in (
            "url",
            "urls",
            "thumb_urls",
            "play_url",
            "play_urls",
            "download_url",
            "download_urls",
            "src",
        ):
            if key in value:
                found = get_first_http_url(value[key])
                if found:
                    return found
        for nested in value.values():
            found = get_first_http_url(nested)
            if found:
                return found
    return ""


def first_nested(node: dict[str, Any], paths: Iterable[tuple[str, ...]]) -> Any:
    for path in paths:
        current: Any = node
        found = True
        for part in path:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                found = False
                break
        if found and current not in (None, "", []):
            return current
    return None


def looks_like_product_node(node: dict[str, Any]) -> bool:
    indicator_keys = {
        "product_id",
        "id",
        "title",
        "product_name",
        "name",
        "commission_rate",
        "main_images",
        "images",
        "sales_count",
        "sale_price",
        "price",
    }
    matches = sum(1 for key in indicator_keys if key in node)
    has_identity = any(key in node for key in ("product_id", "id", "title", "product_name", "name"))
    return matches >= 2 and has_identity


def iter_product_nodes(payload: Any) -> Iterable[dict[str, Any]]:
    if isinstance(payload, dict):
        if looks_like_product_node(payload):
            yield payload
        for value in payload.values():
            yield from iter_product_nodes(value)
    elif isinstance(payload, list):
        for item in payload:
            yield from iter_product_nodes(item)


def normalize_commission_rate(value: Any) -> float:
    raw = safe_float(value, 0.0)
    if raw <= 0:
        return 0.0
    if raw > 100:
        return raw / 10000.0
    if raw > 1:
        return raw / 100.0
    return raw


def normalize_rating(value: Any) -> float:
    raw = safe_float(value, 0.0)
    if raw <= 0:
        return 0.0
    if raw > 5 and raw <= 100:
        return raw / 20.0
    return raw


def render_tiktok_content_summary(product: dict[str, Any]) -> str:
    parts = [str(product.get("title", "")).strip()]
    commission_rate = float(product.get("commission_rate", 0.0))
    if commission_rate > 0:
        parts.append(f"comissao {commission_rate * 100:.2f}%")
    price_amount = float(product.get("price_amount", 0.0))
    if price_amount > 0:
        parts.append(f"preco {price_amount:.2f}")
    sales_count = int(product.get("sales_count", 0))
    if sales_count > 0:
        parts.append(f"vendas {sales_count}")
    rating = float(product.get("rating", 0.0))
    if rating > 0:
        parts.append(f"rating {rating:.2f}")
    return " | ".join(part for part in parts if part)


def normalize_tiktok_product(item: dict[str, Any], query: str) -> dict[str, Any] | None:
    product_id = str(
        first_nested(item, (("product_id",), ("id",), ("product", "id")))
        or ""
    ).strip()
    title = str(
        first_nested(
            item,
            (
                ("title",),
                ("product_name",),
                ("name",),
                ("product", "title"),
            ),
        )
        or ""
    ).strip()
    if not product_id and not title:
        return None

    image_url = get_first_http_url(
        first_nested(
            item,
            (
                ("main_image",),
                ("main_images",),
                ("images",),
                ("product", "main_image"),
                ("product", "main_images"),
                ("product", "images"),
            ),
        )
    )
    video_url = get_first_http_url(
        first_nested(
            item,
            (
                ("video",),
                ("videos",),
                ("product", "video"),
                ("product", "videos"),
            ),
        )
    )
    source_url = str(
        first_nested(
            item,
            (
                ("product_detail_page_url",),
                ("product_url",),
                ("detail_page_url",),
                ("share_url",),
                ("product", "product_detail_page_url"),
                ("product", "product_url"),
            ),
        )
        or ""
    ).strip()
    commission_rate = normalize_commission_rate(
        first_nested(
            item,
            (
                ("commission_rate",),
                ("commission", "rate"),
                ("commission_info", "commission_rate"),
                ("product", "commission_rate"),
            ),
        )
    )
    commission_amount = safe_float(
        first_nested(
            item,
            (
                ("commission", "amount"),
                ("commission_amount",),
                ("product", "commission_amount"),
            ),
        ),
        0.0,
    )
    price_amount = safe_float(
        first_nested(
            item,
            (
                ("sale_price", "amount"),
                ("sales_price", "amount"),
                ("price", "amount"),
                ("product", "sale_price", "amount"),
                ("product", "price", "amount"),
            ),
        ),
        0.0,
    )
    sales_count = safe_int(
        first_nested(
            item,
            (
                ("sales_count",),
                ("sold_count",),
                ("sales",),
                ("order_count",),
                ("product", "sales_count"),
            ),
        ),
        0,
    )
    rating = normalize_rating(
        first_nested(
            item,
            (
                ("rating",),
                ("average_rating",),
                ("product_rating",),
                ("product", "rating"),
            ),
        )
    )
    review_count = safe_int(
        first_nested(
            item,
            (
                ("review_count",),
                ("reviews_count",),
                ("rating_count",),
                ("product", "review_count"),
            ),
        ),
        0,
    )

    normalized = {
        "source_type": "tiktok_api",
        "source_id": product_id or source_url or title,
        "query": query,
        "url": source_url,
        "title": title or clean_name(product_id),
        "content": "",
        "image_url": image_url,
        "video_url": video_url,
        "commission_rate": commission_rate,
        "commission_amount": commission_amount,
        "price_amount": price_amount,
        "sales_count": sales_count,
        "rating": rating,
        "review_count": review_count,
    }
    normalized["content"] = render_tiktok_content_summary(normalized)
    return normalized


def build_tiktok_sign(
    api_path: str,
    query_params: dict[str, Any],
    body_text: str,
    secret: str,
) -> str:
    filtered = {
        key: "" if value is None else str(value)
        for key, value in query_params.items()
        if key not in {"sign", "access_token"}
    }
    ordered = "".join(f"{key}{filtered[key]}" for key in sorted(filtered))
    sign_string = f"{secret}{api_path}{ordered}{body_text}{secret}"
    return hmac.new(
        secret.encode("utf-8"),
        sign_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def tiktok_api_request(
    api_path: str,
    body: dict[str, Any],
    query_params: dict[str, Any],
    base_url: str,
    access_token: str,
    client_secret: str,
) -> dict[str, Any]:
    body_text = json.dumps(body, ensure_ascii=False, separators=(",", ":"))
    signed_query = dict(query_params)
    signed_query["sign"] = build_tiktok_sign(api_path, signed_query, body_text, client_secret)
    response = requests.post(
        f"{base_url.rstrip('/')}{api_path}",
        params=signed_query,
        headers={
            "content-type": "application/json",
            "x-tts-access-token": access_token,
        },
        data=body_text.encode("utf-8"),
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    code = payload.get("code")
    if payload.get("success") is False:
        raise RuntimeError(str(payload.get("message") or payload))
    if code not in (None, 0, "0", "success"):
        raise RuntimeError(str(payload.get("message") or payload))
    return payload


def build_tiktok_query_body(query: str, source_config: dict[str, Any]) -> dict[str, Any]:
    body = json.loads(json.dumps(source_config.get("body", {})))
    strategy = str(source_config.get("query_body_strategy", "title_keywords")).strip()
    if not query:
        return body
    if strategy == "title_keywords":
        body["title_keywords"] = [query[:80]]
    elif strategy == "keyword_tokens":
        tokens = tokenize(query)
        body["title_keywords"] = tokens[:5] if tokens else [query[:80]]
    elif strategy == "category_hint":
        body.setdefault("title_keywords", [query[:80]])
    return body


def run_tiktok_api_search(
    queries: list[str],
    max_results_per_query: int,
    source_config: dict[str, Any],
) -> tuple[list[dict[str, Any]], str]:
    source = normalize_tiktok_source_config(source_config)
    if not source.get("enabled", False):
        return [], "disabled"

    access_token = first_env("TIKTOK_ACCESS_TOKEN", "TIKTOK_SHOP_ACCESS_TOKEN")
    app_key = first_env("TIKTOK_SHOP_APP_KEY", "TIKTOK_APP_KEY")
    client_secret = first_env("TIKTOK_SHOP_APP_SECRET", "TIKTOK_CLIENT_SECRET")
    if not all([access_token, app_key, client_secret]):
        return [], "missing_credentials"

    mode = str(source.get("mode", "creator")).strip().lower() or "creator"
    version = str(source.get("version", "202405")).strip() or "202405"
    base_url = str(
        source.get("base_url") or os.getenv("TIKTOK_SHOP_API_BASE_URL", DEFAULT_TIKTOK_API_BASE_URL)
    ).strip()
    page_size = max(1, min(int(source.get("page_size", max_results_per_query)), max_results_per_query))

    if mode == "seller":
        shop_cipher = first_env("TIKTOK_SHOP_CIPHER")
        if not shop_cipher:
            return [], "missing_shop_cipher"
        api_path = f"/affiliate_seller/{version}/open_collaborations/products/search"
    else:
        shop_cipher = ""
        api_path = f"/affiliate_creator/{version}/open_collaborations/products/search"

    all_rows: list[dict[str, Any]] = []
    seen = set()
    for query in queries:
        query_params: dict[str, Any] = {
            "app_key": app_key,
            "timestamp": str(int(time.time())),
            "page_size": str(page_size),
        }
        if shop_cipher:
            query_params["shop_cipher"] = shop_cipher
        body = build_tiktok_query_body(query, source)
        try:
            payload = tiktok_api_request(
                api_path=api_path,
                body=body,
                query_params=query_params,
                base_url=base_url,
                access_token=access_token,
                client_secret=client_secret,
            )
        except Exception as exc:
            return all_rows, f"request_error:{exc}"

        for node in iter_product_nodes(payload):
            normalized = normalize_tiktok_product(node, query)
            if normalized is None:
                continue
            dedupe_key = str(normalized.get("source_id") or normalized.get("url") or normalized.get("title"))
            if not dedupe_key or dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            all_rows.append(normalized)
    return all_rows, "ok"


def llm_structured_products(
    rows: list[dict[str, Any]],
    limit_products: int,
    source_row_limit: int,
    model: str,
    skip_openai: bool,
    strict_openai: bool,
) -> tuple[list[dict[str, Any]], str]:
    image_cache: dict[str, str] = {}
    fallback_products = []
    for row in rows[:limit_products]:
        fallback_products.append(
            {
                "name": clean_name(str(row.get("title", ""))),
                "problem": "Demanda alta e decisao de compra impulsiva no feed",
                "offer": (
                    f"Comissao de {float(row.get('commission_rate', 0.0)) * 100:.2f}%"
                    if float(row.get("commission_rate", 0.0)) > 0
                    else "Comissao competitiva para afiliado"
                ),
                "confidence": 0.72 if row.get("source_type") == "tiktok_api" else 0.45,
                "source_url": str(row.get("url", "")).strip(),
                "source_query": str(row.get("query", "")).strip(),
                "source_title": str(row.get("title", "")).strip(),
                "source_id": str(row.get("source_id", "")).strip(),
                "source_type": str(row.get("source_type", "")).strip(),
                "image_url": str(row.get("image_url", "")).strip()
                or resolve_image_url(str(row.get("url", "")).strip(), image_cache),
                "video_url": str(row.get("video_url", "")).strip(),
                "commission_rate": float(row.get("commission_rate", 0.0)),
                "commission_amount": float(row.get("commission_amount", 0.0)),
                "price_amount": float(row.get("price_amount", 0.0)),
                "sales_count": int(row.get("sales_count", 0)),
                "rating": float(row.get("rating", 0.0)),
                "review_count": int(row.get("review_count", 0)),
            }
        )

    if skip_openai or not os.getenv("OPENAI_API_KEY"):
        return fallback_products, "fallback_no_openai"

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    model_candidates = [candidate for candidate in [model, "gpt-4o"] if candidate]
    last_exc: Exception | None = None
    compact_rows = [
        {
            "source_type": r.get("source_type", ""),
            "source_id": r.get("source_id", ""),
            "query": r.get("query", ""),
            "url": r.get("url", ""),
            "title": str(r.get("title", ""))[:180],
            "content": str(r.get("content", ""))[:400],
            "commission_rate": r.get("commission_rate", 0.0),
            "commission_amount": r.get("commission_amount", 0.0),
            "price_amount": r.get("price_amount", 0.0),
            "sales_count": r.get("sales_count", 0),
            "rating": r.get("rating", 0.0),
            "review_count": r.get("review_count", 0),
            "image_url": r.get("image_url", ""),
            "video_url": r.get("video_url", ""),
        }
        for r in rows[:source_row_limit]
    ]

    for model_name in model_candidates:
        try:
            response = client.chat.completions.create(
                model=model_name,
                response_format={"type": "json_object"},
                temperature=0.2,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Voce extrai oportunidades de produto para TikTok Shop a partir de catalogo e snippets. "
                            "Retorne JSON estrito no formato {'products':[...]} com no maximo o limite pedido. "
                            "Campos por item: name, problem, offer, confidence (0 a 1), source_url, source_query, source_title, "
                            "source_id, source_type, image_url, video_url. Quando nao houver image_url confiavel, retorne string vazia."
                        ),
                    },
                    {
                        "role": "user",
                        "content": json.dumps(
                            {
                                "limit_products": limit_products,
                                "rows": compact_rows,
                            },
                            ensure_ascii=False,
                        ),
                    },
                ],
            )
            payload = json.loads(response.choices[0].message.content)
            products = payload.get("products", [])
            normalized: list[dict[str, Any]] = []
            for item in products:
                source_url = str(item.get("source_url", "")).strip()
                normalized.append(
                    {
                        "name": str(item.get("name", "")).strip()[:120]
                        or "Produto tendencia TikTok Shop",
                        "problem": str(item.get("problem", "")).strip()[:220]
                        or "Demanda alta e decisao de compra impulsiva no feed",
                        "offer": str(item.get("offer", "")).strip()[:160]
                        or "Comissao competitiva para afiliado",
                        "confidence": float(item.get("confidence", 0.5)),
                        "source_url": source_url,
                        "source_query": str(item.get("source_query", "")).strip(),
                        "source_title": str(item.get("source_title", "")).strip(),
                        "source_id": str(item.get("source_id", "")).strip(),
                        "source_type": str(item.get("source_type", "")).strip(),
                        "image_url": str(item.get("image_url", "")).strip()
                        or resolve_image_url(source_url, image_cache),
                        "video_url": str(item.get("video_url", "")).strip(),
                    }
                )
            if normalized:
                return normalized[:limit_products], f"openai_ok:{model_name}"
        except Exception as exc:
            last_exc = exc
            continue

    if strict_openai:
        raise RuntimeError(f"Falha OpenAI em modo estrito: {last_exc}") from last_exc
    return fallback_products, "fallback_openai_error"


def build_source_lookup(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    lookup: dict[str, dict[str, Any]] = {}
    for row in rows:
        for key in (
            str(row.get("source_id", "")).strip(),
            str(row.get("url", "")).strip(),
            str(row.get("title", "")).strip(),
        ):
            if key:
                lookup[key] = row
    return lookup


def enrich_products_from_sources(
    products: list[dict[str, Any]], rows: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    lookup = build_source_lookup(rows)
    enriched: list[dict[str, Any]] = []
    for product in products:
        source = (
            lookup.get(str(product.get("source_id", "")).strip())
            or lookup.get(str(product.get("source_url", "")).strip())
            or lookup.get(str(product.get("source_title", "")).strip())
            or {}
        )
        merged = dict(source)
        merged.update(product)
        merged["source_type"] = str(
            product.get("source_type") or source.get("source_type") or "tavily"
        ).strip()
        merged["source_id"] = str(
            product.get("source_id") or source.get("source_id") or ""
        ).strip()
        merged["source_url"] = str(
            product.get("source_url") or source.get("url") or ""
        ).strip()
        merged["source_title"] = str(
            product.get("source_title") or source.get("title") or ""
        ).strip()
        merged["source_query"] = str(
            product.get("source_query") or source.get("query") or ""
        ).strip()
        merged["image_url"] = str(
            product.get("image_url") or source.get("image_url") or ""
        ).strip()
        merged["video_url"] = str(
            product.get("video_url") or source.get("video_url") or ""
        ).strip()
        merged["commission_rate"] = float(source.get("commission_rate", product.get("commission_rate", 0.0)))
        merged["commission_amount"] = float(source.get("commission_amount", product.get("commission_amount", 0.0)))
        merged["price_amount"] = float(source.get("price_amount", product.get("price_amount", 0.0)))
        merged["sales_count"] = int(source.get("sales_count", product.get("sales_count", 0)))
        merged["rating"] = float(source.get("rating", product.get("rating", 0.0)))
        merged["review_count"] = int(source.get("review_count", product.get("review_count", 0)))
        enriched.append(merged)
    return enriched


def score_products(
    products: list[dict[str, Any]], selection: dict[str, Any]
) -> list[dict[str, Any]]:
    score_config = selection.get("score", {})
    weights = score_config.get("weights", {})
    normalization = score_config.get("normalization", {})
    source_priority_map = score_config.get("source_priority", {})
    max_commission_rate = max(0.01, float(normalization.get("max_commission_rate", 0.3)))
    max_commission_amount = max(0.01, float(normalization.get("max_commission_amount", 25.0)))
    max_sales_count = max(1, int(normalization.get("max_sales_count", 5000)))
    max_review_count = max(1, int(normalization.get("max_review_count", 2000)))

    weighted_total = sum(max(0.0, float(value)) for value in weights.values()) or 1.0
    scored: list[dict[str, Any]] = []

    for product in products:
        commission_rate = float(product.get("commission_rate", 0.0))
        commission_amount = float(product.get("commission_amount", 0.0))
        sales_count = int(product.get("sales_count", 0))
        rating = float(product.get("rating", 0.0))
        review_count = int(product.get("review_count", 0))
        confidence = clamp(float(product.get("confidence", 0.0)))
        source_type = str(product.get("source_type", "tavily")).strip() or "tavily"
        name = str(product.get("name", "")).strip()
        source_title = str(product.get("source_title", "")).strip()
        source_query = str(product.get("source_query", "")).strip()

        signals = {
            "commission_rate": clamp(commission_rate / max_commission_rate),
            "commission_amount": clamp(commission_amount / max_commission_amount),
            "sales_velocity": clamp(math.log1p(max(0, sales_count)) / math.log1p(max_sales_count)),
            "rating": clamp(rating / 5.0),
            "reviews": clamp(math.log1p(max(0, review_count)) / math.log1p(max_review_count)),
            "media_richness": 1.0 if product.get("video_url") else 0.68 if product.get("image_url") else 0.0,
            "source_confidence": confidence,
            "source_priority": clamp(float(source_priority_map.get(source_type, 0.5))),
            "query_match": keyword_match_score(name, source_title, source_query),
            "title_clarity": title_clarity_score(name or source_title),
        }

        weighted_score = 0.0
        for signal_name, signal_value in signals.items():
            weighted_score += signal_value * max(0.0, float(weights.get(signal_name, 0.0)))

        enriched = dict(product)
        enriched["score"] = round(weighted_score / weighted_total, 4)
        enriched["score_breakdown"] = {
            signal_name: round(signal_value, 4)
            for signal_name, signal_value in signals.items()
        }
        scored.append(enriched)

    scored.sort(key=lambda item: float(item.get("score", 0.0)), reverse=True)
    return scored


def write_csv(products: list[dict[str, Any]], output_csv: Path) -> None:
    output_csv.parent.mkdir(parents=True, exist_ok=True)
    now = int(time.time())
    with output_csv.open("w", newline="", encoding="utf-8") as fp:
        writer = csv.DictWriter(
            fp,
            fieldnames=[
                "id",
                "name",
                "problem",
                "offer",
                "score",
                "source_type",
                "source_id",
                "source_url",
                "source_query",
                "source_title",
                "image_url",
                "video_url",
                "commission_rate",
                "commission_amount",
                "price_amount",
                "sales_count",
                "rating",
                "review_count",
                "score_breakdown",
            ],
        )
        writer.writeheader()
        for idx, product in enumerate(products, start=1):
            writer.writerow(
                {
                    "id": f"TXM_{now}_{idx}",
                    "name": product["name"],
                    "problem": product["problem"],
                    "offer": product["offer"],
                    "score": round(float(product.get("score", product.get("confidence", 0.5))) * 10, 2),
                    "source_type": product.get("source_type", ""),
                    "source_id": product.get("source_id", ""),
                    "source_url": product.get("source_url", ""),
                    "source_query": product.get("source_query", ""),
                    "source_title": product.get("source_title", ""),
                    "image_url": product.get("image_url", ""),
                    "video_url": product.get("video_url", ""),
                    "commission_rate": round(float(product.get("commission_rate", 0.0)), 4),
                    "commission_amount": round(float(product.get("commission_amount", 0.0)), 2),
                    "price_amount": round(float(product.get("price_amount", 0.0)), 2),
                    "sales_count": int(product.get("sales_count", 0)),
                    "rating": round(float(product.get("rating", 0.0)), 2),
                    "review_count": int(product.get("review_count", 0)),
                    "score_breakdown": json.dumps(
                        product.get("score_breakdown", {}),
                        ensure_ascii=False,
                        sort_keys=True,
                    ),
                }
            )


def filter_products(
    products: list[dict[str, Any]], selection: dict[str, Any]
) -> list[dict[str, Any]]:
    min_confidence = float(selection.get("min_confidence", 0.0))
    min_score = float(selection.get("min_score", 0.0))
    min_commission_rate = float(selection.get("min_commission_rate", 0.0))
    min_sales_count = int(selection.get("min_sales_count", 0))
    require_image_or_video = bool(selection.get("require_image_or_video", False))

    filtered: list[dict[str, Any]] = []
    for product in products:
        confidence = float(product.get("confidence", 0.0))
        score = float(product.get("score", 0.0))
        has_media = bool(product.get("image_url")) or bool(product.get("video_url"))
        if confidence < min_confidence:
            continue
        if score < min_score:
            continue
        if float(product.get("commission_rate", 0.0)) < min_commission_rate:
            continue
        if int(product.get("sales_count", 0)) < min_sales_count:
            continue
        if require_image_or_video and not has_media:
            continue
        filtered.append(product)
    return filtered


def main() -> int:
    args = parse_args()
    load_dotenv(args.env_file, override=False)
    config = load_json_config(Path(args.config_file).resolve(), DEFAULT_RESEARCH_CONFIG)
    selection = config.get("selection", {})
    source_config = config.get("sources", {})
    if args.max_results_per_query is None:
        args.max_results_per_query = int(
            selection.get(
                "max_results_per_query",
                os.getenv("NEO_MINE_MAX_RESULTS_PER_QUERY", "15"),
            )
        )
    if args.limit_products is None:
        args.limit_products = int(
            selection.get("limit_products", os.getenv("NEO_MINE_LIMIT_PRODUCTS", "20"))
        )
    if not args.openai_model:
        args.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    queries = args.query if args.query else list(config.get("queries", DEFAULT_QUERIES))
    rows: list[dict[str, Any]] = []
    tavily_status = "disabled"
    tiktok_status = "disabled"
    tavily_rows: list[dict[str, Any]] = []
    tiktok_rows: list[dict[str, Any]] = []

    tiktok_rows, tiktok_status = run_tiktok_api_search(
        queries=queries,
        max_results_per_query=args.max_results_per_query,
        source_config=source_config.get("tiktok_api", False),
    )
    rows.extend(tiktok_rows)

    tavily_enabled = bool(source_config.get("tavily", True))
    tavily_key = os.getenv("TAVILY_API_KEY")
    if tavily_enabled:
        if tavily_key:
            client = TavilyClient(api_key=tavily_key)
            tavily_rows = run_tavily_search(client, queries, args.max_results_per_query)
            tavily_status = "ok"
            rows.extend(tavily_rows)
        else:
            tavily_status = "missing_credentials"

    if not rows:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "Sem resultados de pesquisa",
                    "tiktok_status": tiktok_status,
                    "tavily_status": tavily_status,
                },
                ensure_ascii=False,
            )
        )
        return 1

    products, llm_status = llm_structured_products(
        rows=rows,
        limit_products=args.limit_products,
        source_row_limit=int(selection.get("source_row_limit_for_llm", 40)),
        model=args.openai_model,
        skip_openai=args.skip_openai,
        strict_openai=args.strict_openai,
    )
    products = enrich_products_from_sources(products, rows)
    products = score_products(products, selection)
    products = filter_products(products, selection)[: args.limit_products]

    if not products:
        print(json.dumps({"ok": False, "error": "Sem produtos estruturados"}, ensure_ascii=False))
        return 1

    output_csv = Path(args.output_csv).resolve()
    write_csv(products, output_csv)
    print(
        json.dumps(
            {
                "ok": True,
                "rows_researched": len(rows),
                "rows_tiktok_api": len(tiktok_rows),
                "rows_tavily": len(tavily_rows),
                "products": len(products),
                "llm_status": llm_status,
                "output_csv": str(output_csv),
                "config_file": str(Path(args.config_file).resolve()),
                "sources": config.get("sources", {}),
                "tiktok_status": tiktok_status,
                "tavily_status": tavily_status,
                "top_scores": [
                    {
                        "name": product.get("name", ""),
                        "score": product.get("score", 0.0),
                        "source_type": product.get("source_type", ""),
                    }
                    for product in products[:5]
                ],
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
