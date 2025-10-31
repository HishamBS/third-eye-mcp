'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import {
  EDGE_TEXT,
  EDGE_CONDITION_TYPES,
  EDGE_CONDITION_LABELS,
  EDGE_CONDITION_DESCRIPTIONS,
  PIPELINE_DEFAULTS,
  type EdgeConditionType,
} from './constants';
import type { PipelineEdge, EdgeConditionData } from '@/types/pipeline';

/**
 * Edge Config Modal Props
 * Per R07: Strict typing
 */
interface EdgeConfigModalProps {
  edge: PipelineEdge | null;
  onClose: () => void;
  onSave: (edgeId: string, updates: EdgeConditionData) => void;
  onDelete: (edgeId: string) => void;
}

/**
 * Edge Config Modal Component - Phase 10
 *
 * Features:
 * - Configure loop conditions
 * - Predefined condition types
 * - Threshold/iteration inputs
 * - Validation
 *
 * Per R04: Memoized for performance
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT constants
 */
export const EdgeConfigModal = memo(function EdgeConfigModal({
  edge,
  onClose,
  onSave,
  onDelete,
}: EdgeConfigModalProps) {
  const [formData, setFormData] = useState<EdgeConditionData>({
    condition: EDGE_CONDITION_TYPES.ALWAYS,
    threshold: PIPELINE_DEFAULTS.DEFAULT_THRESHOLD,
    maxIterations: PIPELINE_DEFAULTS.DEFAULT_MAX_ITERATIONS,
    description: '',
    enabled: true,
  });

  // Initialize form when edge changes
  useEffect(() => {
    if (edge) {
      setFormData({
        condition: edge.data?.condition || EDGE_CONDITION_TYPES.ALWAYS,
        threshold: edge.data?.threshold ?? PIPELINE_DEFAULTS.DEFAULT_THRESHOLD,
        maxIterations: edge.data?.maxIterations ?? PIPELINE_DEFAULTS.DEFAULT_MAX_ITERATIONS,
        description: edge.data?.description || '',
        enabled: edge.data?.enabled ?? true,
      });
    }
  }, [edge]);

  // Handle condition change
  const handleConditionChange = useCallback((condition: EdgeConditionType) => {
    setFormData((prev) => ({ ...prev, condition }));
  }, []);

  // Handle threshold change
  const handleThresholdChange = useCallback((value: number) => {
    const clamped = Math.max(
      PIPELINE_DEFAULTS.MIN_THRESHOLD,
      Math.min(PIPELINE_DEFAULTS.MAX_THRESHOLD, value)
    );
    setFormData((prev) => ({ ...prev, threshold: clamped }));
  }, []);

  // Handle max iterations change
  const handleMaxIterationsChange = useCallback((value: number) => {
    const clamped = Math.max(
      PIPELINE_DEFAULTS.MIN_ITERATIONS,
      Math.min(PIPELINE_DEFAULTS.MAX_ITERATIONS, value)
    );
    setFormData((prev) => ({ ...prev, maxIterations: clamped }));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!edge) return;
    onSave(edge.id, formData);
    onClose();
  }, [edge, formData, onSave, onClose]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!edge) return;
    if (confirm('Delete this connection?')) {
      onDelete(edge.id);
      onClose();
    }
  }, [edge, onDelete, onClose]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        handleSave();
      }
    },
    [onClose, handleSave]
  );

  if (!edge) return null;

  // Show inputs based on condition type
  const showThresholdInput = formData.condition === EDGE_CONDITION_TYPES.SCORE_THRESHOLD;
  const showIterationsInput = formData.condition === EDGE_CONDITION_TYPES.MAX_ITERATIONS;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-brand-paper border border-brand-outline rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-outline">
          <h2 className="text-xl font-semibold text-brand-ink">{EDGE_TEXT.TITLE}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-brand-outline/20 rounded-md transition-colors"
          >
            <svg className="w-5 h-5 text-brand-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-brand-ink">
              {EDGE_TEXT.ENABLED_LABEL}
            </label>
            <button
              onClick={() => setFormData((prev) => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formData.enabled ? 'bg-brand-primary' : 'bg-brand-outline/40'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Condition Type */}
          <div>
            <label className="block text-sm font-medium text-brand-ink mb-2">
              {EDGE_TEXT.CONDITION_LABEL}
            </label>
            <select
              value={formData.condition}
              onChange={(e) => handleConditionChange(e.target.value as EdgeConditionType)}
              className="w-full px-3 py-2 bg-brand-paperElev border border-brand-outline rounded-md text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
            >
              {Object.entries(EDGE_CONDITION_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-brand-ink/60">
              {EDGE_CONDITION_DESCRIPTIONS[formData.condition]}
            </div>
          </div>

          {/* Threshold Input (conditional) */}
          {showThresholdInput && (
            <div>
              <label className="block text-sm font-medium text-brand-ink mb-2">
                {EDGE_TEXT.THRESHOLD_LABEL}
              </label>
              <input
                type="number"
                value={formData.threshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                min={PIPELINE_DEFAULTS.MIN_THRESHOLD}
                max={PIPELINE_DEFAULTS.MAX_THRESHOLD}
                className="w-full px-3 py-2 bg-brand-paperElev border border-brand-outline rounded-md text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <div className="mt-1 text-xs text-brand-ink/60">
                {EDGE_TEXT.THRESHOLD_HINT}
              </div>
            </div>
          )}

          {/* Max Iterations Input (conditional) */}
          {showIterationsInput && (
            <div>
              <label className="block text-sm font-medium text-brand-ink mb-2">
                {EDGE_TEXT.MAX_ITERATIONS_LABEL}
              </label>
              <input
                type="number"
                value={formData.maxIterations}
                onChange={(e) => handleMaxIterationsChange(Number(e.target.value))}
                min={PIPELINE_DEFAULTS.MIN_ITERATIONS}
                max={PIPELINE_DEFAULTS.MAX_ITERATIONS}
                className="w-full px-3 py-2 bg-brand-paperElev border border-brand-outline rounded-md text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-primary"
              />
              <div className="mt-1 text-xs text-brand-ink/60">
                {EDGE_TEXT.MAX_ITERATIONS_HINT}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-brand-ink mb-2">
              {EDGE_TEXT.DESCRIPTION_LABEL}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Optional description for this connection"
              rows={3}
              className="w-full px-3 py-2 bg-brand-paperElev border border-brand-outline rounded-md text-brand-ink placeholder-brand-ink/50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-brand-outline">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-brand-foreground rounded-md font-medium text-sm hover:bg-red-700 transition-colors"
          >
            {EDGE_TEXT.DELETE}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-brand-outline/20 text-brand-ink rounded-md font-medium text-sm hover:bg-brand-outline/30 transition-colors"
            >
              {EDGE_TEXT.CANCEL}
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-brand-primary text-brand-foreground rounded-md font-medium text-sm hover:bg-brand-primary/90 transition-colors"
            >
              {EDGE_TEXT.SAVE}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
