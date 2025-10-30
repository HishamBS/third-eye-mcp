'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { NODE_EDIT_TEXT } from './constants';
import type { PipelineNode, EyeNodeData } from '@/types/pipeline';

/**
 * Node Edit Modal Props
 * Per R07: Strict typing
 */
interface NodeEditModalProps {
  node: PipelineNode | null;
  onClose: () => void;
  onSave: (nodeId: string, updates: Partial<EyeNodeData>) => void;
  onDelete: (nodeId: string) => void;
}

/**
 * Node Edit Modal Component - Phase 10
 *
 * Features:
 * - Edit Eye node properties
 * - Add/remove capabilities
 * - Configure custom JSON config
 * - JSON validation
 *
 * Per R04: Memoized for performance
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT constants
 */
export const NodeEditModal = memo(function NodeEditModal({
  node,
  onClose,
  onSave,
  onDelete,
}: NodeEditModalProps) {
  const [formData, setFormData] = useState<Partial<EyeNodeData>>({});
  const [jsonError, setJsonError] = useState<string>('');
  const [newCapability, setNewCapability] = useState<string>('');

  // Initialize form when node changes
  useEffect(() => {
    if (node) {
      setFormData({
        eyeId: node.data.eyeId,
        displayName: node.data.displayName,
        capabilities: node.data.capabilities || [],
        customConfig: node.data.customConfig || {},
        isCustom: node.data.isCustom,
        iconSvg: node.data.iconSvg,
      });
      setJsonError('');
      setNewCapability('');
    }
  }, [node]);

  // Handle JSON config changes
  const handleConfigChange = useCallback((value: string) => {
    try {
      const parsed = value.trim() ? JSON.parse(value) : {};
      setFormData((prev) => ({ ...prev, customConfig: parsed }));
      setJsonError('');
    } catch (error) {
      setJsonError(NODE_EDIT_TEXT.VALIDATION_INVALID_JSON);
      // Still update raw value for editing
      setFormData((prev) => ({ ...prev, customConfig: { __raw: value } }));
    }
  }, []);

  // Add capability
  const handleAddCapability = useCallback(() => {
    if (!newCapability.trim()) return;

    setFormData((prev) => ({
      ...prev,
      capabilities: [...(prev.capabilities || []), newCapability.trim()],
    }));
    setNewCapability('');
  }, [newCapability]);

  // Remove capability
  const handleRemoveCapability = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      capabilities: (prev.capabilities || []).filter((_, i) => i !== index),
    }));
  }, []);

  // Handle save
  const handleSave = useCallback(() => {
    if (!node) return;
    if (jsonError) return; // Don't save if JSON is invalid

    onSave(node.id, formData);
    onClose();
  }, [node, formData, jsonError, onSave, onClose]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!node) return;
    if (confirm(`Delete this ${formData.displayName || 'Eye'} node?`)) {
      onDelete(node.id);
      onClose();
    }
  }, [node, formData.displayName, onDelete, onClose]);

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

  if (!node) return null;

  const configJson = formData.customConfig
    ? JSON.stringify(formData.customConfig, null, 2)
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="bg-brand-paper border border-brand-outline rounded-lg shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-outline">
          <h2 className="text-xl font-semibold text-brand-ink">{NODE_EDIT_TEXT.TITLE}</h2>
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
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Eye Info (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-brand-ink mb-2">
              {NODE_EDIT_TEXT.EYE_LABEL}
            </label>
            <div className="px-3 py-2 bg-brand-paperElev border border-brand-outline rounded-md text-brand-ink/70 text-sm">
              {formData.displayName || formData.eyeId}
              {formData.isCustom && (
                <span className="ml-2 text-xs bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded-full">
                  Custom
                </span>
              )}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-brand-ink mb-2">
              {NODE_EDIT_TEXT.CAPABILITIES_LABEL}
            </label>
            <div className="space-y-2">
              {/* List of capabilities */}
              {formData.capabilities && formData.capabilities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.capabilities.map((cap, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/20 text-brand-accent rounded-full text-sm"
                    >
                      <span>{cap}</span>
                      <button
                        onClick={() => handleRemoveCapability(index)}
                        className="hover:bg-brand-accent/30 rounded-full p-0.5"
                        title={NODE_EDIT_TEXT.REMOVE_CAPABILITY}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-brand-ink/50 italic">No capabilities defined</div>
              )}

              {/* Add capability input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCapability();
                    }
                  }}
                  placeholder="Enter capability name"
                  className="flex-1 px-3 py-2 bg-brand-paperElev border border-brand-outline rounded-md text-brand-ink placeholder-brand-ink/50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                />
                <button
                  onClick={handleAddCapability}
                  disabled={!newCapability.trim()}
                  className="px-4 py-2 bg-brand-primary text-white rounded-md font-medium text-sm hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {NODE_EDIT_TEXT.ADD_CAPABILITY}
                </button>
              </div>
            </div>
          </div>

          {/* Custom Configuration (JSON) */}
          <div>
            <label className="block text-sm font-medium text-brand-ink mb-2">
              {NODE_EDIT_TEXT.CONFIG_LABEL}
            </label>
            <textarea
              value={configJson}
              onChange={(e) => handleConfigChange(e.target.value)}
              placeholder={NODE_EDIT_TEXT.CONFIG_JSON_HINT}
              rows={8}
              className={`w-full px-3 py-2 bg-brand-paperElev border rounded-md text-brand-ink placeholder-brand-ink/50 focus:outline-none focus:ring-2 font-mono text-sm ${
                jsonError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-brand-outline focus:ring-brand-primary'
              }`}
            />
            {jsonError && (
              <div className="mt-1 text-sm text-red-500">{jsonError}</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-brand-outline">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-md font-medium text-sm hover:bg-red-700 transition-colors"
          >
            {NODE_EDIT_TEXT.DELETE}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-brand-outline/20 text-brand-ink rounded-md font-medium text-sm hover:bg-brand-outline/30 transition-colors"
            >
              {NODE_EDIT_TEXT.CANCEL}
            </button>
            <button
              onClick={handleSave}
              disabled={!!jsonError}
              className="px-4 py-2 bg-brand-primary text-white rounded-md font-medium text-sm hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {NODE_EDIT_TEXT.SAVE}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
