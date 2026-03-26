#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import hmac
import json
import os
import sys
import time
from pathlib import Path
from typing import Any

import requests
from dotenv import load_dotenv

SCRIPT_PATH = Path(__file__).resolve()
MODULE_DIR = SCRIPT_PATH.parents[1]
MODULE_ENV_FILE = MODULE_DIR / ".env"
DEFAULT_TIKTOK_API_BASE_URL = "https://open-api.tiktokglobalshop.com"


def resolve_default_env_file() -> Path:
    return MODULE_ENV_FILE


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Consulta lojas autorizadas na TikTok Shop API e retorna o shop cipher."
    )
    parser.add_argument("--env-file", default=str(resolve_default_env_file()))
    parser.add_argument("--base-url", default="")
    parser.add_argument("--shop-index", type=int, default=0)
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--debug", action="store_true")
    return parser.parse_args()


def first_env(*names: str) -> str:
    for name in names:
        value = os.getenv(name, "").strip()
        if value:
            return value
    return ""


def build_sign(api_path: str, query_params: dict[str, Any], body_text: str, secret: str) -> str:
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


def build_sign_string(api_path: str, query_params: dict[str, Any], body_text: str, secret: str) -> str:
    filtered = {
        key: "" if value is None else str(value)
        for key, value in query_params.items()
        if key not in {"sign", "access_token"}
    }
    ordered = "".join(f"{key}{filtered[key]}" for key in sorted(filtered))
    return f"{secret}{api_path}{ordered}{body_text}{secret}"


def mask_token(value: str) -> str:
    if len(value) <= 12:
        return "*" * len(value)
    return f"{value[:8]}...{value[-4:]}"


def request_authorized_shops(
    base_url: str,
    access_token: str,
    app_key: str,
    app_secret: str,
    *,
    debug: bool = False,
) -> dict[str, Any]:
    api_path = "/authorization/202309/shops"
    body_text = ""
    query_params = {
        "app_key": app_key,
        "timestamp": str(int(time.time())),
    }
    sign_string = build_sign_string(api_path, query_params, body_text, app_secret)
    query_params["sign"] = build_sign(api_path, query_params, body_text, app_secret)
    url = f"{base_url.rstrip('/')}{api_path}"

    if debug:
        print(
            json.dumps(
                {
                    "debug": True,
                    "endpoint": url,
                    "query_params": query_params,
                    "headers": {
                        "x-tts-access-token": mask_token(access_token),
                        "content-type": "application/json",
                    },
                    "sign_string": sign_string,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
    response = requests.get(
        url,
        params=query_params,
        headers={
            "x-tts-access-token": access_token,
            "content-type": "application/json",
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("success") is False:
        raise RuntimeError(str(payload.get("message") or payload))
    code = payload.get("code")
    if code not in (None, 0, "0", "success"):
        raise RuntimeError(str(payload.get("message") or payload))
    return payload


def main() -> int:
    args = parse_args()
    load_dotenv(args.env_file, override=False)

    access_token = first_env("TIKTOK_ACCESS_TOKEN", "TIKTOK_SHOP_ACCESS_TOKEN")
    app_key = first_env("TIKTOK_SHOP_APP_KEY", "TIKTOK_APP_KEY")
    app_secret = first_env("TIKTOK_SHOP_APP_SECRET", "TIKTOK_CLIENT_SECRET")
    base_url = (
        args.base_url.strip()
        or first_env("TIKTOK_SHOP_API_BASE_URL")
        or DEFAULT_TIKTOK_API_BASE_URL
    )

    if not all([access_token, app_key, app_secret]):
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": "Credenciais TikTok incompletas",
                    "required": [
                        "TIKTOK_ACCESS_TOKEN",
                        "TIKTOK_SHOP_APP_KEY",
                        "TIKTOK_SHOP_APP_SECRET",
                    ],
                },
                ensure_ascii=False,
            )
        )
        return 1

    try:
        payload = request_authorized_shops(
            base_url,
            access_token,
            app_key,
            app_secret,
            debug=args.debug,
        )
    except Exception as exc:
        print(
            json.dumps(
                {
                    "ok": False,
                    "error": f"{type(exc).__name__}: {exc}",
                    "endpoint": f"{base_url.rstrip('/')}/authorization/202309/shops",
                },
                ensure_ascii=False,
            )
        )
        return 1

    shops = payload.get("data", {}).get("shops", [])
    if args.json:
        print(json.dumps({"ok": True, "shops": shops}, ensure_ascii=False, indent=2))
        return 0

    if not shops:
        print(json.dumps({"ok": False, "error": "Nenhuma loja autorizada retornada"}, ensure_ascii=False))
        return 1

    shop_index = max(0, min(args.shop_index, len(shops) - 1))
    selected = shops[shop_index]
    cipher = str(selected.get("cipher", "")).strip()
    result = {
        "ok": True,
        "shops_count": len(shops),
        "shop_index": shop_index,
        "shop_name": selected.get("name", ""),
        "shop_region": selected.get("region", ""),
        "shop_cipher": cipher,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if cipher else 1


if __name__ == "__main__":
    raise SystemExit(main())
