'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { Construction } from 'lucide-react';

/**
 * Personas Page - Under Construction
 *
 * **Phase 11 Status:** Legacy TEXT-based persona editing deleted per R10.
 * **Next:** Phase 13-14 will implement PersonaWizard with form-based configuration.
 *
 * Old implementation removed:
 * - markdown/JSON editors
 * - personaContent: string state
 * - TEXT blob editing
 *
 * New implementation (Phases 13-14):
 * - Multi-step PersonaWizard
 * - Form-based editing for all PersonaBlueprint fields
 * - Structured database schema (no TEXT blobs)
 *
 * See: IMPLEMENTATION_PLAN.md for roadmap
 * Per: CLAUDE.md R10 (Whole-System Refactors, no mixed legacy states)
 */
export default function PersonasPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <GlassCard className="max-w-2xl w-full p-12 text-center">
        <div className="flex justify-center mb-6">
          <Construction className="w-24 h-24 text-brand-accent animate-pulse" />
        </div>

        <h1 className="text-4xl font-bold text-brand-ink mb-4">
          Persona Configuration
        </h1>

        <p className="text-xl text-brand-ink/80 mb-6">
          Under Construction
        </p>

        <div className="text-left space-y-4 text-brand-ink/70 bg-brand-paperElev p-6 rounded-lg">
          <p className="font-semibold text-brand-accent">
            Phase 11 Complete: Legacy TEXT-based editing removed
          </p>

          <p>
            <strong>Coming in Phases 13-14:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 ml-4">
            <li>Multi-step PersonaWizard (9 steps)</li>
            <li>Form-based editing for all persona fields</li>
            <li>Metadata, Mission, Guidance/Validation phases</li>
            <li>Envelope contract configuration</li>
            <li>LLM settings (temperature, top_p, response format)</li>
            <li>Import/Export functionality</li>
            <li>Template library</li>
          </ul>

          <p className="text-sm italic mt-6 border-t border-brand-outline pt-4">
            Regular users will use forms. Power users will have collapsible JSON editors.
            Per CLAUDE.md R10: No mixed legacy states. Old TEXT blob implementation fully removed.
          </p>

          <p className="text-sm text-brand-ink/50 mt-4">
            See <code className="bg-brand-paper px-2 py-1 rounded">IMPLEMENTATION_PLAN.md</code> for complete roadmap.
          </p>
        </div>

        <div className="mt-8 text-sm text-brand-ink/50">
          For now, use the Eyes page to configure personas via JSON.
          Full form-based UI coming soon.
        </div>
      </GlassCard>
    </div>
  );
}
