#!/bin/bash

# Script to systematically fix hardcoded Tailwind color violations
# Replaces literal colors with SSOT constants from color-mappings.ts

set -e

echo "Starting systematic color violation fixes..."

# Files to process
FILES=(
  "src/components/pipeline-builder/EdgeConfigModal.tsx"
  "src/components/pipeline-builder/PipelineCanvas.tsx"
  "src/components/pipeline-builder/Toolbar.tsx"
  "src/components/pipeline-builder/NodeEditModal.tsx"
  "src/components/pipeline-builder/EyeNode.tsx"
  "src/components/WhyNotApprovedModal.tsx"
  "src/components/ClarificationsPanel.tsx"
  "src/components/persona-form/steps/MissionStep.tsx"
  "src/components/persona-form/steps/PlaceholderSteps.tsx"
  "src/components/persona-form/steps/MetadataStep.tsx"
  "src/components/persona-form/steps/EnvelopeStep.tsx"
  "src/components/persona-form/PersonaWizardModal.tsx"
  "src/components/ReplayTheater.tsx"
  "src/components/DuelResults.tsx"
  "src/components/SessionHeader.tsx"
  "src/components/KillSwitchBar.tsx"
  "src/components/MetricsOverview.tsx"
  "src/components/StrictnessControls.tsx"
  "src/components/PlanRenderer.tsx"
  "src/components/WelcomeModal.tsx"
  "src/components/SchemaDesigner.tsx"
  "src/components/monitor/PerformanceMetrics.tsx"
  "src/components/monitor/SpeakerBadge.tsx"
  "src/components/monitor/PipelineVisualization.tsx"
  "src/components/monitor/HeroRibbon.tsx"
  "src/components/monitor/EvidenceTrail.tsx"
  "src/components/monitor/RoutingDecisionPanel.tsx"
  "src/components/SecurityBanner.tsx"
  "src/components/ui/StatusBadge.tsx"
  "src/components/EvidenceLens.tsx"
  "src/components/ThemeSwitcher.tsx"
  "src/components/custom-eye-form/steps/ReviewStep.tsx"
  "src/components/custom-eye-form/SchemaBuilder.tsx"
)

# Color replacement mappings
declare -A TEXT_COLORS=(
  ["text-red-300"]="STATUS_TEXT_COLORS.error"
  ["text-red-400"]="STATUS_TEXT_COLORS.error"
  ["text-red-500"]="STATUS_TEXT_COLORS.error"
  ["text-rose-300"]="STATUS_TEXT_COLORS.error"
  ["text-rose-400"]="STATUS_TEXT_COLORS.error"
  ["text-rose-500"]="STATUS_TEXT_COLORS.error"
  ["text-green-300"]="STATUS_TEXT_COLORS.success"
  ["text-green-400"]="STATUS_TEXT_COLORS.success"
  ["text-green-500"]="STATUS_TEXT_COLORS.success"
  ["text-emerald-300"]="STATUS_TEXT_COLORS.success"
  ["text-emerald-400"]="STATUS_TEXT_COLORS.success"
  ["text-emerald-500"]="STATUS_TEXT_COLORS.success"
  ["text-yellow-300"]="STATUS_TEXT_COLORS.warning"
  ["text-yellow-400"]="STATUS_TEXT_COLORS.warning"
  ["text-yellow-500"]="STATUS_TEXT_COLORS.warning"
  ["text-amber-300"]="STATUS_TEXT_COLORS.warning"
  ["text-amber-400"]="STATUS_TEXT_COLORS.warning"
  ["text-amber-500"]="STATUS_TEXT_COLORS.warning"
  ["text-blue-300"]="STATUS_TEXT_COLORS.info"
  ["text-blue-400"]="STATUS_TEXT_COLORS.info"
  ["text-blue-500"]="STATUS_TEXT_COLORS.info"
  ["text-purple-300"]="STATUS_TEXT_COLORS.info"
  ["text-purple-400"]="STATUS_TEXT_COLORS.info"
  ["text-purple-500"]="STATUS_TEXT_COLORS.info"
  ["text-cyan-300"]="STATUS_TEXT_COLORS.info"
  ["text-cyan-400"]="STATUS_TEXT_COLORS.info"
  ["text-cyan-500"]="STATUS_TEXT_COLORS.info"
  ["text-gray-400"]="STATUS_TEXT_COLORS.muted"
  ["text-gray-500"]="STATUS_TEXT_COLORS.muted"
  ["text-slate-400"]="STATUS_TEXT_COLORS.muted"
  ["text-slate-500"]="STATUS_TEXT_COLORS.muted"
)

