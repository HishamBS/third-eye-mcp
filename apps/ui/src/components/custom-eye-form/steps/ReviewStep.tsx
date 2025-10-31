'use client';

import type { WizardStepProps } from '@/types/custom-eye-form';

/**
 * ReviewStep - Final step of CustomEyeWizard
 *
 * Review all configuration before saving
 * Per R07: Strict typing
 * Per R13: All text from SSOT
 */

function schemaToProperties(schemaStr: string): Array<{ name: string; type: string; required: boolean }> {
  try {
    const schema = JSON.parse(schemaStr);
    if (!schema.properties) return [];
    const required = schema.required || [];
    return Object.entries(schema.properties).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type || 'string',
      required: required.includes(name),
    }));
  } catch {
    return [];
  }
}

export function ReviewStep({ state }: WizardStepProps) {
  const inputProps = schemaToProperties(state.formData.inputSchema);
  const outputProps = schemaToProperties(state.formData.outputSchema);

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
        <h3 className="mb-3 text-lg font-semibold text-white">Basic Information</h3>
        <dl className="space-y-2">
          <div>
            <dt className="text-sm font-medium text-slate-300">Eye Name</dt>
            <dd className="mt-1 text-white">{state.formData.name || '(Not set)'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-slate-300">Description</dt>
            <dd className="mt-1 text-white">{state.formData.description || '(Not set)'}</dd>
          </div>
        </dl>
      </div>

      {/* Input Schema */}
      <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
        <h3 className="mb-3 text-lg font-semibold text-white">Input Schema</h3>
        {inputProps.length === 0 ? (
          <p className="text-slate-400">No input properties defined</p>
        ) : (
          <ul className="space-y-2">
            {inputProps.map((prop) => (
              <li key={prop.name} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-brand-accent">{prop.name}</span>
                <span className="rounded bg-brand-accent/20 px-2 py-0.5 text-xs text-brand-accent">
                  {prop.type}
                </span>
                {prop.required && (
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                    Required
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Output Schema */}
      <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-5">
        <h3 className="mb-3 text-lg font-semibold text-white">Output Schema</h3>
        {outputProps.length === 0 ? (
          <p className="text-slate-400">No output properties defined</p>
        ) : (
          <ul className="space-y-2">
            {outputProps.map((prop) => (
              <li key={prop.name} className="flex items-center gap-3 text-sm">
                <span className="font-mono text-brand-accent">{prop.name}</span>
                <span className="rounded bg-brand-accent/20 px-2 py-0.5 text-xs text-brand-accent">
                  {prop.type}
                </span>
                {prop.required && (
                  <span className="rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-400">
                    Required
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
