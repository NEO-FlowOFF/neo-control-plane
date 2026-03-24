#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_RUNTIME_DIR = ROOT_DIR.parent / "neo-content-engine" / "runtime"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Limpa artefatos de runtime do content-engine."
    )
    parser.add_argument(
        "--runtime-dir",
        default=str(DEFAULT_RUNTIME_DIR),
        help="Diretorio runtime do content-engine",
    )
    parser.add_argument(
        "--keep-example",
        action="store_true",
        help="Preserva TX_TEST_IMG_final_render.mp4 e TX_TEST_IMG_meta.json em outputs",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Nao remove, apenas mostra o que seria removido",
    )
    return parser.parse_args()


def list_files(base: Path) -> list[Path]:
    if not base.exists():
        return []
    return [p for p in base.rglob("*") if p.is_file()]


def should_keep(path: Path, keep_example: bool) -> bool:
    if not keep_example:
        return False
    return path.name in {"TX_TEST_IMG_final_render.mp4", "TX_TEST_IMG_meta.json"}


def main() -> int:
    args = parse_args()
    runtime = Path(args.runtime_dir).resolve()
    if not runtime.exists():
        print(f"runtime ausente: {runtime}")
        print("esperado: repo irmao ../neo-content-engine")
        return 1
    files = list_files(runtime)
    to_delete: list[Path] = []
    for path in files:
        if should_keep(path, args.keep_example):
            continue
        to_delete.append(path)

    if args.dry_run:
        print(f"[dry-run] runtime: {runtime}")
        print(f"[dry-run] arquivos para remover: {len(to_delete)}")
        for path in sorted(to_delete):
            print(path)
        return 0

    for path in to_delete:
        path.unlink(missing_ok=True)

    print(f"runtime: {runtime}")
    print(f"arquivos removidos: {len(to_delete)}")
    if args.keep_example:
        print("modo: keep-example")
    else:
        print("modo: clean-all")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