declare -A BG_COLORS=(
  ["bg-red-500/10"]="STATUS_BG_COLORS_SUBTLE.error"
  ["bg-red-500/20"]="STATUS_BG_COLORS_SUBTLE.error"
  ["bg-green-500/10"]="STATUS_BG_COLORS_SUBTLE.success"
  ["bg-green-500/20"]="STATUS_BG_COLORS_SUBTLE.success"
  ["bg-emerald-500/10"]="STATUS_BG_COLORS_SUBTLE.success"
  ["bg-emerald-500/20"]="STATUS_BG_COLORS_SUBTLE.success"
  ["bg-yellow-500/10"]="STATUS_BG_COLORS_SUBTLE.warning"
  ["bg-yellow-500/20"]="STATUS_BG_COLORS_SUBTLE.warning"
  ["bg-amber-500/10"]="STATUS_BG_COLORS_SUBTLE.warning"
  ["bg-amber-500/20"]="STATUS_BG_COLORS_SUBTLE.warning"
  ["bg-amber-900/20"]="STATUS_BG_COLORS_SUBTLE.warning"
  ["bg-blue-500/10"]="STATUS_BG_COLORS_SUBTLE.info"
  ["bg-blue-500/20"]="STATUS_BG_COLORS_SUBTLE.info"
  ["bg-purple-500/10"]="STATUS_BG_COLORS_SUBTLE.info"
  ["bg-purple-500/20"]="STATUS_BG_COLORS_SUBTLE.info"
  ["bg-cyan-500/10"]="STATUS_BG_COLORS_SUBTLE.info"
  ["bg-cyan-500/20"]="STATUS_BG_COLORS_SUBTLE.info"
  ["bg-slate-500/10"]="STATUS_BG_COLORS_SUBTLE.idle"
  ["bg-slate-500/20"]="STATUS_BG_COLORS_SUBTLE.idle"
  ["bg-gray-500/20"]="STATUS_BG_COLORS_SUBTLE.muted"
)

declare -A BORDER_COLORS=(
  ["border-red-500/30"]="STATUS_BORDER_COLORS_SUBTLE.error"
  ["border-red-500/40"]="STATUS_BORDER_COLORS_SUBTLE.error"
  ["border-red-500/50"]="STATUS_BORDER_COLORS_SUBTLE.error"
  ["border-rose-500/30"]="STATUS_BORDER_COLORS_SUBTLE.error"
  ["border-rose-500/40"]="STATUS_BORDER_COLORS_SUBTLE.error"
  ["border-green-500/30"]="STATUS_BORDER_COLORS_SUBTLE.success"
  ["border-green-500/40"]="STATUS_BORDER_COLORS_SUBTLE.success"
  ["border-green-500/50"]="STATUS_BORDER_COLORS_SUBTLE.success"
  ["border-emerald-500/30"]="STATUS_BORDER_COLORS_SUBTLE.success"
  ["border-emerald-500/40"]="STATUS_BORDER_COLORS_SUBTLE.success"
  ["border-yellow-500/30"]="STATUS_BORDER_COLORS_SUBTLE.warning"
  ["border-yellow-500/40"]="STATUS_BORDER_COLORS_SUBTLE.warning"
  ["border-amber-500/30"]="STATUS_BORDER_COLORS_SUBTLE.warning"
  ["border-amber-500/40"]="STATUS_BORDER_COLORS_SUBTLE.warning"
  ["border-amber-700/30"]="STATUS_BORDER_COLORS_SUBTLE.warning"
  ["border-blue-500/30"]="STATUS_BORDER_COLORS_SUBTLE.info"
  ["border-blue-500/40"]="STATUS_BORDER_COLORS_SUBTLE.info"
  ["border-blue-500/50"]="STATUS_BORDER_COLORS_SUBTLE.info"
  ["border-purple-500/30"]="STATUS_BORDER_COLORS_SUBTLE.info"
  ["border-purple-500/40"]="STATUS_BORDER_COLORS_SUBTLE.info"
  ["border-cyan-500/30"]="STATUS_BORDER_COLORS_SUBTLE.info"
  ["border-cyan-500/40"]="STATUS_BORDER_COLORS_SUBTLE.info"
  ["border-slate-500/30"]="STATUS_BORDER_COLORS_SUBTLE.idle"
  ["border-slate-500/40"]="STATUS_BORDER_COLORS_SUBTLE.idle"
  ["border-gray-500/40"]="STATUS_BORDER_COLORS_SUBTLE.muted"
)

