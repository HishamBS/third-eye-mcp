/**
 * REPAIR_PLAN A7.1: Enhanced Policy Builder with Visual Selectors
 *
 * Visual constraint selectors instead of text input
 * - Checkbox selectors for mandatory/forbidden eyes
 * - Number input for validation thresholds
 * - Toggle switches for boolean constraints
 */

import { useState } from "react";
import type { CreatePolicyRequest } from "@/hooks/useRoutingModes";

const AVAILABLE_EYES = [
  { id: "overseer", name: "Overseer", description: "Orchestration & routing" },
  { id: "sharingan", name: "Sharingan", description: "Ambiguity detection" },
  { id: "kyuubi", name: "Kyuubi", description: "Scope questions" },
  { id: "jogan", name: "Jōgan", description: "Intent validation" },
  { id: "rinnegan", name: "Rinnegan", description: "Feasibility questions" },
  { id: "mangekyo", name: "Mangekyō", description: "Code review" },
  { id: "tenseigan", name: "Tenseigan", description: "Evidence validation" },
  { id: "byakugan", name: "Byakugan", description: "Final approval" },
] as const;

interface PolicyBuilderEnhancedProps {
  onSubmit: (request: CreatePolicyRequest) => void;
  onCancel: () => void;
  policy?: {
    name: string;
    description?: string;
    mandatoryEyes: string[];
    forbiddenEyes?: string[];
    minValidationEyes?: number;
    securityRequired: boolean;
    alwaysConfirmIntent: boolean;
  };
}

export function PolicyBuilderEnhanced({
  onSubmit,
  onCancel,
  policy,
}: PolicyBuilderEnhancedProps) {
  const [name, setName] = useState(policy?.name || "");
  const [description, setDescription] = useState(policy?.description || "");
  const [mandatoryEyes, setMandatoryEyes] = useState<Set<string>>(
    new Set(policy?.mandatoryEyes || []),
  );
  const [forbiddenEyes, setForbiddenEyes] = useState<Set<string>>(
    new Set(policy?.forbiddenEyes || []),
  );
  const [minValidationEyes, setMinValidationEyes] = useState(
    policy?.minValidationEyes || 2,
  );
  const [securityRequired, setSecurityRequired] = useState(
    policy?.securityRequired || false,
  );
  const [alwaysConfirmIntent, setAlwaysConfirmIntent] = useState(
    policy?.alwaysConfirmIntent || false,
  );

  const toggleMandatoryEye = (eyeId: string) => {
    const newSet = new Set(mandatoryEyes);
    if (newSet.has(eyeId)) {
      newSet.delete(eyeId);
    } else {
      newSet.add(eyeId);
      // Remove from forbidden if adding to mandatory
      if (forbiddenEyes.has(eyeId)) {
        const newForbidden = new Set(forbiddenEyes);
        newForbidden.delete(eyeId);
        setForbiddenEyes(newForbidden);
      }
    }
    setMandatoryEyes(newSet);
  };

  const toggleForbiddenEye = (eyeId: string) => {
    const newSet = new Set(forbiddenEyes);
    if (newSet.has(eyeId)) {
      newSet.delete(eyeId);
    } else {
      newSet.add(eyeId);
      // Remove from mandatory if adding to forbidden
      if (mandatoryEyes.has(eyeId)) {
        const newMandatory = new Set(mandatoryEyes);
        newMandatory.delete(eyeId);
        setMandatoryEyes(newMandatory);
      }
    }
    setForbiddenEyes(newSet);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || mandatoryEyes.size === 0) {
      alert("Name and at least one mandatory eye are required");
      return;
    }
    onSubmit({
      name,
      description: description || undefined,
      mandatoryEyes: Array.from(mandatoryEyes),
      forbiddenEyes:
        forbiddenEyes.size > 0 ? Array.from(forbiddenEyes) : undefined,
      minValidationEyes,
      securityRequired,
      alwaysConfirmIntent,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        {policy ? "Edit Policy" : "Create New Policy"}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Policy Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Security Review Policy"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe when this policy should be used"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        {/* REPAIR_PLAN A7.1: Visual Eye Selectors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Mandatory Eyes * (select at least one)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_EYES.map((eye) => (
              <label
                key={eye.id}
                className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  mandatoryEyes.has(eye.id)
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={mandatoryEyes.has(eye.id)}
                  onChange={() => toggleMandatoryEye(eye.id)}
                  className="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {eye.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {eye.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Forbidden Eyes (optional)
          </label>
          <div className="grid grid-cols-2 gap-3">
            {AVAILABLE_EYES.map((eye) => (
              <label
                key={eye.id}
                className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  forbiddenEyes.has(eye.id)
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                }`}
              >
                <input
                  type="checkbox"
                  checked={forbiddenEyes.has(eye.id)}
                  onChange={() => toggleForbiddenEye(eye.id)}
                  className="mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {eye.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {eye.description}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Numeric Constraints */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Minimum Validation Eyes
          </label>
          <input
            type="number"
            min={1}
            max={8}
            value={minValidationEyes}
            onChange={(e) => setMinValidationEyes(parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Minimum number of eyes that must validate the output
          </p>
        </div>

        {/* Boolean Constraints */}
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={securityRequired}
              onChange={(e) => setSecurityRequired(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Security Validation Required
              </span>
              <span className="block text-xs text-gray-500">
                Enforces security-focused eyes in the pipeline
              </span>
            </span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={alwaysConfirmIntent}
              onChange={(e) => setAlwaysConfirmIntent(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-3">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Always Confirm Intent
              </span>
              <span className="block text-xs text-gray-500">
                Requires human confirmation before execution
              </span>
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            {policy ? "Update" : "Create"} Policy
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-md text-sm font-medium"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
