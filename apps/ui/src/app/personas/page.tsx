'use client';

import { useState, useCallback } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PersonaWizard } from '@/components/persona-form/PersonaWizard';
import { Plus, CheckCircle2 } from 'lucide-react';
import type { PersonaFormState } from '@/types/persona-form';

/**
 * Personas Page - Phase 13 Complete
 *
 * **Phase 13 Status:** PersonaWizard foundation implemented with navigation shell
 * **Next:** Phase 14 will add rich form editors for each step
 *
 * Changes from Phase 11:
 * - PersonaWizard component with 9-step navigation
 * - Progress indicator and step management
 * - Form state with useReducer
 * - SSOT constants and strict types
 *
 * See: IMPLEMENTATION_PLAN.md for roadmap
 * Per: CLAUDE.md R10 (Whole-System Refactors, no mixed legacy states)
 */
export default function PersonasPage() {
  const [showWizard, setShowWizard] = useState(false);

  const handleSave = useCallback(async (data: PersonaFormState) => {
    console.log('Saving persona:', data);
    // TODO Phase 14: Implement actual save logic
    alert('Persona saved! (Phase 14 will implement actual API call)');
    setShowWizard(false);
  }, []);

  const handleCancel = useCallback(() => {
    setShowWizard(false);
  }, []);

  if (showWizard) {
    return (
      <PersonaWizard
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <GlassCard className="max-w-2xl w-full p-12 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle2 className="w-24 h-24 text-green-500" />
        </div>

        <h1 className="text-4xl font-bold text-brand-ink mb-4">
          Persona Configuration
        </h1>

        <p className="text-xl text-brand-ink/80 mb-6">
          Phase 13 Complete
        </p>

        <div className="text-left space-y-4 text-brand-ink/70 bg-brand-paperElev p-6 rounded-lg">
          <p className="font-semibold text-green-600">
            Phase 13 Complete: PersonaWizard foundation implemented
          </p>

          <p>
            <strong>Implemented:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>9-step wizard shell with navigation</li>
            <li>Progress indicator (step X/9)</li>
            <li>Form state management with useReducer</li>
            <li>SSOT constants (all text centralized)</li>
            <li>Strict TypeScript types (zero any)</li>
            <li>Memoized handlers for performance</li>
          </ul>

          <p>
            <strong>Coming in Phase 14:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Rich form editors for each step</li>
            <li>Metadata form (Eye ID, name, description, capabilities)</li>
            <li>Mission textarea with templates</li>
            <li>Guidance/Validation phase forms</li>
            <li>Envelope contract configuration</li>
            <li>LLM config sliders and toggles</li>
            <li>JSON import/export</li>
          </ul>

          <p className="text-sm italic mt-6 border-t border-brand-outline pt-4">
            Per CLAUDE.md R13: All wizard text in SSOT constants.
            Per CLAUDE.md R07: Zero any types, strict typing throughout.
          </p>

          <p className="text-sm text-brand-ink/50 mt-4">
            See <code className="bg-brand-paper px-2 py-1 rounded">IMPLEMENTATION_PLAN.md</code> for complete roadmap.
          </p>
        </div>

        <button
          onClick={() => setShowWizard(true)}
          className="mt-8 flex items-center gap-2 px-8 py-4 mx-auto rounded-lg bg-brand-accent text-white hover:bg-brand-accent/90 transition-colors text-lg font-semibold"
        >
          <Plus className="w-5 h-5" />
          Open PersonaWizard (Preview)
        </button>

        <div className="mt-6 text-sm text-brand-ink/50">
          Click above to preview the wizard shell.
          Form editors will be added in Phase 14.
        </div>
      </GlassCard>
    </div>
  );
}

