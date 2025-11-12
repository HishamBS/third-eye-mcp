/**
 * REPAIR_PLAN A7.4: Policy Preview with Sample Routing
 *
 * Shows how a policy would route a sample task
 * - Displays eye flow based on policy constraints
 * - Shows which eyes are mandatory vs optional
 * - Previews validation thresholds
 */

import { useState } from 'react';
import type { RoutingPolicy } from '@/hooks/useRoutingModes';

const SAMPLE_TASKS = [
  { id: 'code', label: 'Code Review', description: 'Review a pull request' },
  { id: 'security', label: 'Security Audit', description: 'Audit code for vulnerabilities' },
  { id: 'research', label: 'Research Article', description: 'Write a research article' },
  { id: 'question', label: 'Quick Question', description: 'Answer a simple question' },
] as const;

const ALL_EYES = [
  'overseer',
  'sharingan',
  'kyuubi',
  'jogan',
  'rinnegan',
  'mangekyo',
  'tenseigan',
  'byakugan',
] as const;

interface PolicyPreviewProps {
  policy: RoutingPolicy;
}

export function PolicyPreview({ policy }: PolicyPreviewProps) {
  const [selectedTask, setSelectedTask] = useState<string>(SAMPLE_TASKS[0].id);
  const [showPreview, setShowPreview] = useState(false);

  // Simulate routing based on policy
  const getSimulatedRoute = (): {
    mandatory: string[];
    optional: string[];
    forbidden: string[];
    warnings: string[];
  } => {
    const mandatory = [...policy.mandatoryEyes];
    const forbidden = policy.forbiddenEyes || [];
    const optional = ALL_EYES.filter(
      (eye) => !mandatory.includes(eye) && !forbidden.includes(eye)
    );

    const warnings: string[] = [];

    // Check validation threshold
    if (policy.minValidationEyes && mandatory.length < policy.minValidationEyes) {
      warnings.push(
        `Warning: Only ${mandatory.length} mandatory eyes, but ${policy.minValidationEyes} validation eyes required`
      );
    }

    // Check security requirement
    if (policy.securityRequired) {
      const securityEyes = ['rinnegan', 'tenseigan', 'mangekyo', 'byakugan'];
      const hasSecurityEye = mandatory.some((eye) => securityEyes.includes(eye));
      if (!hasSecurityEye) {
        warnings.push('Warning: Security required but no security-focused eyes are mandatory');
      }
    }

    // Intent confirmation
    if (policy.alwaysConfirmIntent) {
      warnings.push('Note: Intent confirmation will be required before execution');
    }

    return {
      mandatory,
      optional,
      forbidden,
      warnings,
    };
  };

  const route = getSimulatedRoute();

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Policy Preview: Sample Routing
        </h4>
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {showPreview && (
        <div className="space-y-4">
          {/* Task Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sample Task Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SAMPLE_TASKS.map((task) => (
                <button
                  key={task.id}
                  onClick={() => setSelectedTask(task.id)}
                  className={`p-2 text-left rounded-md border text-xs ${
                    selectedTask === task.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-200'
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">{task.label}</div>
                  <div className="text-gray-500 dark:text-gray-400">{task.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Routing Visualization */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-3">
              Predicted Pipeline Flow
            </div>

            {/* Mandatory Eyes */}
            {route.mandatory.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
                  Mandatory Eyes (will always run)
                </div>
                <div className="flex flex-wrap gap-2">
                  {route.mandatory.map((eye, idx) => (
                    <div key={eye} className="flex items-center space-x-1">
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                        {idx + 1}. {eye}
                      </span>
                      {idx < route.mandatory.length - 1 && (
                        <span className="text-gray-400">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Eyes */}
            {route.optional.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                  Optional Eyes (may be selected dynamically)
                </div>
                <div className="flex flex-wrap gap-2">
                  {route.optional.map((eye) => (
                    <span
                      key={eye}
                      className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded text-xs"
                    >
                      {eye}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Forbidden Eyes */}
            {route.forbidden.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                  Forbidden Eyes (will never run)
                </div>
                <div className="flex flex-wrap gap-2">
                  {route.forbidden.map((eye) => (
                    <span
                      key={eye}
                      className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded text-xs line-through"
                    >
                      {eye}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {route.warnings.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                  ⚠️ Policy Validation
                </div>
                <ul className="space-y-1">
                  {route.warnings.map((warning, idx) => (
                    <li key={idx} className="text-xs text-amber-700 dark:text-amber-300">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Policy Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md">
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Min Eyes</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {policy.minValidationEyes || 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Security</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {policy.securityRequired ? '✓ Required' : '✗ Optional'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Intent Check</div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {policy.alwaysConfirmIntent ? '✓ Always' : '✗ Auto'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
