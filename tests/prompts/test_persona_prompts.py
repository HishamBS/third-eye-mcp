from __future__ import annotations

from pathlib import Path

import pytest

from third_eye.personas import PERSONAS

SNAPSHOT_DIR = Path(__file__).parent / "__snapshots__"


@pytest.mark.parametrize(
    "persona_key",
    [
        "sharingan",
        "prompt_helper",
        "jogan",
        "rinnegan",
        "tenseigan",
        "byakugan",
        "mangekyo",
    ],
)
def test_persona_system_prompt_snapshot(persona_key: str) -> None:
    persona = PERSONAS[persona_key]
    snapshot_path = SNAPSHOT_DIR / f"{persona_key}_system_prompt.txt"
    expected = snapshot_path.read_text(encoding="utf-8").strip()
    assert persona.system_prompt.strip() == expected


@pytest.mark.parametrize(
    "persona_key, attribute",
    [
        ("rinnegan", "plan_prompt"),
        ("rinnegan", "generation_prompt"),
        ("tenseigan", "claims_prompt"),
        ("tenseigan", "format_prompt"),
    ],
)
def test_persona_additional_prompts_snapshots(persona_key: str, attribute: str) -> None:
    persona = PERSONAS[persona_key]
    value = getattr(persona, attribute)
    snapshot_path = SNAPSHOT_DIR / f"{persona_key}_{attribute}.txt"
    expected = snapshot_path.read_text(encoding="utf-8").strip()
    assert value.strip() == expected
