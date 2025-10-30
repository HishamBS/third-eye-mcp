'use client';

import React from 'react';
import type { WizardStepProps } from '@/types/persona-form';
import {
  FIELD_LABELS,
  HELP_TEXT,
  LLM_CONFIG_RANGES,
  RESPONSE_FORMAT_LABELS,
  RESPONSE_FORMATS,
} from '../constants';

/**
 * LLMConfigStep - LLM parameter configuration
 *
 * Per R13: All text from SSOT constants
 * Per R07: Strict typing, no any
 */

export function LLMConfigStep({ state, dispatch }: WizardStepProps) {
  return (
    <div className="space-y-8">
      {/* Temperature */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-brand-ink">
            {FIELD_LABELS.TEMPERATURE}
          </label>
          <span className="text-sm font-mono text-brand-accent">
            {state.llmConfig.temperature.toFixed(1)}
          </span>
        </div>
        <input
          type="range"
          min={LLM_CONFIG_RANGES.TEMPERATURE.min}
          max={LLM_CONFIG_RANGES.TEMPERATURE.max}
          step={LLM_CONFIG_RANGES.TEMPERATURE.step}
          value={state.llmConfig.temperature}
          onChange={(e) =>
            dispatch({
              type: 'SET_LLM_CONFIG',
              llmConfig: {
                ...state.llmConfig,
                temperature: parseFloat(e.target.value),
              },
            })
          }
          className="w-full h-2 bg-brand-outline rounded-lg appearance-none cursor-pointer accent-brand-accent"
        />
        <p className="text-xs text-brand-ink/60 mt-2">{HELP_TEXT.TEMPERATURE}</p>
      </div>

      {/* Top P */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-brand-ink">
            {FIELD_LABELS.TOP_P}
          </label>
          <span className="text-sm font-mono text-brand-accent">
            {state.llmConfig.top_p.toFixed(2)}
          </span>
        </div>
        <input
          type="range"
          min={LLM_CONFIG_RANGES.TOP_P.min}
          max={LLM_CONFIG_RANGES.TOP_P.max}
          step={LLM_CONFIG_RANGES.TOP_P.step}
          value={state.llmConfig.top_p}
          onChange={(e) =>
            dispatch({
              type: 'SET_LLM_CONFIG',
              llmConfig: {
                ...state.llmConfig,
                top_p: parseFloat(e.target.value),
              },
            })
          }
          className="w-full h-2 bg-brand-outline rounded-lg appearance-none cursor-pointer accent-brand-accent"
        />
        <p className="text-xs text-brand-ink/60 mt-2">{HELP_TEXT.TOP_P}</p>
      </div>

      {/* Response Format */}
      <div>
        <label className="block text-sm font-medium text-brand-ink mb-2">
          {FIELD_LABELS.RESPONSE_FORMAT}
        </label>
        <select
          value={state.llmConfig.response_format}
          onChange={(e) =>
            dispatch({
              type: 'SET_LLM_CONFIG',
              llmConfig: {
                ...state.llmConfig,
                response_format: e.target.value as 'text' | 'json_object',
              },
            })
          }
          className="w-full px-4 py-2 rounded-lg border border-brand-outline bg-brand-paper text-brand-ink focus:outline-none focus:ring-2 focus:ring-brand-accent"
        >
          <option value={RESPONSE_FORMATS.JSON_OBJECT}>
            {RESPONSE_FORMAT_LABELS[RESPONSE_FORMATS.JSON_OBJECT]}
          </option>
          <option value={RESPONSE_FORMATS.TEXT}>
            {RESPONSE_FORMAT_LABELS[RESPONSE_FORMATS.TEXT]}
          </option>
        </select>
        <p className="text-xs text-brand-ink/60 mt-2">{HELP_TEXT.RESPONSE_FORMAT}</p>
      </div>

      {/* Max Tokens */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-brand-ink">
            {FIELD_LABELS.MAX_TOKENS}
          </label>
          <span className="text-sm font-mono text-brand-accent">
            {state.llmConfig.max_tokens}
          </span>
        </div>
        <input
          type="range"
          min={LLM_CONFIG_RANGES.MAX_TOKENS.min}
          max={LLM_CONFIG_RANGES.MAX_TOKENS.max}
          step={LLM_CONFIG_RANGES.MAX_TOKENS.step}
          value={state.llmConfig.max_tokens}
          onChange={(e) =>
            dispatch({
              type: 'SET_LLM_CONFIG',
              llmConfig: {
                ...state.llmConfig,
                max_tokens: parseInt(e.target.value, 10),
              },
            })
          }
          className="w-full h-2 bg-brand-outline rounded-lg appearance-none cursor-pointer accent-brand-accent"
        />
        <p className="text-xs text-brand-ink/60 mt-2">{HELP_TEXT.MAX_TOKENS}</p>
      </div>
    </div>
  );
}
