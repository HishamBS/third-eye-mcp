'use client';

import { useState, useEffect } from 'react';
import type { Node } from 'reactflow';
import { GlassCard } from '../ui/GlassCard';

interface PropertyPanelProps {
  selectedNode: Node | null;
  onUpdateNode: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

interface Eye {
  id: string;
  name: string;
  description?: string;
}

interface StrictnessProfile {
  id: string;
  name: string;
  description?: string;
}

interface ProviderModel {
  id: string;
  name: string;
  provider: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070';

const VERDICT_OPTIONS = [
  { value: 'OK', label: 'OK' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'NEEDS_CLARIFICATION', label: 'Needs Clarification' },
  { value: 'NEEDS_REVISION', label: 'Needs Revision' },
  { value: 'AWAIT_CONFIRMATION', label: 'Await Confirmation' },
  { value: 'AWAIT_INPUT', label: 'Await Input' },
  { value: 'AWAIT_AGENT_PLAN', label: 'Await Agent Plan' },
  { value: 'FINAL_REVIEW_FAILED', label: 'Final Review Failed' },
  { value: 'END', label: 'End' },
];

const PROVIDER_OPTIONS = [
  { value: 'groq', label: 'Groq' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'gemini', label: 'Google Gemini' },
];

export function PropertyPanel({ selectedNode, onUpdateNode, onClose }: PropertyPanelProps) {
  const [eyes, setEyes] = useState<Eye[]>([]);
  const [strictnessProfiles, setStrictnessProfiles] = useState<StrictnessProfile[]>([]);
  const [models, setModels] = useState<ProviderModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // Load eyes
  useEffect(() => {
    const fetchEyes = async () => {
      try {
        const response = await fetch(`${API_URL}/api/eyes/all`);
        if (response.ok) {
          const data = await response.json();
          setEyes(data.eyes || []);
        }
      } catch (error) {
        console.error('Failed to fetch eyes:', error);
      }
    };
    fetchEyes();
  }, []);

  // Load strictness profiles
  useEffect(() => {
    const fetchStrictness = async () => {
      try {
        const response = await fetch(`${API_URL}/api/strictness`);
        if (response.ok) {
          const data = await response.json();
          // Handle both array and object responses
          if (Array.isArray(data)) {
            setStrictnessProfiles(data);
          } else if (Array.isArray(data.profiles)) {
            setStrictnessProfiles(data.profiles);
          } else if (typeof data === 'object' && data !== null) {
            // Convert object to array (STRICTNESS_PRESETS format)
            const profilesArray = Object.entries(data).map(([id, profile]: [string, any]) => ({
              id,
              name: profile.name || id,
              description: profile.description,
            }));
            setStrictnessProfiles(profilesArray);
          } else {
            setStrictnessProfiles([]);
          }
        }
      } catch (error) {
        console.error('Failed to fetch strictness profiles:', error);
        setStrictnessProfiles([]);
      }
    };
    fetchStrictness();
  }, []);

  // Load models when provider changes
  useEffect(() => {
    if (!selectedProvider) return;

    const fetchModels = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/models/${selectedProvider}`);
        if (response.ok) {
          const data = await response.json();
          setModels(data || []);
        }
      } catch (error) {
        console.error(`Failed to fetch models for ${selectedProvider}:`, error);
      } finally {
        setLoading(false);
      }
    };
    fetchModels();
  }, [selectedProvider]);

  if (!selectedNode) {
    return (
      <div className="w-80 border-l border-brand-outline/50 bg-brand-paper p-6">
        <div className="text-center text-slate-400">
          <p className="text-sm">Select a node to edit its properties</p>
        </div>
      </div>
    );
  }

  const nodeType = selectedNode.data?.type || 'Eye';
  const nodeData = selectedNode.data || {};

  const handleFieldChange = (field: string, value: unknown) => {
    onUpdateNode(selectedNode.id, {
      ...nodeData,
      [field]: value,
    });
  };

  const renderEyeProperties = () => (
    <div className="space-y-6">
      {/* Eye Selector */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Eye
        </label>
        <select
          value={nodeData.eyeId || ''}
          onChange={(e) => handleFieldChange('eyeId', e.target.value)}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none"
        >
          <option value="">Select Eye...</option>
          {eyes.map((eye) => (
            <option key={eye.id} value={eye.id}>
              {eye.name}
            </option>
          ))}
        </select>
        {nodeData.eyeId && eyes.find(e => e.id === nodeData.eyeId)?.description && (
          <p className="mt-1 text-xs text-slate-400">
            {eyes.find(e => e.id === nodeData.eyeId)?.description}
          </p>
        )}
      </div>

      {/* Provider Override */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Provider Override
        </label>
        <select
          value={nodeData.providerOverride?.provider || ''}
          onChange={(e) => {
            setSelectedProvider(e.target.value);
            handleFieldChange('providerOverride', e.target.value ? { provider: e.target.value, model: '' } : null);
          }}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none"
        >
          <option value="">Use Default</option>
          {PROVIDER_OPTIONS.map((provider) => (
            <option key={provider.value} value={provider.value}>
              {provider.label}
            </option>
          ))}
        </select>
      </div>

      {/* Model Override */}
      {nodeData.providerOverride?.provider && (
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Model Override
          </label>
          {loading ? (
            <div className="text-sm text-slate-400">Loading models...</div>
          ) : (
            <select
              value={nodeData.providerOverride?.model || ''}
              onChange={(e) =>
                handleFieldChange('providerOverride', {
                  ...nodeData.providerOverride,
                  model: e.target.value,
                })
              }
              className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none"
            >
              <option value="">Select Model...</option>
              {models.map((model) => (
                <option key={model.id || model.name} value={model.name}>
                  {model.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Strictness Override */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Strictness Override
        </label>
        <select
          value={nodeData.strictnessOverride || ''}
          onChange={(e) => handleFieldChange('strictnessOverride', e.target.value || null)}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none"
        >
          <option value="">Use Default</option>
          {strictnessProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
        {nodeData.strictnessOverride && strictnessProfiles.find(p => p.id === nodeData.strictnessOverride)?.description && (
          <p className="mt-1 text-xs text-slate-400">
            {strictnessProfiles.find(p => p.id === nodeData.strictnessOverride)?.description}
          </p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Notes
        </label>
        <textarea
          value={nodeData.notesMd || ''}
          onChange={(e) => handleFieldChange('notesMd', e.target.value)}
          placeholder="Add notes or description for this node..."
          rows={4}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none resize-none"
        />
      </div>
    </div>
  );

  const renderConditionProperties = () => (
    <div className="space-y-6">
      {/* Expression Editor */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Condition Expression
        </label>
        <textarea
          value={nodeData.expression || ''}
          onChange={(e) => handleFieldChange('expression', e.target.value)}
          placeholder="e.g., last.verdict === 'APPROVED'"
          rows={4}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white font-mono text-sm focus:border-brand-accent focus:outline-none resize-none"
        />
        <p className="mt-2 text-xs text-slate-400">
          Supported operators: ===, !==, {'>'}, {'<'}, {'>='}, {'<='}
          <br />
          Methods: .includes(), .startsWith()
          <br />
          Examples:
          <br />
          • last.verdict === &apos;APPROVED&apos;
          <br />
          • last.output.score {'>'} 0.8
          <br />
          • last.output.text.includes(&apos;success&apos;)
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Notes
        </label>
        <textarea
          value={nodeData.notesMd || ''}
          onChange={(e) => handleFieldChange('notesMd', e.target.value)}
          placeholder="Add notes or description..."
          rows={3}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none resize-none"
        />
      </div>
    </div>
  );

  const renderUserInputProperties = () => (
    <div className="space-y-6">
      {/* Prompt Key */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Prompt Key
        </label>
        <input
          type="text"
          value={nodeData.promptKey || ''}
          onChange={(e) => handleFieldChange('promptKey', e.target.value)}
          placeholder="e.g., user_confirmation, clarification_needed"
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none"
        />
        <p className="mt-2 text-xs text-slate-400">
          Key used to identify this user input step when resuming the pipeline
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Notes
        </label>
        <textarea
          value={nodeData.notesMd || ''}
          onChange={(e) => handleFieldChange('notesMd', e.target.value)}
          placeholder="Describe what input is needed..."
          rows={4}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none resize-none"
        />
      </div>
    </div>
  );

  const renderTerminalProperties = () => (
    <div className="space-y-6">
      {/* Verdict Selector */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Final Verdict
        </label>
        <select
          value={nodeData.verdict || 'OK'}
          onChange={(e) => handleFieldChange('verdict', e.target.value)}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none"
        >
          {VERDICT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-400">
          The final verdict returned when the pipeline reaches this terminal node
        </p>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Notes
        </label>
        <textarea
          value={nodeData.notesMd || ''}
          onChange={(e) => handleFieldChange('notesMd', e.target.value)}
          placeholder="Describe what this outcome means..."
          rows={4}
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none resize-none"
        />
      </div>
    </div>
  );

  return (
    <div className="w-80 border-l border-brand-outline/50 bg-brand-paper p-6 overflow-y-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Node Properties</h3>
          <p className="text-sm text-slate-400">{nodeType} Node</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 hover:bg-brand-outline/20 transition-colors"
          aria-label="Close properties panel"
        >
          <svg
            className="h-5 w-5 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Node Label */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Label
        </label>
        <input
          type="text"
          value={nodeData.label || ''}
          onChange={(e) => handleFieldChange('label', e.target.value)}
          placeholder="Node label..."
          className="w-full rounded-lg border border-brand-outline/50 bg-brand-ink px-3 py-2 text-white focus:border-brand-accent focus:outline-none"
        />
      </div>

      {/* Type-specific properties */}
      {nodeType === 'Eye' && renderEyeProperties()}
      {nodeType === 'Condition' && renderConditionProperties()}
      {nodeType === 'UserInput' && renderUserInputProperties()}
      {nodeType === 'Terminal' && renderTerminalProperties()}

      {/* Node ID (read-only) */}
      <div className="mt-6 pt-6 border-t border-brand-outline/50">
        <label className="block text-sm font-medium text-slate-400 mb-1">
          Node ID
        </label>
        <code className="block text-xs text-slate-500 bg-brand-ink rounded px-2 py-1 font-mono">
          {selectedNode.id}
        </code>
      </div>
    </div>
  );
}
