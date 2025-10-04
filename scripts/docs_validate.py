#!/usr/bin/env python3
"""Documentation validation utility.

Checks:
- README contains required dashboard references.
- No docs contain TODO/TBD/lorem placeholders.
- Asset manifest hashes match Naruto eye assets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
README = ROOT / "README.md"
MANIFEST = ROOT / "apps" / "overseer" / "src" / "assets" / "assets.manifest.json"
ASSET_ROOT = ROOT / "apps" / "overseer" / "src" / "assets"
DOCS_DIR = ROOT / "docs"

REQUIRED_SNIPPETS = [
    "apps/overseer",
    "apps/control-plane",
    "assets.manifest.json",
]

FORBIDDEN_TOKENS = ["TODO", "TBD", "lorem"]


def check_readme() -> list[str]:
    if not README.exists():
        return ["README.md not found"]
    text = README.read_text(encoding="utf-8")
    missing = [snippet for snippet in REQUIRED_SNIPPETS if snippet not in text]
    if missing:
        return [f"README missing required snippet: {snippet}" for snippet in missing]
    return []


def check_placeholders() -> list[str]:
    problems: list[str] = []
    for path in DOCS_DIR.rglob("*.md"):
        text = path.read_text(encoding="utf-8", errors="ignore")
        for token in FORBIDDEN_TOKENS:
            if token.lower() in text.lower():
                problems.append(f"Placeholder '{token}' found in {path.relative_to(ROOT)}")
    return problems


def check_manifest() -> list[str]:
    if not MANIFEST.exists():
        return ["assets.manifest.json not found"]
    data = json.loads(MANIFEST.read_text(encoding="utf-8"))
    problems: list[str] = []
    for entry in data:
        rel_path = entry.get("path")
        sha = entry.get("sha256")
        bytes_expected = entry.get("bytes")
        if not isinstance(rel_path, str) or not isinstance(sha, str):
            problems.append(f"Invalid manifest entry: {entry}")
            continue
        asset_path = ASSET_ROOT / rel_path
        if not asset_path.exists():
            problems.append(f"Asset missing: {rel_path}")
            continue
        content = asset_path.read_bytes()
        digest = hashlib.sha256(content).hexdigest()
        if digest != sha:
            problems.append(f"Checksum mismatch for {rel_path}: manifest={sha} computed={digest}")
        if isinstance(bytes_expected, int) and bytes_expected != len(content):
            problems.append(f"Byte length mismatch for {rel_path}: manifest={bytes_expected} computed={len(content)}")
    return problems


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Validate docs and assets")
    _ = parser.parse_args(argv)

    errors: list[str] = []
    errors.extend(check_readme())
    errors.extend(check_placeholders())
    errors.extend(check_manifest())

    if errors:
        for err in errors:
            print(f"[ERROR] {err}", file=sys.stderr)
        return 1
    print("Documentation checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
