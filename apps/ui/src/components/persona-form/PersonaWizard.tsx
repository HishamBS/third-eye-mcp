'use client';

import React, { useReducer, useMemo, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import {
  WIZARD_STEPS,
  TOTAL_STEPS,
  STEP_TITLES,
  STEP_DESCRIPTIONS,
  BUTTON_LABELS,
  WIZARD_TEXT,
  OPTIONAL_STEPS,
} from './constants';
import type {
  PersonaFormState,
  PersonaFormAction,
  PersonaWizardProps,
  WizardStep,
} from '@/types/persona-form';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { MetadataStep } from './steps/MetadataStep';
import { MissionStep } from './steps/MissionStep';
import { EnvelopeStep } from './steps/EnvelopeStep';
import { NotesStep } from './steps/NotesStep';
import { LLMConfigStep } from './steps/LLMConfigStep';
import {
  GuidanceStep,
  ValidationStep,
  RemindersStep,
  ReviewStep,
} from './steps/PlaceholderSteps';

/**
 * PersonaWizard - Multi-step form for persona configuration
 *
 * Phase 13: Foundation shell with navigation
 * Phase 14: Will implement rich editors for each step
 *
 * Per R13: All text from SSOT constants
 * Per R07: Zero `any` types, strict typing
 * Per R04: useReducer for performance, memoized handlers
 */

// ============================================================================
// Initial State
// ============================================================================

const createInitialState = (): PersonaFormState => ({
  currentStep: WIZARD_STEPS.METADATA,
  metadata: {
    eyeId: '',
    name: '',
    description: '',
    version: 1,
    capabilities: [],
  },
  mission: '',
  guidancePhase: null,
  validationPhase: null,
  envelopeContract: {
    requiredKeys: [],
    requiredDataKeys: [],
    requiredUiKeys: [],
  },
  reminders: [],
  llmConfig: {
    temperature: 0,
    top_p: 1,
    response_format: 'json_object',
    max_tokens: 2000,
  },
  notes: '',
  isDirty: false,
});

// ============================================================================
// Reducer
// ============================================================================

function personaFormReducer(
  state: PersonaFormState,
  action: PersonaFormAction
): PersonaFormState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };

    case 'SET_METADATA':
      return { ...state, metadata: action.metadata, isDirty: true };

    case 'SET_MISSION':
      return { ...state, mission: action.mission, isDirty: true };

    case 'SET_GUIDANCE_PHASE':
      return { ...state, guidancePhase: action.guidancePhase, isDirty: true };

    case 'SET_VALIDATION_PHASE':
      return { ...state, validationPhase: action.validationPhase, isDirty: true };

    case 'SET_ENVELOPE_CONTRACT':
      return { ...state, envelopeContract: action.envelopeContract, isDirty: true };

    case 'SET_REMINDERS':
      return { ...state, reminders: action.reminders, isDirty: true };

    case 'SET_LLM_CONFIG':
      return { ...state, llmConfig: action.llmConfig, isDirty: true };

    case 'SET_NOTES':
      return { ...state, notes: action.notes, isDirty: true };

    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS - 1),
      };

    case 'PREVIOUS_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0),
      };

    case 'RESET':
      return createInitialState();

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

// ============================================================================
// Component
// ============================================================================

