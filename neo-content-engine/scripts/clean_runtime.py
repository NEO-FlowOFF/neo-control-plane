#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Limpa artefatos de runtime do content-engine."
    )
    parser.add_argument(
        "--runtime-dir",
        default="runtime",
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
    return [path for path in base.rglob("*") if path.is_file()]


def should_keep(path: Path, keep_example: bool) -> bool:
    if path.name == ".gitkeep":
        return True
    if not keep_example:
        return False
    return path.name in {"TX_TEST_IMG_final_render.mp4", "TX_TEST_IMG_meta.json"}


def main() -> int:
    args = parse_args()
    runtime = Path(args.runtime_dir).resolve()
    to_delete = [
        path
        for path in list_files(runtime)
        if not should_keep(path, args.keep_example)
    ]

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
    print("modo: keep-example" if args.keep_example else "modo: clean-all")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
