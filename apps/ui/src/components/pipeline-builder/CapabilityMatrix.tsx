/**
 * Capability Matrix Component - Phase 4
 *
 * Shows what each eye CAN do (NOT a fixed pipeline diagram)
 * Displays eye capabilities as a matrix of cards, not a linear sequence
 *
 * Per R04: Memoized callbacks
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT
 */

'use client';

import { useMemo, useState } from 'react';
import { useEyeCapabilities } from '@/hooks/useEyeCapabilities';
import { EYE_CAPABILITIES } from '@third-eye/config/eye-capabilities';
import type { EyeWithCapabilities } from '@/hooks/useEyeCapabilities';

interface CapabilityMatrixProps {
  mode: 'dynamic' | 'constrained' | 'fixed';
  highlightedEyes?: string[]; // For showing active routing decision
}

/**
 * Eye capability card component
 */
function EyeCapabilityCard({
  eye,
  highlighted,
  onClick
}: {
  eye: EyeWithCapabilities;
  highlighted: boolean;
  onClick: () => void;
}) {
  const eyeName = eye.name.toLowerCase();
  const eyeInfo = EYE_CAPABILITIES[eyeName as keyof typeof EYE_CAPABILITIES];

  // Fallback if eye not in capabilities config
  const icon = eyeInfo?.icon || '👁️';
  const color = eyeInfo?.color || 'gray';
  const description = eye.description || 'No description available';
  const tags = eye.capabilityTags.length > 0 ? eye.capabilityTags : eyeInfo?.tags || [];
  const scenarios = eyeInfo?.scenarios || [];

  return (
    <button
      onClick={onClick}
      className={`
        relative p-4 rounded-lg border-2 transition-all duration-200
        hover:shadow-lg hover:-translate-y-1
        ${highlighted
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
        }
      `}
    >
      {/* Eye icon and name */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl" aria-label={`${eye.name} icon`}>
          {icon}
        </span>
        <div className="flex-1 text-left">
          <h3 className="font-semibold text-lg">{eye.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            v{eye.version}
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 text-left">
        {description}
      </p>

      {/* Capability tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Status indicator */}
      <div className="absolute top-2 right-2">
        {eye.active ? (
          <span className="inline-block w-2 h-2 bg-green-500 rounded-full" title="Active" />
        ) : (
          <span className="inline-block w-2 h-2 bg-gray-300 rounded-full" title="Inactive" />
        )}
      </div>
    </button>
  );
}

/**
 * Eye detail modal (shown on click)
 */
function EyeDetailModal({
  eye,
  onClose
}: {
  eye: EyeWithCapabilities;
  onClose: () => void;
}) {
  const eyeName = eye.name.toLowerCase();
  const eyeInfo = EYE_CAPABILITIES[eyeName as keyof typeof EYE_CAPABILITIES];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{eyeInfo?.icon || '👁️'}</span>
              <div>
                <h2 className="text-2xl font-bold">{eye.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Version {eye.version} • {eye.active ? 'Active' : 'Inactive'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="font-semibold text-sm uppercase text-gray-500 dark:text-gray-400 mb-2">
              Description
            </h3>
            <p className="text-gray-700 dark:text-gray-300">{eye.description}</p>
          </div>

          {/* Capabilities */}
          {eye.capabilityTags.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm uppercase text-gray-500 dark:text-gray-400 mb-2">
                Capabilities
              </h3>
              <div className="flex flex-wrap gap-2">
                {eye.capabilityTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 text-sm rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Example scenarios */}
          {eyeInfo?.scenarios && eyeInfo.scenarios.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm uppercase text-gray-500 dark:text-gray-400 mb-2">
                Example Scenarios
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                {eyeInfo.scenarios.map((scenario, idx) => (
                  <li key={idx}>{scenario}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Capability Matrix - Main Component
 */
export function CapabilityMatrix({ mode, highlightedEyes = [] }: CapabilityMatrixProps) {
  const { eyes, loading, error } = useEyeCapabilities();
  const [selectedEye, setSelectedEye] = useState<EyeWithCapabilities | null>(null);

  // Memoize highlighted eye set for performance
  const highlightedSet = useMemo(() => new Set(highlightedEyes), [highlightedEyes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">
          Failed to load eye capabilities: {error.message}
        </p>
      </div>
    );
  }

  if (eyes.length === 0) {
    return (
      <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">
          No eyes available. Check your database configuration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Capability Matrix</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            What each eye can do{highlightedEyes.length > 0 ? ' (highlighted eyes were selected for current routing)' : ''}
          </p>
        </div>
        {mode !== 'dynamic' && (
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Mode: <span className="font-semibold capitalize">{mode}</span>
          </div>
        )}
      </div>

      {/* Grid of eye capability cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {eyes.map((eye) => (
          <EyeCapabilityCard
            key={eye.id}
            eye={eye}
            highlighted={highlightedSet.has(eye.name.toLowerCase())}
            onClick={() => setSelectedEye(eye)}
          />
        ))}
      </div>

      {/* Mode-specific info */}
      {mode === 'dynamic' && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Dynamic Mode:</strong> Overseer analyzes each request and dynamically selects
            the optimal eye sequence based on required capabilities. No fixed pipeline.
          </p>
        </div>
      )}

      {mode === 'constrained' && (
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            <strong>Constrained Mode:</strong> Overseer routes within your defined policy constraints
            (mandatory eyes, forbidden eyes, security requirements).
          </p>
        </div>
      )}

      {mode === 'fixed' && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>Fixed Template Mode:</strong> Uses a predefined eye sequence from a template.
            Consistent results for repeated tasks.
          </p>
        </div>
      )}

      {/* Eye detail modal */}
      {selectedEye && (
        <EyeDetailModal
          eye={selectedEye}
          onClose={() => setSelectedEye(null)}
        />
      )}
    </div>
  );
}
