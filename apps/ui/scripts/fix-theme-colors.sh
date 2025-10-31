#!/usr/bin/env bash
# Automated SSOT Color Fix Script (R13 - No Magic Strings)
# Replaces hardcoded Tailwind colors with semantic brand tokens

set -e

echo "=== Theme SSOT Color Replacement Script ==="
echo "Fixing ~900 hardcoded color violations across 111 TSX files"
echo ""

# Counter for files modified
files_modified=0

# Find all TSX/TS files in src/
find src -type f \( -name "*.tsx" -o -name "*.ts" \) | while read -r file; do
  # Skip if file doesn't contain hardcoded colors
  if ! grep -q 'text-white\|text-slate-[0-9]\|text-gray-[0-9]\|bg-white\|bg-gray-[0-9]' "$file"; then
    continue
  fi

  echo "Processing: $file"

  # Create backup
  cp "$file" "$file.bak"

  # Replace hardcoded text colors with SSOT tokens
  # text-white → text-brand-foreground
  sed -i '' 's/text-white/text-brand-foreground/g' "$file"

  # text-slate shades → semantic tokens
  sed -i '' 's/text-slate-900/text-brand-ink/g' "$file"
  sed -i '' 's/text-slate-800/text-brand-foreground/g' "$file"
  sed -i '' 's/text-slate-700/text-brand-foreground/g' "$file"
  sed -i '' 's/text-slate-600/text-brand-outline/g' "$file"
  sed -i '' 's/text-slate-500/text-brand-outline/g' "$file"
  sed -i '' 's/text-slate-400/text-brand-outline/g' "$file"
  sed -i '' 's/text-slate-300/text-brand-outline/g' "$file"
  sed -i '' 's/text-slate-200/text-brand-outline/g' "$file"

  # text-gray shades → semantic tokens
  sed -i '' 's/text-gray-900/text-brand-ink/g' "$file"
  sed -i '' 's/text-gray-800/text-brand-foreground/g' "$file"
  sed -i '' 's/text-gray-700/text-brand-foreground/g' "$file"
  sed -i '' 's/text-gray-600/text-brand-outline/g' "$file"
  sed -i '' 's/text-gray-500/text-brand-outline/g' "$file"
  sed -i '' 's/text-gray-400/text-brand-outline/g' "$file"
  sed -i '' 's/text-gray-300/text-brand-outline/g' "$file"

  # bg-white/gray → brand tokens (be careful with these)
  sed -i '' 's/\bbg-white\b/bg-brand-paper/g' "$file"
  sed -i '' 's/bg-gray-50/bg-brand-paper/g' "$file"
  sed -i '' 's/bg-gray-100/bg-brand-paperElev/g' "$file"

  # border-gray → brand-outline
  sed -i '' 's/border-gray-200/border-brand-outline\/40/g' "$file"
  sed -i '' 's/border-gray-300/border-brand-outline\/50/g' "$file"
  sed -i '' 's/border-gray-400/border-brand-outline\/60/g' "$file"

  files_modified=$((files_modified + 1))
done

echo ""
echo "=== Summary ==="
echo "Files modified: $files_modified"
echo ""
echo "✅ SSOT enforcement complete!"
echo ""
echo "Next steps:"
echo "  1. Run: bun run build"
echo "  2. Test light mode readability"
echo "  3. Clean up backups: find src -name '*.bak' -delete"
