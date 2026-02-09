"use client";

import { useReducer, useCallback, useMemo } from "react";
import type {
  EyeWizardProps,
  EyeFormState,
  EyeFormAction,
  EyeFormData,
} from "@/types/eye-wizard";
import { EyeWizardStep } from "@/types/eye-wizard";
import {
  WIZARD_CONFIG,
  STEP_CONFIG,
  DEFAULT_VALUES,
  BUTTON_LABELS,
  PROGRESS_LABELS,
} from "./constants";

// Step components (will be created next)
import { BasicInfoStep } from "./BasicInfoStep";
import { SchemaStep } from "./SchemaStep";
import { PersonaStep } from "./PersonaStep";
import { ReviewStep } from "./ReviewStep";

/**
 * Initial state factory
 */
function createInitialState(
  initialData?: Partial<EyeFormData>,
  eyeId?: string,
  isEditing?: boolean,
): EyeFormState {
  return {
    currentStep: EyeWizardStep.BASIC_INFO,
    formData: {
      name: initialData?.name ?? DEFAULT_VALUES.NAME,
      description: initialData?.description ?? DEFAULT_VALUES.DESCRIPTION,
      iconSvg: initialData?.iconSvg ?? DEFAULT_VALUES.ICON_SVG,
      inputSchema: initialData?.inputSchema ?? DEFAULT_VALUES.INPUT_SCHEMA,
      outputSchema: initialData?.outputSchema ?? DEFAULT_VALUES.OUTPUT_SCHEMA,
      personaId: initialData?.personaId ?? DEFAULT_VALUES.PERSONA_ID,
    },
    isDirty: false,
    isEditing: isEditing ?? false,
    eyeId,
  };
}

/**
 * Reducer for wizard state management (R04 - Performance)
 */
function wizardReducer(
  state: EyeFormState,
  action: EyeFormAction,
): EyeFormState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.payload };

    case "NEXT_STEP":
      if (state.currentStep < WIZARD_CONFIG.LAST_STEP) {
        return {
          ...state,
          currentStep: (state.currentStep + 1) as EyeWizardStep,
        };
      }
      return state;

    case "PREVIOUS_STEP":
      if (state.currentStep > WIZARD_CONFIG.FIRST_STEP) {
        return {
          ...state,
          currentStep: (state.currentStep - 1) as EyeWizardStep,
        };
      }
      return state;

    case "UPDATE_BASIC_INFO":
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
        isDirty: true,
      };

    case "UPDATE_SCHEMAS":
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
        isDirty: true,
      };

    case "UPDATE_PERSONA":
      return {
        ...state,
        formData: { ...state.formData, personaId: action.payload },
        isDirty: true,
      };

    case "LOAD_EYE_DATA": {
      const eye = action.payload;
      return {
        ...state,
        formData: {
          name: eye.name || "",
          description: eye.description || "",
          iconSvg: eye.iconSvg ?? "",
          inputSchema: eye.inputSchemaJson
            ? JSON.stringify(eye.inputSchemaJson, null, 2)
            : "{}",
          outputSchema: eye.outputSchemaJson
            ? JSON.stringify(eye.outputSchemaJson, null, 2)
            : "{}",
          personaId: eye.personaId || "",
        },
        isDirty: false,
      };
    }

    case "MARK_CLEAN":
      return { ...state, isDirty: false };

    case "RESET":
      return createInitialState();

    default:
      return state;
  }
}

/**
 * Main EyeWizard component
 * Follows PersonaWizard architecture pattern (R03)
 */
