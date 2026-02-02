"use client";

import { memo, useState, useCallback, useEffect } from "react";
import { Settings, Loader2 } from "lucide-react";
import { NODE_EDIT_TEXT } from "./constants";
import { UI_HELP_TEXT, PHASE_CONFIG_TEXT } from "@third-eye/constants";
import type { PipelineNode, EyeNodeData } from "@/types/pipeline";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { useEyeCapability } from "@/hooks/useEyeCapabilities";

/**
 * Node Edit Modal Props
 * Per R07: Strict typing
 */
interface NodeEditModalProps {
  node: PipelineNode | null;
  onClose: () => void;
  onSave: (nodeId: string, updates: Partial<EyeNodeData>) => void;
  onDelete: (nodeId: string) => void;
  onConfigurePersona: (eyeId: string, eyeName: string) => void;
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
  onConfigurePersona,
}: NodeEditModalProps) {
  const [formData, setFormData] = useState<Partial<EyeNodeData>>({});
  const [jsonError, setJsonError] = useState<string>("");
  const [newCapability, setNewCapability] = useState<string>("");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [nodeName, setNodeName] = useState<string>("");
  const [nodeDescription, setNodeDescription] = useState<string>("");
  const [nodeEnabled, setNodeEnabled] = useState<boolean>(true);
  // Phase 18: Two-phase operation toggles
  const [enableGuidance, setEnableGuidance] = useState<boolean>(true);
  const [enableValidation, setEnableValidation] = useState<boolean>(true);

  // Fetch eye details to get capabilities and other metadata
  const { eye: fetchedEye, loading: eyeLoading } = useEyeCapability(
    node?.data.eyeId ?? null,
  );

  // Initialize form when node changes or eye data is fetched
  useEffect(() => {
    if (node) {
      const config = node.data.customConfig || {};
      const phases = (config as Record<string, unknown>).phases as
        | Record<string, boolean>
        | undefined;

      // Use fetched eye data for capabilities if node doesn't have them
      const capabilities = node.data.capabilities?.length
        ? node.data.capabilities
        : fetchedEye?.capabilityTags || [];

      setFormData({
        eyeId: node.data.eyeId,
        displayName: fetchedEye?.name || node.data.displayName,
        capabilities: [...capabilities],
        customConfig: config,
        iconSvg: fetchedEye?.iconSvg || node.data.iconSvg,
      });
      // Initialize form fields from customConfig
      setNodeName(((config as Record<string, unknown>).name as string) || "");
      setNodeDescription(
        ((config as Record<string, unknown>).description as string) || "",
      );
      setNodeEnabled((config as Record<string, unknown>).enabled !== false);
      // Phase 18: Initialize phase toggles (default: both enabled)
      setEnableGuidance(phases?.enableGuidance !== false);
      setEnableValidation(phases?.enableValidation !== false);
      setJsonError("");
      setNewCapability("");
      setShowAdvanced(false);
    }
  }, [node, fetchedEye]);

  // Handle JSON config changes
  const handleConfigChange = useCallback((value: string) => {
    try {
      const parsed = value.trim() ? JSON.parse(value) : {};
      setFormData((prev) => ({ ...prev, customConfig: parsed }));
      setJsonError("");
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
    setNewCapability("");
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

    // Phase 18: At least one phase must be enabled
    if (!enableGuidance && !enableValidation) {
      alert(PHASE_CONFIG_TEXT.BOTH_DISABLED_WARNING);
      return;
    }

    // Merge form fields into customConfig
    const updatedConfig = {
      ...(formData.customConfig || {}),
      name: nodeName || undefined,
      description: nodeDescription || undefined,
      enabled: nodeEnabled,
      // Phase 18: Save phase configuration
      phases: {
        enableGuidance,
        enableValidation,
      },
    };

    onSave(node.id, {
      ...formData,
      customConfig: updatedConfig,
    });
    onClose();
  }, [
    node,
    formData,
    jsonError,
    nodeName,
    nodeDescription,
    nodeEnabled,
    enableGuidance,
    enableValidation,
    onSave,
    onClose,
  ]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!node) return;
    if (confirm(`Delete this ${formData.displayName || "Eye"} node?`)) {
      onDelete(node.id);
      onClose();
    }
  }, [node, formData.displayName, onDelete, onClose]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        handleSave();
      }
    },
    [onClose, handleSave],
  );

  if (!node) return null;

  const configJson = formData.customConfig
    ? JSON.stringify(formData.customConfig, null, 2)
    : "";

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
          <h2 className="text-xl font-semibold text-brand-foreground">
            {NODE_EDIT_TEXT.TITLE}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-brand-outline/20 rounded-md transition-colors"
          >
            <svg
              className="w-5 h-5 text-brand-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Eye Info (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {NODE_EDIT_TEXT.EYE_LABEL}
            </label>
            <div className="px-3 py-2 bg-brand-paperElev border border-brand-outline rounded-md text-semantic-muted text-sm">
              {formData.displayName || formData.eyeId}
            </div>

            {/* Phase 16: Configure Persona button */}
            <button
              onClick={() => {
                onConfigurePersona(
                  formData.eyeId || "",
                  formData.displayName || formData.eyeId || "",
                );
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-accent/10 px-4 py-2 text-sm font-medium text-brand-accent transition-all hover:bg-brand-accent/20 hover:scale-[1.02] active:scale-95"
            >
              <Settings className="h-4 w-4" />
              {UI_HELP_TEXT.PIPELINE_BUTTON_CONFIGURE_PERSONA}
            </button>
            <div className="mt-1 text-xs text-semantic-muted text-center">
              {UI_HELP_TEXT.PIPELINE_PERSONA_CONFIG_HINT}
            </div>
          </div>

          {/* Capabilities */}
          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {NODE_EDIT_TEXT.CAPABILITIES_LABEL}
            </label>
            <div className="space-y-2">
              {/* List of capabilities */}
              {eyeLoading ? (
                <div className="flex items-center gap-2 text-sm text-semantic-muted">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Loading eye capabilities...</span>
                </div>
              ) : formData.capabilities && formData.capabilities.length > 0 ? (
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
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-semantic-muted italic">
                  No capabilities defined
                </div>
              )}

              {/* Add capability input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCapability}
                  onChange={(e) => setNewCapability(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCapability();
                    }
                  }}
                  placeholder="Enter capability name"
                  className="flex-1 px-3 py-2 bg-brand-paperElev border border-brand-outline rounded-md text-brand-foreground placeholder-brand-ink/50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
                />
                <button
                  onClick={handleAddCapability}
                  disabled={!newCapability.trim()}
                  className="px-4 py-2 bg-brand-primary text-brand-foreground rounded-md font-medium text-sm hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {NODE_EDIT_TEXT.ADD_CAPABILITY}
                </button>
              </div>
            </div>
          </div>

          {/* Basic Configuration Forms */}
          <div className="space-y-4 p-4 bg-brand-paperElev rounded-lg border border-brand-outline">
            <h3 className="text-sm font-semibold text-brand-foreground uppercase tracking-wider">
              Configuration
            </h3>

            {/* Node Name */}
            <div>
              <label className="block text-sm font-medium text-brand-foreground mb-2">
                Node Name
              </label>
              <input
                type="text"
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="Optional display name for this node"
                className="w-full px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground placeholder-brand-ink/50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
              />
              <div className="mt-1 text-xs text-semantic-muted">
                Custom name to identify this node in the pipeline
              </div>
            </div>

            {/* Node Description */}
            <div>
              <label className="block text-sm font-medium text-brand-foreground mb-2">
                Description
              </label>
              <textarea
                value={nodeDescription}
                onChange={(e) => setNodeDescription(e.target.value)}
                placeholder="Optional description of this node's purpose"
                rows={3}
                className="w-full px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground placeholder-brand-ink/50 focus:outline-none focus:ring-2 focus:ring-brand-primary text-sm"
              />
            </div>

            {/* Enabled Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-brand-foreground">
                Enabled
              </label>
              <button
                onClick={() => setNodeEnabled(!nodeEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  nodeEnabled ? "bg-brand-primary" : "bg-brand-outline/40"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    nodeEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Phase 18: Phase Configuration */}
          <div className="space-y-4 p-4 bg-brand-paperElev rounded-lg border border-brand-outline">
            <div>
              <h3 className="text-sm font-semibold text-brand-foreground uppercase tracking-wider">
                {PHASE_CONFIG_TEXT.SECTION_TITLE}
              </h3>
              <p className="text-xs text-semantic-muted mt-1">
                {PHASE_CONFIG_TEXT.SECTION_DESCRIPTION}
              </p>
            </div>

            {/* Enable Guidance Phase */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-brand-foreground">
                  {PHASE_CONFIG_TEXT.ENABLE_GUIDANCE_LABEL}
                </label>
                <p className="text-xs text-semantic-muted mt-0.5">
                  {PHASE_CONFIG_TEXT.ENABLE_GUIDANCE_HELP}
                </p>
              </div>
              <button
                onClick={() => setEnableGuidance(!enableGuidance)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enableGuidance
                    ? STATUS_BG_COLORS_SUBTLE.info
                    : "bg-brand-outline/40"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enableGuidance ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Enable Validation Phase */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-brand-foreground">
                  {PHASE_CONFIG_TEXT.ENABLE_VALIDATION_LABEL}
                </label>
                <p className="text-xs text-semantic-muted mt-0.5">
                  {PHASE_CONFIG_TEXT.ENABLE_VALIDATION_HELP}
                </p>
              </div>
              <button
                onClick={() => setEnableValidation(!enableValidation)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enableValidation
                    ? STATUS_BG_COLORS_SUBTLE.success
                    : "bg-brand-outline/40"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enableValidation ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Warning if both disabled */}
            {!enableGuidance && !enableValidation && (
              <div className="flex items-center gap-2 p-3 rounded-lg ${STATUS_BG_COLORS_SUBTLE.error} border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_TEXT_COLORS.error} text-sm">
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span>{PHASE_CONFIG_TEXT.BOTH_DISABLED_WARNING}</span>
              </div>
            )}
          </div>

          {/* Advanced Configuration (Collapsible) */}
          <div className="border border-brand-outline rounded-lg overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-4 py-3 bg-brand-paperElev hover:bg-brand-outline/10 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg
                  className={`w-4 h-4 text-brand-foreground transition-transform ${
                    showAdvanced ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                <span className="text-sm font-semibold text-brand-foreground uppercase tracking-wider">
                  Advanced Configuration
                </span>
              </div>
              <span className="text-xs text-semantic-muted">
                JSON Editor (Power Users)
              </span>
            </button>

            {showAdvanced && (
              <div className="px-4 py-3 bg-brand-paper border-t border-brand-outline">
                <label className="block text-sm font-medium text-brand-foreground mb-2">
                  {NODE_EDIT_TEXT.CONFIG_LABEL}
                </label>
                <textarea
                  value={configJson}
                  onChange={(e) => handleConfigChange(e.target.value)}
                  placeholder={NODE_EDIT_TEXT.CONFIG_JSON_HINT}
                  rows={8}
                  className={`w-full px-3 py-2 bg-brand-paperElev border rounded-md text-brand-foreground placeholder-brand-ink/50 focus:outline-none focus:ring-2 font-mono text-sm ${
                    jsonError
                      ? "border-semantic-error focus:ring-semantic-error"
                      : "border-brand-outline focus:ring-brand-primary"
                  }`}
                />
                {jsonError && (
                  <div className="mt-1 text-sm ${STATUS_TEXT_COLORS.error}">
                    {jsonError}
                  </div>
                )}
                <div className="mt-2 text-xs text-semantic-muted">
                  Direct JSON editing. Changes here will override form values
                  above.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-brand-outline">
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-semantic-error text-brand-foreground rounded-md font-medium text-sm hover:bg-semantic-error transition-colors"
          >
            {NODE_EDIT_TEXT.DELETE}
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-brand-outline/20 text-brand-foreground rounded-md font-medium text-sm hover:bg-brand-outline/30 transition-colors"
            >
              {NODE_EDIT_TEXT.CANCEL}
            </button>
            <button
              onClick={handleSave}
              disabled={!!jsonError}
              className="px-4 py-2 bg-brand-primary text-brand-foreground rounded-md font-medium text-sm hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {NODE_EDIT_TEXT.SAVE}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
