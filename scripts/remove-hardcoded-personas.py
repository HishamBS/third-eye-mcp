#!/usr/bin/env python3
"""
Remove hardcoded personas, descriptions, and versions from all Eye classes.
Database is now the ONLY source of truth.
"""

import re
from pathlib import Path

EYES_DIR = Path("packages/eyes/src/eyes")

EYE_FILES = [
    "overseer.ts",
    "sharingan.ts",
    "prompt-helper.ts",
    "jogan.ts",
    "rinnegan.ts",
    "mangekyo.ts",
    "tenseigan.ts",
    "byakugan.ts",
]

def process_eye_file(filepath: Path):
    """Remove getPersona(), description, version from Eye class"""
    print(f"  Processing {filepath.name}...")

    with open(filepath, 'r') as f:
        content = f.read()

    # Extract class name
    class_match = re.search(r'export class (\w+) implements BaseEye', content)
    if not class_match:
        print(f"    ⚠️  Could not find class declaration")
        return

    class_name = class_match.group(1)

    # Extract Eye name from readonly name = '...'
    name_match = re.search(r"readonly name = '([^']+)'", content)
    if not name_match:
        print(f"    ⚠️  Could not find Eye name")
        return

    eye_name = name_match.group(1)

    # Build new minimal class
    minimal_class = f"""/**
 * {class_name}
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export class {class_name} implements BaseEye {{
  readonly name = '{eye_name}';

  validate(envelope: unknown): envelope is {class_name.replace('Eye', 'Envelope')} {{
    return {class_name.replace('Eye', 'EnvelopeSchema')}.safeParse(envelope).success;
  }}
}}

// Export singleton instance
export const {eye_name.replace('-', '')} = new {class_name}();
"""

    # Replace the class definition (from export class ... to closing brace + export)
    pattern = r'(export class \w+ implements BaseEye \{.*?\n\}\n\n// Export singleton instance\nexport const.*?;)'

    new_content = re.sub(pattern, minimal_class.strip(), content, flags=re.DOTALL)

    # Write back
    with open(filepath, 'w') as f:
        f.write(new_content)

    print(f"    ✅ Updated")

def main():
    print("🗑️  Removing hardcoded data from Eye classes...\n")

    for eye_file in EYE_FILES:
        filepath = EYES_DIR / eye_file
        if not filepath.exists():
            print(f"  ⚠️  File not found: {filepath}")
            continue

        process_eye_file(filepath)

    print("\n✅ All Eye classes updated to minimal schema-only implementations")
    print("📖 Personas are now ONLY in database (single source of truth)")

if __name__ == "__main__":
    main()
