#!/usr/bin/env bash
# Second Pass: Fix 3-digit color values missed by first script
# Targets: text-slate-100, text-gray-100, bg-gray-900

set -e

echo "=== Theme SSOT Second Pass ==="
echo "Fixing remaining 3-digit color violations"
echo ""

files_modified=0

# Find files with remaining violations (exclude dark: prefixed ones)
for file in $(grep -rl "text-slate-100\|text-gray-100\|bg-gray-900" src --include="*.tsx" --include="*.ts" | grep -v ".test."); do
  # Skip if only has dark: prefixed versions
  if ! grep -q "text-slate-100\|text-gray-100\|bg-gray-900" "$file" | grep -v "dark:"; then
    continue
  fi

  echo "Processing: $file"

  # Replace 3-digit values (only non-dark: prefixed)
  # text-slate-100 → text-brand-foreground (light text)
  sed -i '' 's/\([^-]\)text-slate-100/\1text-brand-foreground/g' "$file"

  # text-gray-100 → text-brand-foreground (light text)
  sed -i '' 's/\([^-]\)text-gray-100/\1text-brand-foreground/g' "$file"

  # bg-gray-900 → bg-brand-ink (dark background for code blocks)
  # Special case: preserve /90 opacity variant
  sed -i '' 's/bg-gray-900\/90/bg-brand-ink\/90/g' "$file"
  sed -i '' 's/\([^/]\)bg-gray-900/\1bg-brand-ink/g' "$file"

  files_modified=$((files_modified + 1))
done

echo ""
echo "=== Second Pass Complete ==="
echo "Files modified: $files_modified"
echo ""
echo "Run: bun run build"
