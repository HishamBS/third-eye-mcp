#!/usr/bin/env python3
"""Render a human-readable diff between two YAML configuration files."""
from __future__ import annotations

import argparse
import pathlib
from typing import Any

import yaml


def load_yaml(path: pathlib.Path) -> Any:
    with path.open("r", encoding="utf-8") as handle:
        return yaml.safe_load(handle) or {}


def flatten(prefix: str, value: Any, out: dict[str, Any]) -> None:
    if isinstance(value, dict):
        for key, val in value.items():
            next_prefix = f"{prefix}.{key}" if prefix else key
            flatten(next_prefix, val, out)
    else:
        out[prefix] = value


def diff(left: dict[str, Any], right: dict[str, Any]) -> list[str]:
    changes: list[str] = []
    left_flat: dict[str, Any] = {}
    right_flat: dict[str, Any] = {}
    flatten("", left, left_flat)
    flatten("", right, right_flat)

    keys = sorted(set(left_flat) | set(right_flat))
    for key in keys:
        l_val = left_flat.get(key)
        r_val = right_flat.get(key)
        if l_val != r_val:
            changes.append(f"{key or '<root>'}: {l_val!r} -> {r_val!r}")
    return changes


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("left", type=pathlib.Path, help="Base YAML file")
    parser.add_argument("right", type=pathlib.Path, help="Target YAML file")
    args = parser.parse_args()

    left_cfg = load_yaml(args.left)
    right_cfg = load_yaml(args.right)
    changes = diff(left_cfg, right_cfg)

    if not changes:
        print("No differences found.")
        return

    print("Differences:")
    for change in changes:
        print(f"  - {change}")


if __name__ == "__main__":
    main()