IMPORT_LINE="import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE, STATUS_BORDER_COLORS_SUBTLE } from '@/constants/color-mappings';"

total_files=${#FILES[@]}
current=0

for file in "${FILES[@]}"; do
  current=$((current + 1))
  echo "[$current/$total_files] Processing $file..."

  if [ ! -f "$file" ]; then
    echo "  ⚠️  File not found, skipping..."
    continue
  fi

  # Check if import already exists
  if ! grep -q "from '@/constants/color-mappings'" "$file"; then
    # Find the last import line and add our import after it
    sed -i '' "/^import.*from/a\\
$IMPORT_LINE
" "$file"
    echo "  ✓ Added import"
  else
    echo "  ✓ Import already exists"
  fi

  # Apply text color replacements
  for old_color in "${!TEXT_COLORS[@]}"; do
    new_color="${TEXT_COLORS[$old_color]}"
    if grep -q "$old_color" "$file"; then
      # Use perl for more reliable replacements
      perl -pi -e "s/(\s)$old_color(\s|\")/\1\${$new_color}\2/g" "$file"
    fi
  done

  # Apply background color replacements
  for old_color in "${!BG_COLORS[@]}"; do
    new_color="${BG_COLORS[$old_color]}"
    if grep -q "$old_color" "$file"; then
      perl -pi -e "s/(\s)$old_color(\s|\")/\1\${$new_color}\2/g" "$file"
    fi
  done

  # Apply border color replacements
  for old_color in "${!BORDER_COLORS[@]}"; do
    new_color="${BORDER_COLORS[$old_color]}"
    if grep -q "$old_color" "$file"; then
      perl -pi -e "s/(\s)$old_color(\s|\")/\1\${$new_color}\2/g" "$file"
    fi
  done

  # Replace placeholder colors
  if grep -q "placeholder-slate-" "$file"; then
    sed -i '' 's/placeholder-slate-[0-9]\{3\}/placeholder-brand-outline/g' "$file"
    echo "  ✓ Fixed placeholder colors"
  fi

  echo "  ✓ Completed"
done

echo ""
echo "✅ All files processed successfully!"
echo "Running verification check..."

# Verify no violations remain
VIOLATIONS=$(grep -r -E "(text|bg|border|placeholder)-(red|green|blue|yellow|purple|emerald|amber|rose|slate-[6-9]|gray-[6-9]|cyan)-" src/components --include="*.tsx" | wc -l)

echo ""
echo "Remaining violations: $VIOLATIONS"
if [ "$VIOLATIONS" -eq 0 ]; then
  echo "🎉 SUCCESS: Zero color violations remaining!"
else
  echo "⚠️  WARNING: $VIOLATIONS violations still exist"
  echo "Running detailed grep to identify remaining violations..."
  grep -r -n -E "(text|bg|border|placeholder)-(red|green|blue|yellow|purple|emerald|amber|rose|slate-[6-9]|gray-[6-9]|cyan)-" src/components --include="*.tsx" | head -20
fi
