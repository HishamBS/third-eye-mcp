/**
 * Model Recommendation Panel Component - Phase 5
 *
 * Shows model recommendations for a specific eye with reasoning and override capability
 * Per R04: Memoized callbacks
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT
 */

'use client';

import { useState, useCallback } from 'react';
import {
  useModelRecommendation,
  useSuccessRateCategory,
  useModelOverride
} from '@/hooks/useModelRecommendations';
import { MODEL_OVERRIDE_WARNINGS } from '@third-eye/config/eye-model-recommendations';
import type { ProviderId } from '@third-eye/types';

interface ModelRecommendationPanelProps {
  eyeName: string;
  provider: ProviderId;
  onOverride?: (customModel: string) => void;
}

/**
 * Model Recommendation Panel - Main Component
 */
export function ModelRecommendationPanel({
  eyeName,
  provider,
  onOverride
}: ModelRecommendationPanelProps) {
  const recommendation = useModelRecommendation(eyeName, provider);
  const successCategory = useSuccessRateCategory(recommendation);
  const { getOverride, addOverride, removeOverride } = useModelOverride();

  const [showOverride, setShowOverride] = useState(false);
  const [customModel, setCustomModel] = useState('');

  const currentOverride = getOverride(eyeName, provider);

  const handleOverride = useCallback(() => {
    if (!customModel.trim()) return;

    addOverride({
      eyeName,
      provider,
      customModel: customModel.trim()
    });

    if (onOverride) {
      onOverride(customModel.trim());
    }

    setShowOverride(false);
    setCustomModel('');
  }, [eyeName, provider, customModel, addOverride, onOverride]);

  const handleRemoveOverride = useCallback(() => {
    removeOverride(eyeName, provider);
    setShowOverride(false);
  }, [eyeName, provider, removeOverride]);

  if (!recommendation) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No model recommendation available for this provider.
        </p>
      </div>
    );
  }

  const categoryColors = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700'
  };

  const categoryColor = successCategory ? categoryColors[successCategory.color as keyof typeof categoryColors] : categoryColors.blue;

  return (
    <div className="space-y-4">
      {/* Recommended Model Section */}
      <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="font-semibold text-sm uppercase text-gray-500 dark:text-gray-400 mb-1">
              Recommended Model
            </h4>
            <p className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
              {recommendation.model}
            </p>
          </div>
          {successCategory && (
            <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${categoryColor}`}>
              {successCategory.label}
            </span>
          )}
        </div>

        {/* Reasoning */}
        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {recommendation.reasoning}
          </p>
        </div>

        {/* Strengths */}
        <div className="mb-3">
          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
            Strengths
          </h5>
          <div className="flex flex-wrap gap-2">
            {recommendation.strengths.map((strength, idx) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
              >
                {strength}
              </span>
            ))}
          </div>
        </div>

        {/* Success Rate */}
        <div>
          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
            Expected Success Rate
          </h5>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {recommendation.expectedSuccessRate}
          </p>
        </div>
      </div>

      {/* Current Override (if exists) */}
      {currentOverride && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h4 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">
                ⚠️ Custom Model Override Active
              </h4>
              <p className="font-mono text-sm font-bold text-yellow-800 dark:text-yellow-200 mt-1">
                {currentOverride.customModel}
              </p>
            </div>
            <button
              onClick={handleRemoveOverride}
              className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 underline"
            >
              Remove Override
            </button>
          </div>
          <p className="text-xs text-yellow-700 dark:text-yellow-300">
            Using custom model instead of recommendation. Success rate may vary.
          </p>
        </div>
      )}

      {/* Override Button/Form */}
      {!showOverride && !currentOverride && (
        <button
          onClick={() => setShowOverride(true)}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          Use Custom Model Instead
        </button>
      )}

      {/* Override Form */}
      {showOverride && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg space-y-3">
          <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
            Override with Custom Model
          </h4>

          {/* Warnings */}
          <div className="space-y-2">
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Warning:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>{MODEL_OVERRIDE_WARNINGS.performance}</li>
                <li>{MODEL_OVERRIDE_WARNINGS.compatibility}</li>
                <li>{MODEL_OVERRIDE_WARNINGS.success_rate}</li>
              </ul>
            </div>
          </div>

          {/* Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Model Name
            </label>
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="e.g., llama-3.1-70b-versatile"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleOverride}
              disabled={!customModel.trim()}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Apply Override
            </button>
            <button
              onClick={() => {
                setShowOverride(false);
                setCustomModel('');
              }}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Provider-Specific Info */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>📊 {provider.toUpperCase()} Provider:</strong>{' '}
          {provider === 'groq' || provider === 'openrouter'
            ? MODEL_OVERRIDE_WARNINGS.remote_api
            : MODEL_OVERRIDE_WARNINGS.local_only}
        </p>
      </div>
    </div>
  );
}
