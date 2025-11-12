/**
 * Pipeline Mode Selector Component - Phase 4
 *
 * Toggle between three routing modes: Dynamic, Constrained, Fixed
 *
 * Per R04: Memoized callbacks
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT
 */

'use client';

import { useCallback } from 'react';
import { ROUTING_MODE_INFO } from '@third-eye/config/eye-capabilities';
import type { RoutingModeName } from '@third-eye/config/eye-capabilities';

interface PipelineModeSelectorProps {
  currentMode: RoutingModeName;
  onModeChange: (mode: RoutingModeName) => void;
}

/**
 * Mode card component
 */
function ModeCard({
  mode,
  isSelected,
  onClick
}: {
  mode: RoutingModeName;
  isSelected: boolean;
  onClick: () => void;
}) {
  const info = ROUTING_MODE_INFO[mode];

  // Badge color based on mode
  const badgeColors = {
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
  };

  const badgeColor = badgeColors[info.badgeColor as keyof typeof badgeColors] || badgeColors.blue;

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        hover:shadow-md hover:-translate-y-0.5
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-md'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
      `}
    >
      {/* Icon */}
      <div className="text-3xl mb-2">{info.icon}</div>

      {/* Label */}
      <div className="font-semibold text-sm mb-1">{info.label}</div>

      {/* Description */}
      <div className="text-xs text-gray-600 dark:text-gray-400 mb-2 min-h-[2.5rem]">
        {info.description}
      </div>

      {/* Badge */}
      <div className={`inline-block px-2 py-0.5 text-xs rounded-full ${badgeColor}`}>
        {info.badge}
      </div>

      {/* Selected checkmark */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}

/**
 * Pipeline Mode Selector - Main Component
 */
export function PipelineModeSelector({ currentMode, onModeChange }: PipelineModeSelectorProps) {
  const handleModeClick = useCallback((mode: RoutingModeName) => {
    onModeChange(mode);
  }, [onModeChange]);

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Select Routing Mode:
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ModeCard
          mode="fully_dynamic"
          isSelected={currentMode === 'fully_dynamic'}
          onClick={() => handleModeClick('fully_dynamic')}
        />
        <ModeCard
          mode="constrained"
          isSelected={currentMode === 'constrained'}
          onClick={() => handleModeClick('constrained')}
        />
        <ModeCard
          mode="fixed"
          isSelected={currentMode === 'fixed'}
          onClick={() => handleModeClick('fixed')}
        />
      </div>

      {/* Mode explanation */}
      <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
        {currentMode === 'fully_dynamic' && (
          <p>
            <strong>Dynamic Mode:</strong> Overseer analyzes each request and automatically selects
            the optimal eye sequence based on required capabilities. Best for most use cases.
          </p>
        )}
        {currentMode === 'constrained' && (
          <p>
            <strong>Constrained Mode:</strong> Overseer routes dynamically but respects your policy
            constraints (mandatory eyes, forbidden eyes, security requirements). Use when you need
            guardrails.
          </p>
        )}
        {currentMode === 'fixed' && (
          <p>
            <strong>Fixed Template Mode:</strong> Uses a predefined eye sequence from a template.
            Consistent results for repeated tasks. Best for standardized workflows.
          </p>
        )}
      </div>
    </div>
  );
}
