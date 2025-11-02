'use client';

import { useCallback } from 'react';
import { SCHEMA_TEMPLATES, BUTTON_LABELS } from './constants';

/**
 * SchemaTemplateSelector Component - Phase 19.3
 *
 * Provides pre-built schema templates for common custom eye patterns
 * Per R04: Memoized callbacks
 * Per R07: Strict typing
 * Per R13: All text from SSOT
 */

interface SchemaTemplateSelectorProps {
  readonly onSelect: (inputSchema: string, outputSchema: string) => void;
}

export function SchemaTemplateSelector({ onSelect }: SchemaTemplateSelectorProps) {
  const handleTemplateSelect = useCallback(
    (templateKey: keyof typeof SCHEMA_TEMPLATES) => {
      const template = SCHEMA_TEMPLATES[templateKey];
      const inputSchemaStr = JSON.stringify(template.input, null, 2);
      const outputSchemaStr = JSON.stringify(template.output, null, 2);
      onSelect(inputSchemaStr, outputSchemaStr);
    },
    [onSelect]
  );

  return (
    <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
      <h3 className="mb-3 text-lg font-semibold text-brand-foreground">Schema Templates</h3>
      <p className="mb-4 text-sm text-semantic-muted">
        Start with a pre-built schema template for common patterns
      </p>
      <div className="grid gap-3 md:grid-cols-3">
        {Object.entries(SCHEMA_TEMPLATES).map(([key, template]) => (
          <button
            key={key}
            onClick={() => handleTemplateSelect(key as keyof typeof SCHEMA_TEMPLATES)}
            className="text-left rounded-lg border border-brand-outline/50 bg-brand-paperElev p-4 transition-all hover:border-brand-accent hover:bg-brand-accent/5"
          >
            <h4 className="font-semibold text-brand-foreground mb-1">{template.name}</h4>
            <p className="text-xs text-semantic-muted">
              {BUTTON_LABELS.USE_TEMPLATE}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
