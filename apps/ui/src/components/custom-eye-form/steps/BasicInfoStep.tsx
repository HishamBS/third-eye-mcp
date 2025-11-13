"use client";

import { CheckCircle2 } from "lucide-react";
import type { WizardStepProps } from "@/types/custom-eye-form";
import { FIELD_LABELS, PLACEHOLDERS, HELP_TEXT } from "../constants";

/**
 * BasicInfoStep - Step 1 of CustomEyeWizard
 *
 * Per R07: Strict typing
 * Per R13: All text from SSOT
 */

export function BasicInfoStep({ state, dispatch }: WizardStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-medium text-semantic-muted">
          {FIELD_LABELS.NAME}
        </label>
        <input
          type="text"
          value={state.formData.name}
          onChange={(e) => dispatch({ type: "SET_NAME", name: e.target.value })}
          placeholder={PLACEHOLDERS.NAME}
          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        />
        <p className="mt-1 text-xs text-semantic-muted">{HELP_TEXT.NAME}</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-semantic-muted">
          {FIELD_LABELS.DESCRIPTION}
        </label>
        <textarea
          value={state.formData.description}
          onChange={(e) =>
            dispatch({ type: "SET_DESCRIPTION", description: e.target.value })
          }
          placeholder={PLACEHOLDERS.DESCRIPTION}
          rows={4}
          className="w-full resize-none rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground placeholder-slate-500 focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
        />
        <p className="mt-1 text-xs text-semantic-muted">
          {HELP_TEXT.DESCRIPTION}
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-semantic-muted">
          {FIELD_LABELS.ICON_SVG}
        </label>
        <input
          type="file"
          accept=".svg,image/svg+xml"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (file.size > 50000) {
                console.error("File size exceeds 50KB limit");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                dispatch({
                  type: "SET_ICON_SVG",
                  iconSvg: reader.result as string,
                });
              };
              reader.readAsText(file);
            }
          }}
          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-brand-foreground file:mr-4 file:rounded-lg file:border-0 file:bg-brand-accent file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand-paper hover:file:bg-brand-accent/90"
        />
        {state.formData.iconSvg && (
          <div className="mt-2 flex items-center gap-2 text-sm text-brand-accent">
            <CheckCircle2 className="h-4 w-4" />
            <span>SVG uploaded successfully</span>
          </div>
        )}
        <p className="mt-1 text-xs text-semantic-muted">{HELP_TEXT.ICON_SVG}</p>
      </div>
    </div>
  );
}
