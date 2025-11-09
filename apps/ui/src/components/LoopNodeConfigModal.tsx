'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { X, RotateCw, Layers } from 'lucide-react';

interface LoopNodeConfig {
  maxIterations?: number;
  batchSize?: number;
}

interface LoopNodeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: LoopNodeConfig;
  onSave: (config: LoopNodeConfig) => void;
  stepId?: string;
}

/**
 * LoopNodeConfigModal Component
 *
 * Simple configuration modal for Loop nodes that allows users to:
 * - Set maximum iterations with validation
 * - Optionally configure batch size
 * - View helpful explanations for each setting
 *
 * Eliminates the need to manually write Loop node JSON configuration.
 */
export function LoopNodeConfigModal({
  isOpen,
  onClose,
  initialConfig,
  onSave,
  stepId,
}: LoopNodeConfigModalProps) {
  const [maxIterations, setMaxIterations] = useState<number>(initialConfig?.maxIterations || 10);
  const [enableBatchSize, setEnableBatchSize] = useState<boolean>(initialConfig?.batchSize !== undefined);
  const [batchSize, setBatchSize] = useState<number>(initialConfig?.batchSize || 5);

  // Reset state when modal opens with new config
  useEffect(() => {
    if (isOpen) {
      setMaxIterations(initialConfig?.maxIterations || 10);
      setEnableBatchSize(initialConfig?.batchSize !== undefined);
      setBatchSize(initialConfig?.batchSize || 5);
    }
  }, [isOpen, initialConfig]);

  const handleSave = useCallback(() => {
    const config: LoopNodeConfig = {
      maxIterations,
      batchSize: enableBatchSize ? batchSize : undefined,
    };
    onSave(config);
    onClose();
  }, [maxIterations, enableBatchSize, batchSize, onSave, onClose]);

  const handleCancel = useCallback(() => {
    onClose();
  }, [onClose]);

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];

    if (maxIterations < 1) {
      errors.push('Max iterations must be at least 1');
    }
    if (maxIterations > 10000) {
      errors.push('Max iterations cannot exceed 10,000');
    }

    if (enableBatchSize) {
      if (batchSize < 1) {
        errors.push('Batch size must be at least 1');
      }
      if (batchSize > maxIterations) {
        errors.push('Batch size cannot exceed max iterations');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, [maxIterations, enableBatchSize, batchSize]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-brand-outline/50 bg-brand-paper shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-brand-outline/50 bg-brand-paperElev/50 px-6 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Configure Loop Node</h2>
            {stepId && <p className="mt-1 text-sm text-slate-400">Step: {stepId}</p>}
          </div>
          <button
            onClick={handleCancel}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-brand-ink/50 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[calc(90vh-140px)] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Description */}
            <div className="rounded-lg border border-blue-500/40 bg-blue-500/10 p-4 text-sm text-blue-300">
              <p>
                Loop nodes allow you to repeat processing steps multiple times. Configure how many times to loop and whether to process items in batches.
              </p>
            </div>

            {/* Max Iterations */}
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
                <RotateCw className="h-4 w-4 text-brand-accent" />
                Maximum Iterations <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                value={maxIterations}
                onChange={(e) => setMaxIterations(Number(e.target.value))}
                min={1}
                max={10000}
                className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-4 py-3 text-slate-200 focus:border-brand-accent focus:outline-none"
              />
              <div className="mt-2 flex items-start gap-2 text-xs text-slate-400">
                <span>ℹ️</span>
                <p>
                  The maximum number of times the loop will execute. Set this to prevent infinite loops.
                  Valid range: 1 to 10,000.
                </p>
              </div>
            </div>

            {/* Batch Size */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="enable-batch-size"
                  checked={enableBatchSize}
                  onChange={(e) => setEnableBatchSize(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-brand-outline/40 bg-brand-ink/40 text-brand-accent focus:ring-2 focus:ring-brand-accent/40"
                />
                <div className="flex-1">
                  <label htmlFor="enable-batch-size" className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-300">
                    <Layers className="h-4 w-4 text-brand-accent" />
                    Enable Batch Processing
                  </label>
                  <p className="mt-1 text-xs text-slate-400">
                    Process multiple items in each iteration rather than one at a time.
                  </p>
                </div>
              </div>

              {enableBatchSize && (
                <div className="ml-7 space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={batchSize}
                    onChange={(e) => setBatchSize(Number(e.target.value))}
                    min={1}
                    max={maxIterations}
                    className="w-full rounded-lg border border-brand-outline/40 bg-brand-ink/40 px-4 py-3 text-slate-200 focus:border-brand-accent focus:outline-none"
                  />
                  <div className="flex items-start gap-2 text-xs text-slate-400">
                    <span>ℹ️</span>
                    <p>
                      Number of items to process in each iteration. Must be less than or equal to max iterations.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Configuration Preview */}
            <div className="rounded-lg border border-brand-outline/40 bg-brand-ink/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Configuration Preview</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Max Iterations:</span>
                  <span className="font-semibold text-white">{maxIterations.toLocaleString()}</span>
                </div>
                {enableBatchSize && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Batch Size:</span>
                      <span className="font-semibold text-white">{batchSize.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-brand-outline/30 pt-2">
                      <span className="text-slate-400">Total Batches:</span>
                      <span className="font-semibold text-brand-accent">
                        {Math.ceil(maxIterations / batchSize).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Validation Errors */}
            {!validation.isValid && (
              <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4">
                <div className="mb-2 text-sm font-semibold text-red-400">⚠ Configuration Errors:</div>
                <ul className="ml-4 list-disc space-y-1 text-sm text-red-300">
                  {validation.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Examples */}
            <details className="rounded-lg border border-brand-outline/40 bg-brand-ink/40 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-300">
                Common Use Cases
              </summary>
              <div className="mt-3 space-y-3">
                <div className="rounded-lg bg-brand-paper/50 p-3">
                  <div className="mb-1 text-sm font-medium text-white">Retry Logic</div>
                  <div className="text-xs text-slate-400">
                    Max Iterations: <span className="text-slate-200">3</span> • Batch Size: <span className="text-slate-200">Disabled</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Try an operation up to 3 times before giving up.
                  </p>
                </div>

                <div className="rounded-lg bg-brand-paper/50 p-3">
                  <div className="mb-1 text-sm font-medium text-white">Process Large Dataset</div>
                  <div className="text-xs text-slate-400">
                    Max Iterations: <span className="text-slate-200">1000</span> • Batch Size: <span className="text-slate-200">50</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Process 1000 items in batches of 50 (20 total batches).
                  </p>
                </div>

                <div className="rounded-lg bg-brand-paper/50 p-3">
                  <div className="mb-1 text-sm font-medium text-white">Incremental Processing</div>
                  <div className="text-xs text-slate-400">
                    Max Iterations: <span className="text-slate-200">100</span> • Batch Size: <span className="text-slate-200">10</span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Process 100 items gradually in 10 iterations of 10 items each.
                  </p>
                </div>
              </div>
            </details>

            {/* Help Text */}
            <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 text-xs text-yellow-300">
              <div className="mb-2 font-semibold">Tips:</div>
              <ul className="ml-4 list-disc space-y-1">
                <li>Start with a small max iterations value and increase as needed</li>
                <li>Use batch processing for large datasets to improve performance</li>
                <li>Consider memory limits when setting high iteration counts</li>
                <li>Loop nodes are useful for retry logic, pagination, and bulk processing</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-brand-outline/50 bg-brand-paperElev/50 px-6 py-4">
          <div className="text-sm text-slate-400">
            {!validation.isValid && <span className="text-red-400">⚠ Please fix configuration errors</span>}
            {validation.isValid && <span className="text-green-400">✓ Configuration is valid</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="rounded-lg border border-brand-outline/40 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-brand-ink/50 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!validation.isValid}
              className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