export function PersonaWizard({
  initialData,
  onSave,
  onCancel,
}: PersonaWizardProps) {
  const [state, dispatch] = useReducer(
    personaFormReducer,
    initialData,
    (initial) => ({
      ...createInitialState(),
      ...initial,
    })
  );

  // Memoized step configuration
  const steps: readonly WizardStep[] = useMemo(
    () =>
      Object.values(WIZARD_STEPS).map((stepId) => ({
        id: stepId,
        title: STEP_TITLES[stepId],
        description: STEP_DESCRIPTIONS[stepId],
        isOptional: OPTIONAL_STEPS.has(stepId),
      })),
    []
  );

  const currentStepInfo = useMemo(
    () => steps[state.currentStep],
    [steps, state.currentStep]
  );

  // Navigation handlers (memoized per R04)
  const handleNext = useCallback(() => {
    dispatch({ type: 'NEXT_STEP' });
  }, []);

  const handlePrevious = useCallback(() => {
    dispatch({ type: 'PREVIOUS_STEP' });
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await onSave(state);
      dispatch({ type: 'MARK_CLEAN' });
    } catch (error) {
      console.error('Failed to save persona:', error);
    }
  }, [onSave, state]);

  const handleCancel = useCallback(() => {
    if (state.isDirty) {
      const confirmed = window.confirm(WIZARD_TEXT.UNSAVED_CHANGES);
      if (!confirmed) return;
    }
    onCancel();
  }, [onCancel, state.isDirty]);

  // Navigation state
  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === TOTAL_STEPS - 1;
  const canSkip = currentStepInfo?.isOptional ?? false;

  return (
    <div className="min-h-screen bg-brand-paper p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-brand-ink mb-2">
            {WIZARD_TEXT.TITLE}
          </h1>
          <p className="text-lg text-brand-ink/70">
            {WIZARD_TEXT.SUBTITLE}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-brand-ink/70">
              {WIZARD_TEXT.PROGRESS_LABEL
                .replace('{current}', String(state.currentStep + 1))
                .replace('{total}', String(TOTAL_STEPS))}
            </span>
            <span className="text-sm font-medium text-brand-accent">
              {currentStepInfo?.title}
              {canSkip && (
                <span className="ml-2 text-xs text-brand-ink/50">
                  (Optional)
                </span>
              )}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="h-2 bg-brand-outline/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-accent transition-all duration-300"
              style={{
                width: `${((state.currentStep + 1) / TOTAL_STEPS) * 100}%`,
              }}
            />
          </div>

          {/* Step Dots */}
          <div className="flex justify-between mt-4">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    step.id === state.currentStep
                      ? 'bg-brand-accent text-white'
                      : step.id < state.currentStep
                      ? 'bg-brand-accent/50 text-white'
                      : 'bg-brand-outline/30 text-brand-ink/40'
                  }`}
                >
                  {step.id + 1}
                </div>
                <span className="text-xs text-brand-ink/50 max-w-[80px] text-center">
                  {step.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <GlassCard className="mb-8 min-h-[400px]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-brand-ink mb-2">
              {currentStepInfo?.title}
            </h2>
            <p className="text-brand-ink/70">
              {currentStepInfo?.description}
            </p>
          </div>

          {/* Step Form Content */}
          <div className="py-4">
            {state.currentStep === WIZARD_STEPS.METADATA && (
              <MetadataStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {state.currentStep === WIZARD_STEPS.MISSION && (
              <MissionStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {state.currentStep === WIZARD_STEPS.GUIDANCE && (
              <GuidanceStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {state.currentStep === WIZARD_STEPS.VALIDATION && (
              <ValidationStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {state.currentStep === WIZARD_STEPS.ENVELOPE && (
              <EnvelopeStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {state.currentStep === WIZARD_STEPS.REMINDERS && (
              <RemindersStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {state.currentStep === WIZARD_STEPS.LLM_CONFIG && (
              <LLMConfigStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {state.currentStep === WIZARD_STEPS.NOTES && (
              <NotesStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
            {state.currentStep === WIZARD_STEPS.REVIEW && (
              <ReviewStep
                state={state}
                dispatch={dispatch}
                onNext={handleNext}
                onPrevious={handlePrevious}
              />
            )}
          </div>
        </GlassCard>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-2 px-6 py-3 rounded-lg border border-brand-outline text-brand-ink hover:bg-brand-paperElev transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                {BUTTON_LABELS.PREVIOUS}
              </button>
            )}

            {canSkip && !isLastStep && (
              <button
                onClick={handleNext}
                className="px-6 py-3 rounded-lg border border-brand-outline text-brand-ink/60 hover:bg-brand-paperElev transition-colors"
              >
                {BUTTON_LABELS.SKIP}
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-brand-outline text-brand-ink hover:bg-brand-paperElev transition-colors"
            >
              <X className="w-4 h-4" />
              {BUTTON_LABELS.CANCEL}
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-accent/20 border border-brand-accent text-brand-accent hover:bg-brand-accent hover:text-white transition-colors"
            >
              <Save className="w-4 h-4" />
              {BUTTON_LABELS.SAVE_DRAFT}
            </button>

            {!isLastStep ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
              >
                {BUTTON_LABELS.NEXT}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors"
              >
                <Save className="w-4 h-4" />
                {BUTTON_LABELS.FINISH}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