export function EyeWizard({
  initialData,
  eyeId,
  isEditing = false,
  onSave,
  onCancel,
}: EyeWizardProps) {
  // Initialize state with useReducer (R04)
  const [state, dispatch] = useReducer(
    wizardReducer,
    createInitialState(initialData, eyeId, isEditing),
  );

  // Navigation handlers (R04 - useCallback for performance)
  const handleNext = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const handlePrevious = useCallback(() => {
    dispatch({ type: "PREVIOUS_STEP" });
  }, []);

  const handleStepClick = useCallback((step: EyeWizardStep) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  // Save handler
  const handleSave = useCallback(async () => {
    try {
      await onSave(state.formData, state.eyeId);
      dispatch({ type: "MARK_CLEAN" });
    } catch (error) {
      console.error("Failed to save Eye:", error);
      throw error;
    }
  }, [onSave, state.formData, state.eyeId]);

  // Cancel handler with unsaved changes warning
  const handleCancel = useCallback(() => {
    if (state.isDirty && WIZARD_CONFIG.CONFIRM_UNSAVED_CHANGES) {
      if (
        !confirm("You have unsaved changes. Are you sure you want to cancel?")
      ) {
        return;
      }
    }
    onCancel();
  }, [state.isDirty, onCancel]);

  // Current step config (R04 - useMemo)
  const currentStepConfig = useMemo(
    () => STEP_CONFIG[state.currentStep],
    [state.currentStep],
  );

  // Progress percentage (R04 - useMemo)
  const progressPercentage = useMemo(
    () => ((state.currentStep + 1) / WIZARD_CONFIG.TOTAL_STEPS) * 100,
    [state.currentStep],
  );

  // Render current step component
  const renderStep = () => {
    const stepProps = {
      state,
      dispatch,
      onNext: handleNext,
      onPrevious: handlePrevious,
    };

    switch (state.currentStep) {
      case EyeWizardStep.BASIC_INFO:
        return <BasicInfoStep {...stepProps} />;
      case EyeWizardStep.SCHEMAS:
        return <SchemaStep {...stepProps} />;
      case EyeWizardStep.PERSONA:
        return <PersonaStep {...stepProps} />;
      case EyeWizardStep.REVIEW:
        return <ReviewStep {...stepProps} onSave={handleSave} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-semantic-muted">
            {PROGRESS_LABELS.STEP_OF(
              state.currentStep,
              WIZARD_CONFIG.TOTAL_STEPS,
            )}
          </span>
          <span className="text-sm font-medium text-brand-accent">
            {PROGRESS_LABELS.PROGRESS_PERCENTAGE(
              state.currentStep,
              WIZARD_CONFIG.TOTAL_STEPS,
            )}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-brand-outline/20">
          <div
            className="h-full bg-brand-accent transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="mb-8 flex items-center justify-between">
        {Array.from({ length: WIZARD_CONFIG.TOTAL_STEPS }, (_, i) => {
          const step = i as EyeWizardStep;
          const stepConfig = STEP_CONFIG[step];
          const isActive = step === state.currentStep;
          const isCompleted = step < state.currentStep;

          return (
            <button
              key={step}
              onClick={() => handleStepClick(step)}
              className={`flex flex-1 flex-col items-center gap-2 rounded-lg p-3 transition-colors ${
                isActive
                  ? "bg-brand-accent/20 text-brand-accent"
                  : isCompleted
                    ? "bg-brand-outline/10 text-brand-foreground hover:bg-brand-outline/20"
                    : "text-semantic-muted hover:bg-brand-outline/10"
              }`}
              type="button"
            >
              <span className="text-2xl">{stepConfig.icon}</span>
              <span className="text-xs font-medium">{stepConfig.title}</span>
            </button>
          );
        })}
      </div>

      {/* Current Step Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-brand-foreground">
          {currentStepConfig.title}
        </h2>
        <p className="mt-1 text-sm text-semantic-muted">
          {currentStepConfig.description}
        </p>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-y-auto">{renderStep()}</div>

      {/* Navigation Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-brand-outline/50 pt-4">
        <button
          onClick={handleCancel}
          className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
          type="button"
        >
          {BUTTON_LABELS.CANCEL}
        </button>

        <div className="flex gap-3">
          {state.currentStep > WIZARD_CONFIG.FIRST_STEP && (
            <button
              onClick={handlePrevious}
              className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
              type="button"
            >
              {BUTTON_LABELS.PREVIOUS}
            </button>
          )}

          {state.currentStep < WIZARD_CONFIG.LAST_STEP && (
            <button
              onClick={handleNext}
              className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-primary"
              type="button"
            >
              {BUTTON_LABELS.NEXT}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
