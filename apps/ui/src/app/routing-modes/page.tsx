'use client';

/**
 * Routing Modes Management Page - Phase 3
 *
 * Manages policies and templates for three routing modes:
 * - Fully Dynamic (default)
 * - Constrained Dynamic (policies)
 * - Fixed Template (templates)
 */

import { useState } from 'react';
import {
  usePolicies,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
  useActivatePolicy,
  useDeactivatePolicy,
  useTestPolicy,
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  type RoutingPolicy,
  type PipelineTemplate,
  type CreatePolicyRequest,
  type CreateTemplateRequest,
} from '@/hooks/useRoutingModes';
import { PolicyBuilderEnhanced } from '@/components/routing-modes/PolicyBuilderEnhanced';
import { TemplateImportExport, TemplateExportButton } from '@/components/routing-modes/TemplateImportExport';
import { PolicyPreview } from '@/components/routing-modes/PolicyPreview';

type Tab = 'policies' | 'templates';

export default function RoutingModesPage() {
  const [activeTab, setActiveTab] = useState<Tab>('policies');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Routing Modes
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Configure routing policies and pipeline templates for constrained and fixed routing modes.
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('policies')}
              className={`${
                activeTab === 'policies'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Routing Policies
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`${
                activeTab === 'templates'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Pipeline Templates
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'policies' && <PoliciesTab />}
        {activeTab === 'templates' && <TemplatesTab />}
      </div>
    </div>
  );
}

