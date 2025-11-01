'use client';

import { useReducer, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import type { CustomEyeFormState, CustomEyeFormAction, CustomEyeWizardProps, WizardStep } from '@/types/custom-eye-form';
import { WIZARD_STEPS, TOTAL_STEPS, STEP_TITLES, STEP_DESCRIPTIONS, BUTTON_LABELS, WIZARD_TEXT } from './constants';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { SchemaStep } from './steps/SchemaStep';
import { ReviewStep } from './steps/ReviewStep';
import { ANIMATION_DURATION } from '@/constants/timing';

/**
 * CustomEyeWizard - Visual schema builder for non-technical users
 *
 * Per R13: All text from SSOT
 * Per R07: Strict typing
 * Per R04: useReducer + memoized handlers
 */

const SIMPLE_STEPS = {
  BASIC_INFO: 0,
  SCHEMAS: 1,
  REVIEW: 2,
} as const;

const SIMPLE_TOTAL_STEPS = 3;

const createInitialState = (initialData?: Partial<CustomEyeFormState>): CustomEyeFormState => ({
  currentStep: 0,
  formData: {
    name: initialData?.formData?.name || '',
    description: initialData?.formData?.description || '',
    inputSchema: initialData?.formData?.inputSchema || '{"type":"object","properties":{},"required":[]}',
    outputSchema: initialData?.formData?.outputSchema || '{"type":"object","properties":{},"required":[]}',
    iconSvg: initialData?.formData?.iconSvg || '',
    personaId: initialData?.formData?.personaId || '',
  },
  isDirty: false,
  isEditing: !!initialData?.eyeId,
  eyeId: initialData?.eyeId,
});

function customEyeFormReducer(state: CustomEyeFormState, action: CustomEyeFormAction): CustomEyeFormState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step };
    case 'SET_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.formData }, isDirty: true };
    case 'SET_NAME':
      return { ...state, formData: { ...state.formData, name: action.name }, isDirty: true };
    case 'SET_DESCRIPTION':
      return { ...state, formData: { ...state.formData, description: action.description }, isDirty: true };
    case 'SET_INPUT_SCHEMA':
      return { ...state, formData: { ...state.formData, inputSchema: action.inputSchema }, isDirty: true };
    case 'SET_OUTPUT_SCHEMA':
      return { ...state, formData: { ...state.formData, outputSchema: action.outputSchema }, isDirty: true };
    case 'SET_ICON_SVG':
      return { ...state, formData: { ...state.formData, iconSvg: action.iconSvg }, isDirty: true };
    case 'SET_PERSONA_ID':
      return { ...state, formData: { ...state.formData, personaId: action.personaId }, isDirty: true };
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, SIMPLE_TOTAL_STEPS - 1) };
    case 'PREVIOUS_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    case 'RESET':
      return createInitialState();
    case 'MARK_CLEAN':
      return { ...state, isDirty: false };
    case 'LOAD_TEMPLATE':
      return {
        ...state,
        formData: {
          ...state.formData,
          inputSchema: action.inputSchema,
          outputSchema: action.outputSchema,
        },
        isDirty: true,
      };
    default:
      return state;
  }
}

export function CustomEyeWizard({ initialData, eyeId, onSave, onCancel }: CustomEyeWizardProps) {
  const [state, dispatch] = useReducer(
    customEyeFormReducer,
    { formData: initialData, eyeId },
    createInitialState
  );

  const steps: readonly WizardStep[] = useMemo(
    () => [
      {
        id: SIMPLE_STEPS.BASIC_INFO,
        title: 'Basic Information',
        description: 'Define the name and description for your custom Eye',
        isOptional: false,
      },
      {
        id: SIMPLE_STEPS.SCHEMAS,
        title: 'Input & Output Schemas',
        description: 'Build your schemas visually with our form builder',
        isOptional: false,
      },
      {
        id: SIMPLE_STEPS.REVIEW,
        title: 'Review & Save',
        description: 'Review all configuration before saving',
        isOptional: false,
      },
    ],
    []
  );

  const currentStepInfo = useMemo(() => steps[state.currentStep], [steps, state.currentStep]);

  const handleNext = useCallback(() => dispatch({ type: 'NEXT_STEP' }), []);
  const handlePrevious = useCallback(() => dispatch({ type: 'PREVIOUS_STEP' }), []);

  const handleSave = useCallback(async () => {
    try {
      await onSave(state.formData);
      dispatch({ type: 'MARK_CLEAN' });
    } catch (error) {
      console.error('Failed to save custom eye:', error);
    }
  }, [onSave, state.formData]);

  const handleCancel = useCallback(() => {
    if (state.isDirty) {
      const confirmed = window.confirm(WIZARD_TEXT.UNSAVED_CHANGES);
      if (!confirmed) return;
    }
    onCancel();
  }, [onCancel, state.isDirty]);

  const isFirstStep = state.currentStep === 0;
  const isLastStep = state.currentStep === SIMPLE_TOTAL_STEPS - 1;

  return (
    <div className="min-h-screen bg-brand-paper p-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-brand-ink mb-2">
              {state.isEditing ? WIZARD_TEXT.TITLE_EDIT : WIZARD_TEXT.TITLE_CREATE}
            </h1>
            <p className="text-lg text-brand-ink/70">{WIZARD_TEXT.SUBTITLE}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-brand-ink/70">
              {WIZARD_TEXT.PROGRESS_LABEL
                .replace('{current}', String(state.currentStep + 1))
                .replace('{total}', String(SIMPLE_TOTAL_STEPS))}
            </span>
            <span className="text-sm font-medium text-brand-accent">{currentStepInfo?.title}</span>
          </div>

          <div className="h-2 bg-brand-outline/20 rounded-full overflow-hidden">
            <div
              className={`h-full bg-brand-accent transition-all ${ANIMATION_DURATION.NORMAL}`}
              style={{ width: `${((state.currentStep + 1) / SIMPLE_TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <GlassCard className="mb-8 min-h-[400px]">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-brand-ink mb-2">{currentStepInfo?.title}</h2>
            <p className="text-brand-ink/70">{currentStepInfo?.description}</p>
          </div>

          <div className="py-4">
            {state.currentStep === SIMPLE_STEPS.BASIC_INFO && (
              <BasicInfoStep state={state} dispatch={dispatch} onNext={handleNext} onPrevious={handlePrevious} />
            )}
            {state.currentStep === SIMPLE_STEPS.SCHEMAS && (
              <SchemaStep state={state} dispatch={dispatch} onNext={handleNext} onPrevious={handlePrevious} />
            )}
            {state.currentStep === SIMPLE_STEPS.REVIEW && (
              <ReviewStep state={state} dispatch={dispatch} onNext={handleNext} onPrevious={handlePrevious} />
            )}
          </div>
        </GlassCard>

        {/* Navigation */}
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
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-3 rounded-lg border border-brand-outline text-brand-ink hover:bg-brand-paperElev transition-colors"
            >
              <X className="w-4 h-4" />
              {BUTTON_LABELS.CANCEL}
            </button>

            {!isLastStep ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
              >
                {BUTTON_LABELS.NEXT}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-3 rounded-lg bg-brand-accent text-brand-foreground hover:bg-brand-accent/90 transition-colors"
              >
                <Save className="w-4 h-4" />
                {state.isEditing ? BUTTON_LABELS.UPDATE_EYE : BUTTON_LABELS.CREATE_EYE}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
