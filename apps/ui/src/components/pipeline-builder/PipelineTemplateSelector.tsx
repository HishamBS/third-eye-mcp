'use client';

import { useCallback } from 'react';
import { X } from 'lucide-react';
import { TEMPLATE_TEXT, PIPELINE_TEMPLATES } from './constants';
import type { PipelineNode, PipelineEdge } from '@/types/pipeline';

/**
 * PipelineTemplateSelector Component - Phase 19.4
 *
 * Modal for selecting and loading pre-built pipeline templates
 * Per R04: Memoized callbacks
 * Per R07: Strict typing
 * Per R13: All text from SSOT
 */

interface PipelineTemplateData {
  readonly nodes: readonly PipelineNode[];
  readonly edges: readonly PipelineEdge[];
}

interface PipelineTemplateSelectorProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSelect: (template: PipelineTemplateData) => void;
}

export function PipelineTemplateSelector({
  isOpen,
  onClose,
  onSelect,
}: PipelineTemplateSelectorProps) {
  const handleSelect = useCallback(
    (template: typeof PIPELINE_TEMPLATES[number]) => {
      onSelect({
        nodes: [...template.nodes] as PipelineNode[],
        edges: [...template.edges] as PipelineEdge[],
      });
      onClose();
    },
    [onSelect, onClose]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-3xl max-h-[80vh] overflow-y-auto rounded-2xl border border-brand-outline bg-brand-paper p-8 shadow-2xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">{TEMPLATE_TEXT.SELECTOR_TITLE}</h2>
            <p className="mt-1 text-sm text-slate-400">{TEMPLATE_TEXT.SELECTOR_SUBTITLE}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-brand-outline/20 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="space-y-4">
          {PIPELINE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template)}
              className="w-full rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5 text-left transition-all hover:border-brand-accent hover:bg-brand-paperElev hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{template.description}</p>
                  <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                    <span>{template.nodes.length} Eyes</span>
                    <span>{template.edges.length} Connections</span>
                  </div>
                </div>
                <div className="ml-4 rounded-lg bg-brand-accent/10 px-3 py-1 text-xs font-medium text-brand-accent">
                  {TEMPLATE_TEXT.LOAD_BUTTON}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-brand-outline px-5 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-brand-outline/20"
          >
            {TEMPLATE_TEXT.CANCEL_BUTTON}
          </button>
        </div>
      </div>
    </div>
  );
}
