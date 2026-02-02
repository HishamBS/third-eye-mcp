"use client";

import React, { useState, useCallback } from "react";
import type { WizardStepProps, PhaseFormData } from "@/types/persona-form";
import { Construction, Plus, X, Download } from "lucide-react";
import {
  FIELD_LABELS,
  PLACEHOLDERS,
  ARRAY_ACTIONS,
  REMINDER_TEMPLATES,
  HELP_TEXT,
} from "../constants";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

/**
 * PersonaWizard Step Components
 *
 * Functional step components for persona configuration wizard.
 * Future enhancements: drag-reorder, JSON syntax highlighting, collapsible cards.
 */

function PlaceholderStep({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Construction className="w-16 h-16 text-brand-accent/50 mb-4" />
      <h3 className="text-xl font-semibold text-brand-foreground mb-2">
        {title}
      </h3>
      <p className="text-semantic-muted max-w-md">{description}</p>
      <p className="text-sm text-semantic-muted mt-4">
        Advanced features coming in future updates
      </p>
    </div>
  );
}

export function GuidanceStep({ state, dispatch }: WizardStepProps) {
  const [reminderInput, setReminderInput] = useState("");
  const isEnabled = state.guidancePhase !== null;

  const handleToggleEnabled = useCallback(() => {
    if (isEnabled) {
      dispatch({ type: "SET_GUIDANCE_PHASE", guidancePhase: null });
    } else {
      dispatch({
        type: "SET_GUIDANCE_PHASE",
        guidancePhase: {
          mission: "",
          check: "",
          reminders: [],
          example: "{}",
        },
      });
    }
  }, [isEnabled, dispatch]);

  const handleUpdateField = useCallback(
    (field: keyof PhaseFormData, value: string | readonly string[]) => {
      if (!state.guidancePhase) return;
      dispatch({
        type: "SET_GUIDANCE_PHASE",
        guidancePhase: {
          ...state.guidancePhase,
          [field]: value,
        },
      });
    },
    [state.guidancePhase, dispatch],
  );

  const handleAddReminder = useCallback(() => {
    if (!state.guidancePhase) return;
    const trimmed = reminderInput.trim();
    if (!trimmed || state.guidancePhase.reminders.includes(trimmed)) return;

    handleUpdateField("reminders", [...state.guidancePhase.reminders, trimmed]);
    setReminderInput("");
  }, [reminderInput, state.guidancePhase, handleUpdateField]);

  const handleRemoveReminder = useCallback(
    (index: number) => {
      if (!state.guidancePhase) return;
      handleUpdateField(
        "reminders",
        state.guidancePhase.reminders.filter((_, i) => i !== index),
      );
    },
    [state.guidancePhase, handleUpdateField],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
        <div>
          <h4 className="font-semibold text-brand-foreground">
            Enable Guidance Phase
          </h4>
          <p className="text-xs text-semantic-muted mt-1">
            Configure phase-specific mission, checks, and examples
          </p>
        </div>
        <button
          onClick={handleToggleEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? "bg-brand-accent" : "bg-brand-outline/30"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-brand-foreground transition-transform ${
              isEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {isEnabled && state.guidancePhase && (
        <>
          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {FIELD_LABELS.PHASE_MISSION} *
            </label>
            <textarea
              value={state.guidancePhase.mission}
              onChange={(e) => handleUpdateField("mission", e.target.value)}
              placeholder={PLACEHOLDERS.PHASE_MISSION}
              rows={5}
              className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
            />
            <p className="text-xs text-semantic-muted mt-1">
              {HELP_TEXT.PHASE_MISSION}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {FIELD_LABELS.CHECK_LOGIC} *
            </label>
            <textarea
              value={state.guidancePhase.check}
              onChange={(e) => handleUpdateField("check", e.target.value)}
              placeholder={PLACEHOLDERS.CHECK_LOGIC}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
            />
            <p className="text-xs text-semantic-muted mt-1">
              {HELP_TEXT.CHECK_LOGIC}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {FIELD_LABELS.PHASE_REMINDERS}
            </label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={reminderInput}
                onChange={(e) => setReminderInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddReminder()}
                placeholder={PLACEHOLDERS.REMINDER}
                className="flex-1 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
              <button
                onClick={handleAddReminder}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {ARRAY_ACTIONS.ADD}
              </button>
            </div>

            <div className="space-y-2 mb-2">
              {state.guidancePhase.reminders.map((reminder, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-brand-paperElev border border-brand-outline"
                >
                  <span className="text-sm text-brand-foreground">
                    {reminder}
                  </span>
                  <button
                    onClick={() => handleRemoveReminder(index)}
                    className={`text-brand-foreground/40 hover:${STATUS_TEXT_COLORS.error} transition-colors`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {state.guidancePhase.reminders.length === 0 && (
              <p className="text-sm text-semantic-muted italic">
                No phase reminders added yet
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {FIELD_LABELS.EXAMPLE_JSON}
            </label>
            <textarea
              value={state.guidancePhase.example}
              onChange={(e) => handleUpdateField("example", e.target.value)}
              placeholder={PLACEHOLDERS.EXAMPLE_JSON}
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
            />
            <p className="text-xs text-semantic-muted mt-1">
              {HELP_TEXT.EXAMPLE_JSON}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function ValidationStep({ state, dispatch }: WizardStepProps) {
  const [reminderInput, setReminderInput] = useState("");
  const isEnabled = state.validationPhase !== null;

  const handleToggleEnabled = useCallback(() => {
    if (isEnabled) {
      dispatch({ type: "SET_VALIDATION_PHASE", validationPhase: null });
    } else {
      dispatch({
        type: "SET_VALIDATION_PHASE",
        validationPhase: {
          mission: "",
          check: "",
          reminders: [],
          example: "{}",
        },
      });
    }
  }, [isEnabled, dispatch]);

  const handleUpdateField = useCallback(
    (field: keyof PhaseFormData, value: string | readonly string[]) => {
      if (!state.validationPhase) return;
      dispatch({
        type: "SET_VALIDATION_PHASE",
        validationPhase: {
          ...state.validationPhase,
          [field]: value,
        },
      });
    },
    [state.validationPhase, dispatch],
  );

  const handleAddReminder = useCallback(() => {
    if (!state.validationPhase) return;
    const trimmed = reminderInput.trim();
    if (!trimmed || state.validationPhase.reminders.includes(trimmed)) return;

    handleUpdateField("reminders", [
      ...state.validationPhase.reminders,
      trimmed,
    ]);
    setReminderInput("");
  }, [reminderInput, state.validationPhase, handleUpdateField]);

  const handleRemoveReminder = useCallback(
    (index: number) => {
      if (!state.validationPhase) return;
      handleUpdateField(
        "reminders",
        state.validationPhase.reminders.filter((_, i) => i !== index),
      );
    },
    [state.validationPhase, handleUpdateField],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
        <div>
          <h4 className="font-semibold text-brand-foreground">
            Enable Validation Phase
          </h4>
          <p className="text-xs text-semantic-muted mt-1">
            Optional validation phase with mission, checks, and examples
          </p>
        </div>
        <button
          onClick={handleToggleEnabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isEnabled ? "bg-brand-accent" : "bg-brand-outline/30"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-brand-foreground transition-transform ${
              isEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {isEnabled && state.validationPhase && (
        <>
          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {FIELD_LABELS.PHASE_MISSION} *
            </label>
            <textarea
              value={state.validationPhase.mission}
              onChange={(e) => handleUpdateField("mission", e.target.value)}
              placeholder={PLACEHOLDERS.PHASE_MISSION}
              rows={5}
              className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
            />
            <p className="text-xs text-semantic-muted mt-1">
              {HELP_TEXT.PHASE_MISSION}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {FIELD_LABELS.CHECK_LOGIC} *
            </label>
            <textarea
              value={state.validationPhase.check}
              onChange={(e) => handleUpdateField("check", e.target.value)}
              placeholder={PLACEHOLDERS.CHECK_LOGIC}
              rows={4}
              className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
            />
            <p className="text-xs text-semantic-muted mt-1">
              {HELP_TEXT.CHECK_LOGIC}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {FIELD_LABELS.PHASE_REMINDERS}
            </label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={reminderInput}
                onChange={(e) => setReminderInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddReminder()}
                placeholder={PLACEHOLDERS.REMINDER}
                className="flex-1 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent"
              />
              <button
                onClick={handleAddReminder}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {ARRAY_ACTIONS.ADD}
              </button>
            </div>

            <div className="space-y-2 mb-2">
              {state.validationPhase.reminders.map((reminder, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-brand-paperElev border border-brand-outline"
                >
                  <span className="text-sm text-brand-foreground">
                    {reminder}
                  </span>
                  <button
                    onClick={() => handleRemoveReminder(index)}
                    className={`text-brand-foreground/40 hover:${STATUS_TEXT_COLORS.error} transition-colors`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {state.validationPhase.reminders.length === 0 && (
              <p className="text-sm text-semantic-muted italic">
                No phase reminders added yet
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-foreground mb-2">
              {FIELD_LABELS.EXAMPLE_JSON}
            </label>
            <textarea
              value={state.validationPhase.example}
              onChange={(e) => handleUpdateField("example", e.target.value)}
              placeholder={PLACEHOLDERS.EXAMPLE_JSON}
              rows={6}
              className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent resize-none"
            />
            <p className="text-xs text-semantic-muted mt-1">
              {HELP_TEXT.EXAMPLE_JSON}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export function RemindersStep({ state, dispatch }: WizardStepProps) {
  const [reminderInput, setReminderInput] = useState("");

  const handleAddReminder = useCallback(() => {
    const trimmed = reminderInput.trim();
    if (!trimmed || state.reminders.includes(trimmed)) return;

    dispatch({
      type: "SET_REMINDERS",
      reminders: [...state.reminders, trimmed],
    });
    setReminderInput("");
  }, [reminderInput, state.reminders, dispatch]);

  const handleRemoveReminder = useCallback(
    (index: number) => {
      dispatch({
        type: "SET_REMINDERS",
        reminders: state.reminders.filter((_, i) => i !== index),
      });
    },
    [state.reminders, dispatch],
  );

  const handleAddTemplate = useCallback(
    (template: string) => {
      if (state.reminders.includes(template)) return;
      dispatch({
        type: "SET_REMINDERS",
        reminders: [...state.reminders, template],
      });
    },
    [state.reminders, dispatch],
  );

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-brand-foreground mb-2">
          {FIELD_LABELS.GENERAL_REMINDERS}
        </label>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={reminderInput}
            onChange={(e) => setReminderInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleAddReminder()}
            placeholder={PLACEHOLDERS.REMINDER}
            className="flex-1 px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-foreground focus:outline-none focus:ring-2 focus:ring-brand-accent"
          />
          <button
            onClick={handleAddReminder}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {ARRAY_ACTIONS.ADD}
          </button>
        </div>

        <div className="space-y-2 mb-4">
          {state.reminders.map((reminder, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-brand-paperElev border border-brand-outline"
            >
              <span className="text-sm text-brand-foreground">{reminder}</span>
              <button
                onClick={() => handleRemoveReminder(index)}
                className={`text-brand-foreground/40 hover:${STATUS_TEXT_COLORS.error} transition-colors`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {state.reminders.length === 0 && (
          <p className="text-sm text-semantic-muted italic mb-4">
            No reminders added yet
          </p>
        )}

        <details className="mt-4">
          <summary className="text-sm font-medium text-brand-accent cursor-pointer mb-2">
            Quick Add Templates
          </summary>
          <div className="space-y-1 pl-4">
            {REMINDER_TEMPLATES.map((template, index) => (
              <button
                key={index}
                onClick={() => handleAddTemplate(template)}
                disabled={state.reminders.includes(template)}
                className="block w-full text-left text-sm py-2 px-3 rounded-lg hover:bg-brand-paperElev border border-transparent hover:border-brand-outline transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-brand-foreground"
              >
                {template}
              </button>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}

export function ReviewStep({ state }: WizardStepProps) {
  const [showJSON, setShowJSON] = useState(false);

  const personaData = {
    metadata: {
      ...state.metadata,
      exportedAt: new Date().toISOString(),
      exportVersion: "1.0",
    },
    mission: state.mission,
    guidancePhase: state.guidancePhase,
    validationPhase: state.validationPhase,
    envelopeContract: state.envelopeContract,
    reminders: state.reminders,
    llmConfig: state.llmConfig,
    notes: state.notes,
  };

  const personaJSON = JSON.stringify(personaData, null, 2);

  const handleDownload = () => {
    const eyeId = state.metadata.eyeId || "draft";
    const name =
      state.metadata.name.replace(/\s+/g, "-").toLowerCase() || "unnamed";
    const version = state.metadata.version || 1;
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `${eyeId}-${name}-v${version}-${timestamp}.json`;

    const blob = new Blob([personaJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-brand-foreground">
          {FIELD_LABELS.REVIEW_TITLE}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJSON(!showJSON)}
            className="px-4 py-2 rounded-lg border border-brand-outline text-brand-foreground hover:bg-brand-paperElev transition-colors text-sm"
          >
            {showJSON ? "Hide" : "Show"} JSON
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors text-sm"
          >
            <Download className="w-4 h-4" />
            Export JSON
          </button>
        </div>
      </div>

      {showJSON ? (
        <div className="relative">
          <pre className="p-4 rounded-lg bg-brand-paper border border-brand-outline text-sm font-mono text-brand-foreground overflow-x-auto max-h-[500px] overflow-y-auto">
            {personaJSON}
          </pre>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-foreground mb-2">
              Metadata
            </h4>
            <p className="text-sm text-semantic-muted">
              <strong>Eye ID:</strong> {state.metadata.eyeId || "(not set)"}
            </p>
            <p className="text-sm text-semantic-muted">
              <strong>Name:</strong> {state.metadata.name || "(not set)"}
            </p>
            <p className="text-sm text-semantic-muted">
              <strong>Capabilities:</strong>{" "}
              {state.metadata.capabilities.length} capabilities
            </p>
          </div>

          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-foreground mb-2">
              Mission
            </h4>
            <p className="text-sm text-semantic-muted">
              {state.mission || "(not set)"} ({state.mission.length} chars)
            </p>
          </div>

          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-foreground mb-2">
              Envelope Contract
            </h4>
            <p className="text-sm text-semantic-muted">
              <strong>Required Keys:</strong>{" "}
              {state.envelopeContract.requiredKeys.length}
            </p>
            <p className="text-sm text-semantic-muted">
              <strong>Data Keys:</strong>{" "}
              {state.envelopeContract.requiredDataKeys.length}
            </p>
            <p className="text-sm text-semantic-muted">
              <strong>UI Keys:</strong>{" "}
              {state.envelopeContract.requiredUiKeys.length}
            </p>
          </div>

          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-foreground mb-2">
              Reminders
            </h4>
            <p className="text-sm text-semantic-muted">
              {state.reminders.length} reminders configured
            </p>
          </div>

          <div className="p-4 rounded-lg bg-brand-paperElev border border-brand-outline">
            <h4 className="font-semibold text-brand-foreground mb-2">
              LLM Configuration
            </h4>
            <p className="text-sm text-semantic-muted">
              <strong>Temperature:</strong> {state.llmConfig.temperature}
            </p>
            <p className="text-sm text-semantic-muted">
              <strong>Top P:</strong> {state.llmConfig.top_p}
            </p>
            <p className="text-sm text-semantic-muted">
              <strong>Max Tokens:</strong> {state.llmConfig.max_tokens}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
