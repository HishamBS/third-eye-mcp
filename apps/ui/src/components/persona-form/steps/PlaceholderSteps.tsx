'use client';

import React from 'react';
import type { WizardStepProps } from '@/types/persona-form';
import { Construction } from 'lucide-react';

/**
 * Placeholder Step Components - To be implemented in Phase 14 continuation
 *
 * These components follow the same pattern as Metadata, Mission, and LLMConfig.
 * Each will have:
 * - Form fields from SSOT constants (R13)
 * - Strict typing (R07)
 * - Array management where applicable
 * - Real-time validation
 */

function PlaceholderStep({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Construction className="w-16 h-16 text-brand-accent/50 mb-4" />
      <h3 className="text-xl font-semibold text-brand-ink mb-2">{title}</h3>
      <p className="text-brand-ink/70 max-w-md">{description}</p>
      <p className="text-sm text-brand-ink/50 mt-4">
        Form fields will be added in Phase 14 continuation
      </p>
    </div>
  );
}

export function GuidanceStep(props: WizardStepProps) {
  return (
    <PlaceholderStep
      title="Guidance Phase Configuration"
      description="Configure mission, check logic, reminders, and example JSON for the guidance phase. Includes array management for reminders and JSON syntax highlighting."
    />
  );
}

export function ValidationStep(props: WizardStepProps) {
  return (
    <PlaceholderStep
      title="Validation Phase Configuration"
      description="Optional validation phase configuration. Same structure as Guidance Phase with enable/disable toggle. When disabled, all fields are hidden."
    />
  );
}

export function EnvelopeStep(props: WizardStepProps) {
  return (
    <PlaceholderStep
      title="Envelope Contract Configuration"
      description="Define required keys for the data envelope contract: top-level keys, data object keys, and UI object keys. Each array supports add/remove with duplicate validation."
    />
  );
}

export function RemindersStep(props: WizardStepProps) {
  return (
    <PlaceholderStep
      title="General Reminders Configuration"
      description="Add general reminders that apply to all phases. Includes array management with add/remove/reorder functionality and pre-defined templates dropdown."
    />
  );
}

export function NotesStep(props: WizardStepProps) {
  return (
    <PlaceholderStep
      title="Internal Notes"
      description="Optional internal notes for documentation (not sent to LLM). Includes character count (0-5000 chars) and optional Markdown preview toggle."
    />
  );
}

export function ReviewStep(props: WizardStepProps) {
  return (
    <PlaceholderStep
      title="Review & Export"
      description="Read-only preview of all configuration sections (collapsible cards). Includes JSON preview toggle with syntax highlighting, copy to clipboard, and export to .json file functionality."
    />
  );
}