function PoliciesTab() {
  const { policies, loading, error, refetch } = usePolicies({ active: true });
  const { createPolicy } = useCreatePolicy();
  const { updatePolicy } = useUpdatePolicy();
  const { deletePolicy } = useDeletePolicy();
  const { activatePolicy } = useActivatePolicy();
  const { deactivatePolicy } = useDeactivatePolicy();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<RoutingPolicy | null>(null);

  const handleCreate = async (request: CreatePolicyRequest) => {
    try {
      await createPolicy(request);
      setShowCreateForm(false);
      refetch();
    } catch (err) {
      console.error('Failed to create policy:', err);
    }
  };

  const handleUpdate = async (policyId: string, request: CreatePolicyRequest) => {
    try {
      await updatePolicy(policyId, request);
      setEditingPolicy(null);
      refetch();
    } catch (err) {
      console.error('Failed to update policy:', err);
    }
  };

  const handleDelete = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await deletePolicy(policyId);
      refetch();
    } catch (err) {
      console.error('Failed to delete policy:', err);
    }
  };

  const handleToggleActive = async (policy: RoutingPolicy) => {
    try {
      if (policy.isActive) {
        await deactivatePolicy(policy.id);
      } else {
        await activatePolicy(policy.id);
      }
      refetch();
    } catch (err) {
      console.error('Failed to toggle policy:', err);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading policies...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div>
      {/* Create Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create New Policy
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingPolicy) && (
        <PolicyBuilderEnhanced
          policy={editingPolicy || undefined}
          onSubmit={editingPolicy ? (req) => handleUpdate(editingPolicy.id, req) : handleCreate}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingPolicy(null);
          }}
        />
      )}

      {/* Policies List */}
      {policies.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No policies yet. Create your first policy to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onEdit={() => setEditingPolicy(policy)}
              onDelete={() => handleDelete(policy.id)}
              onToggleActive={() => handleToggleActive(policy)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PolicyCard({
  policy,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  policy: RoutingPolicy;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{policy.name}</h3>
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                policy.isActive
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}
            >
              {policy.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {policy.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{policy.description}</p>
          )}
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Mandatory Eyes: </span>
              <span className="text-gray-600 dark:text-gray-400">{policy.mandatoryEyes.join(', ')}</span>
            </div>
            {policy.securityRequired && (
              <div className="text-amber-600 dark:text-amber-400">🔒 Security validation required</div>
            )}
            {policy.alwaysConfirmIntent && (
              <div className="text-blue-600 dark:text-blue-400">✓ Intent confirmation required</div>
            )}
          </div>

          {/* Policy Preview - A7.4 */}
          <div className="mt-4">
            <PolicyPreview policy={policy} />
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <button
            onClick={onEdit}
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            Edit
          </button>
          <button
            onClick={onToggleActive}
            className="text-sm text-gray-600 hover:text-gray-700 dark:text-gray-400"
          >
            {policy.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplatesTab() {
  const { templates, loading, error, refetch } = useTemplates({ public: true });
  const { createTemplate } = useCreateTemplate();
  const { deleteTemplate } = useDeleteTemplate();
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleCreate = async (request: CreateTemplateRequest) => {
    try {
      await createTemplate(request);
      setShowCreateForm(false);
      refetch();
    } catch (err) {
      console.error('Failed to create template:', err);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate(templateId);
      refetch();
    } catch (err) {
      console.error('Failed to delete template:', err);
    }
  };

  const handleBatchImport = async (importedTemplates: PipelineTemplate[]) => {
    try {
      for (const template of importedTemplates) {
        await createTemplate({
          name: template.name,
          description: template.description,
          eyes: template.eyes,
          strict: template.strict,
          autoTriggerPattern: template.autoTriggerPattern,
          isPublic: template.isPublic,
        });
      }
      refetch();
    } catch (err) {
      console.error('Failed to import templates:', err);
      throw err;
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading templates...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div>
      {/* Create Button & Import/Export - A7.3 */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create New Template
        </button>
        <TemplateImportExport templates={templates} onImport={handleBatchImport} />
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <TemplateForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* Templates List */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No templates yet. Create your first template to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onDelete={() => handleDelete(template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (request: CreateTemplateRequest) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [eyes, setEyes] = useState<string[]>([]);
  const [autoTriggerPattern, setAutoTriggerPattern] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [strict, setStrict] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || eyes.length === 0) {
      alert('Name and at least one eye are required');
      return;
    }
    onSubmit({
      name,
      description: description || undefined,
      eyes,
      strict,
      autoTriggerPattern: autoTriggerPattern || undefined,
      isPublic,
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
        Create New Template
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Eye Sequence * (comma-separated, in order)
          </label>
          <input
            type="text"
            value={eyes.join(', ')}
            onChange={(e) => setEyes(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            placeholder="Sharingan, Byakugan, Mangekyo"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            required
          />
          <p className="mt-1 text-xs text-gray-500">Enter eyes in execution order, separated by commas</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Auto-Trigger Pattern (regex, optional)
          </label>
          <input
            type="text"
            value={autoTriggerPattern}
            onChange={(e) => setAutoTriggerPattern(e.target.value)}
            placeholder="review.*code"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500">Regex pattern to auto-select this template</p>
        </div>

        <div className="flex items-center space-x-6">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={strict}
              onChange={(e) => setStrict(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Strict Mode</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Public Template</span>
          </label>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Create Template
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

function TemplateCard({
  template,
  onDelete,
}: {
  template: PipelineTemplate;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{template.name}</h3>
            {template.isPublic && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                Public
              </span>
            )}
            <span className="text-xs text-gray-500">
              Used {template.usageCount} times
            </span>
          </div>
          {template.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{template.description}</p>
          )}
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Eye Sequence: </span>
              <span className="text-gray-600 dark:text-gray-400">{template.eyes.join(' → ')}</span>
            </div>
            {template.autoTriggerPattern && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Auto-Trigger: </span>
                <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                  {template.autoTriggerPattern}
                </code>
              </div>
            )}
            {template.strict && (
              <div className="text-amber-600 dark:text-amber-400">⚠️ Strict mode (exact sequence required)</div>
            )}
          </div>
        </div>
        <div className="flex flex-col space-y-2">
          <TemplateExportButton template={template} />
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
