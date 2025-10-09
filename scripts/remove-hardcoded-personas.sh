#!/bin/bash
# Remove hardcoded personas, descriptions, and versions from all Eye classes
# Database is now the ONLY source of truth

set -e

echo "🗑️  Removing hardcoded data from Eye classes..."
echo

# Function to update an Eye file
update_eye() {
  local file=$1
  local eye_name=$2

  echo "  Processing $eye_name..."

  # Create minimal Eye class using sed
  # Keep only: name, validate()
  # Remove: description, version, getPersona()

  # This is complex sed, so using awk instead for clarity
  awk '
    /^export class/ { in_class=1; print; next }
    /readonly name =/ { print; next }
    /readonly description =/ { next }
    /readonly version =/ { next }
    /validate\(envelope/ { in_validate=1; print; next }
    /getPersona\(\): string/ { in_persona=1; next }
    in_persona { if (/^  \}$/) { in_persona=0 }; next }
    { if (!in_persona) print }
  ' "$file" > "$file.tmp"

  mv "$file.tmp" "$file"
}

# Update all 8 Eyes
update_eye "packages/eyes/src/eyes/overseer.ts" "Overseer"
update_eye "packages/eyes/src/eyes/sharingan.ts" "Sharingan"
update_eye "packages/eyes/src/eyes/prompt-helper.ts" "Prompt Helper"
update_eye "packages/eyes/src/eyes/jogan.ts" "Jōgan"
update_eye "packages/eyes/src/eyes/rinnegan.ts" "Rinnegan"
update_eye "packages/eyes/src/eyes/mangekyo.ts" "Mangekyō"
update_eye "packages/eyes/src/eyes/tenseigan.ts" "Tenseigan"
update_eye "packages/eyes/src/eyes/byakugan.ts" "Byakugan"

echo
echo "✅ All Eye classes updated to minimal schema-only implementations"
echo "📖 Personas are now ONLY in database (single source of truth)"
