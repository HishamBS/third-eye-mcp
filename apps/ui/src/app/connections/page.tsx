'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, ExternalLink, ChevronDown, ChevronUp, Plus, Edit, Trash2, X } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useDialog } from '@/hooks/useDialog';

interface McpIntegration {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  status: string;
  platforms: string[];
  configType: string;
  configFiles: Array<{ platform: string; path: string }>;
  configTemplate: string;
  setupSteps: Array<{ title: string; description: string; code: string | null }>;
  docsUrl: string | null;
  enabled: boolean;
  displayOrder: number;
}

interface IntegrationFormData {
  name: string;
  slug: string;
  logoUrl: string;
  description: string;
  status: string;
  platforms: string[];
  configType: string;
  configFiles: string; // JSON string
  configTemplate: string;
  setupSteps: string; // JSON string
  docsUrl: string;
  enabled: boolean;
  displayOrder: number;
}

interface IntegrationConfigResponse {
  config: string;
  configType: string;
  configFiles: Array<{ platform: string; path: string }>;
  paths: {
    HOME: string;
    MCP_PATH: string;
    CLI_BIN: string;
    CLI_EXEC: string;
    CLI_SERVER: string;
    PLATFORM: string;
    USER: string;
  };
}

const emptyFormData: IntegrationFormData = {
  name: '',
  slug: '',
  logoUrl: '',
  description: '',
  status: 'community',
  platforms: ['macos', 'windows', 'linux'],
  configType: 'json',
  configFiles: JSON.stringify([{ platform: 'macos', path: '' }], null, 2),
  configTemplate: '',
  setupSteps: JSON.stringify([{ title: '', description: '', code: null }], null, 2),
  docsUrl: '',
  enabled: true,
  displayOrder: 0,
};

export default function ConnectionsPage() {
  const dialog = useDialog();
  const [integrations, setIntegrations] = useState<McpIntegration[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<Record<string, IntegrationConfigResponse>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<McpIntegration | null>(null);
  const [formData, setFormData] = useState<IntegrationFormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/integrations?enabled=true`);
      if (!response.ok) throw new Error('Failed to fetch integrations');
      const data = await response.json();
      setIntegrations(data.data?.integrations || []);
    } catch (err) {
      console.error('Error fetching integrations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async (integrationId: string) => {
    if (configs[integrationId]) return; // Already fetched

    try {
      const response = await fetch(`${API_URL}/api/integrations/${integrationId}/config`);
      if (!response.ok) throw new Error('Failed to fetch config');
      const result = await response.json();
      setConfigs((prev) => ({ ...prev, [integrationId]: result.data }));
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpandedId = expandedId === id ? null : id;
    setExpandedId(newExpandedId);
    if (newExpandedId) {
      fetchConfig(newExpandedId);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      macos: 'macOS',
      windows: 'Windows',
      linux: 'Linux',
    };
    return labels[platform] || platform;
  };

  // Modal handlers
  const openCreateModal = () => {
    setEditingIntegration(null);
    setFormData(emptyFormData);
    setFormErrors({});
    setShowModal(true);
  };

  const openEditModal = (integration: McpIntegration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      slug: integration.slug,
      logoUrl: integration.logoUrl || '',
      description: integration.description || '',
      status: integration.status,
      platforms: integration.platforms,
      configType: integration.configType,
      configFiles: JSON.stringify(integration.configFiles, null, 2),
      configTemplate: integration.configTemplate,
      setupSteps: JSON.stringify(integration.setupSteps, null, 2),
      docsUrl: integration.docsUrl || '',
      enabled: integration.enabled,
      displayOrder: integration.displayOrder,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIntegration(null);
    setFormData(emptyFormData);
    setFormErrors({});
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = 'Name is required';
    if (!formData.slug.trim()) errors.slug = 'Slug is required';
    if (!formData.configTemplate.trim()) errors.configTemplate = 'Configuration template is required';

    // Validate JSON fields
    try {
      JSON.parse(formData.configFiles);
    } catch (e) {
      errors.configFiles = 'Invalid JSON format';
    }

    try {
      JSON.parse(formData.setupSteps);
    } catch (e) {
      errors.setupSteps = 'Invalid JSON format';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // CRUD operations
  const handleCreate = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const payload = {
        ...formData,
        logoUrl: formData.logoUrl || null,
        description: formData.description || null,
        docsUrl: formData.docsUrl || null,
        configFiles: JSON.parse(formData.configFiles),
        setupSteps: JSON.parse(formData.setupSteps),
      };

      const response = await fetch(`${API_URL}/api/integrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to create integration');

      setSuccess('Integration created successfully');
      closeModal();
      await fetchIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create integration');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingIntegration || !validateForm()) return;

    try {
      setLoading(true);
      const payload = {
        ...formData,
        logoUrl: formData.logoUrl || null,
        description: formData.description || null,
        docsUrl: formData.docsUrl || null,
        configFiles: JSON.parse(formData.configFiles),
        setupSteps: JSON.parse(formData.setupSteps),
      };

      const response = await fetch(`${API_URL}/api/integrations/${editingIntegration.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to update integration');

      setSuccess('Integration updated successfully');
      closeModal();
      await fetchIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update integration');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (integration: McpIntegration) => {
    const confirmed = await dialog.confirm(
      'Delete Integration',
      `Are you sure you want to delete "${integration.name}"? This action cannot be undone.`,
      'Delete',
      'Cancel'
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/integrations/${integration.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete integration');

      setSuccess('Integration deleted successfully');
      await fetchIntegrations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete integration');
    } finally {
      setLoading(false);
    }
  };

  // Auto-dismiss notifications
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">MCP Connection Guides</h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-brand-accent/30 bg-brand-paper rounded-lg p-6 animate-pulse">
                <div className="h-6 bg-brand-accent/20 rounded w-1/4 mb-4"></div>
                <div className="h-4 bg-brand-accent/10 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">MCP Connection Guides</h1>
          <div className="border border-red-500/50 bg-red-500/10 rounded-lg p-6">
            <p className="text-red-400">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Notifications */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-400"
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-xl border border-green-500/50 bg-green-500/10 p-4 text-green-400"
          >
            {success}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-white">MCP Connection Guides</h1>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
            >
              <Plus className="w-4 h-4" />
              Add Integration
            </button>
          </div>
          <p className="text-slate-400 mb-8">
            Connect Third Eye MCP to your favorite AI tools. Click an integration to view setup instructions.
          </p>
        </motion.div>

        <div className="space-y-4">
          {integrations.map((integration, index) => {
            const isExpanded = expandedId === integration.id;
            const config = configs[integration.id];

            return (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <GlassCard className="overflow-hidden">
                  {/* Header */}
                  <button
                    onClick={() => toggleExpanded(integration.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-brand-accent/5 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {integration.logoUrl ? (
                        <img
                          src={integration.logoUrl}
                          alt={integration.name}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            // Fallback to initials if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-brand-accent text-white flex items-center justify-center font-bold">
                          {integration.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-white">{integration.name}</h3>
                        <p className="text-sm text-slate-400">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(integration);
                        }}
                        className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                        title="Edit integration"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(integration);
                        }}
                        className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                        title="Delete integration"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex gap-2">
                        {integration.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="px-2 py-1 text-xs bg-brand-accent/20 text-brand-accent rounded"
                          >
                            {getPlatformLabel(platform)}
                          </span>
                        ))}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-brand-accent/20 bg-brand-paperElev/30"
                    >
                      <div className="px-6 py-4 space-y-6">
                        {/* Configuration File Path */}
                        <div>
                          <h4 className="font-semibold text-white mb-2">Configuration File</h4>
                          {integration.configFiles.map((file) => (
                            <div key={file.platform} className="text-sm">
                              <span className="font-mono bg-brand-accent/10 text-brand-accent px-2 py-1 rounded">
                                {file.path}
                              </span>
                              <span className="text-slate-400 ml-2">({getPlatformLabel(file.platform)})</span>
                            </div>
                          ))}
                        </div>

                        {/* Configuration Snippet */}
                        {config && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-white">Configuration</h4>
                              <button
                                onClick={() => copyToClipboard(config.config, integration.id)}
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-brand-accent text-white rounded hover:bg-brand-accent/80 transition-colors"
                              >
                                {copiedId === integration.id ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    Copy Config
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-brand-ink text-slate-300 p-4 rounded overflow-x-auto text-sm border border-brand-accent/20">
                              {config.config}
                            </pre>
                          </div>
                        )}

                        {/* Setup Steps */}
                        {integration.setupSteps.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-white mb-3">Setup Instructions</h4>
                            <ol className="space-y-3">
                              {integration.setupSteps.map((step, idx) => (
                                <li key={idx} className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent text-white text-sm flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <p className="font-medium text-white">{step.title}</p>
                                    <p className="text-sm text-slate-400">{step.description}</p>
                                  </div>
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Documentation Link */}
                        {integration.docsUrl && (
                          <div>
                            <a
                              href={integration.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-brand-accent hover:text-brand-accent/80"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Official Documentation
                            </a>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {integrations.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            No integrations available. Please check your server configuration.
          </div>
        )}

        {/* Create/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              />

              {/* Modal */}
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  className="w-full max-w-3xl my-8 rounded-2xl border border-brand-outline/60 bg-brand-paperElev shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between border-b border-brand-outline/50 px-6 py-4">
                    <h2 className="text-xl font-semibold text-white">
                      {editingIntegration ? 'Edit Integration' : 'Add Integration'}
                    </h2>
                    <button
                      onClick={closeModal}
                      className="text-slate-400 hover:text-white transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Name <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                          placeholder="e.g., Claude Desktop"
                        />
                        {formErrors.name && (
                          <p className="mt-1 text-xs text-red-400">{formErrors.name}</p>
                        )}
                      </div>

                      {/* Slug */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Slug <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                          placeholder="e.g., claude-desktop"
                        />
                        {formErrors.slug && (
                          <p className="mt-1 text-xs text-red-400">{formErrors.slug}</p>
                        )}
                      </div>

                      {/* Logo URL */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Logo URL
                        </label>
                        <input
                          type="text"
                          value={formData.logoUrl}
                          onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                          placeholder="https://..."
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none resize-none"
                          placeholder="Brief description of the integration..."
                          rows={2}
                        />
                      </div>

                      {/* Config Type */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Config Type
                        </label>
                        <select
                          value={formData.configType}
                          onChange={(e) => setFormData({ ...formData, configType: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white focus:border-brand-accent focus:outline-none"
                        >
                          <option value="json">JSON</option>
                          <option value="toml">TOML</option>
                          <option value="yaml">YAML</option>
                        </select>
                      </div>

                      {/* Config Files (JSON) */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Config Files (JSON Array)
                        </label>
                        <textarea
                          value={formData.configFiles}
                          onChange={(e) => setFormData({ ...formData, configFiles: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 font-mono text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none resize-none"
                          placeholder='[{"platform": "macos", "path": "~/Library/..."}]'
                          rows={3}
                        />
                        {formErrors.configFiles && (
                          <p className="mt-1 text-xs text-red-400">{formErrors.configFiles}</p>
                        )}
                      </div>

                      {/* Config Template */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Config Template <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          value={formData.configTemplate}
                          onChange={(e) => setFormData({ ...formData, configTemplate: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 font-mono text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none resize-none"
                          placeholder="Configuration template with placeholders like {{HOME}}..."
                          rows={6}
                        />
                        {formErrors.configTemplate && (
                          <p className="mt-1 text-xs text-red-400">{formErrors.configTemplate}</p>
                        )}
                      </div>

                      {/* Setup Steps (JSON) */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Setup Steps (JSON Array)
                        </label>
                        <textarea
                          value={formData.setupSteps}
                          onChange={(e) => setFormData({ ...formData, setupSteps: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 font-mono text-sm text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none resize-none"
                          placeholder='[{"title": "Step 1", "description": "...", "code": null}]'
                          rows={4}
                        />
                        {formErrors.setupSteps && (
                          <p className="mt-1 text-xs text-red-400">{formErrors.setupSteps}</p>
                        )}
                      </div>

                      {/* Docs URL */}
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          Documentation URL
                        </label>
                        <input
                          type="text"
                          value={formData.docsUrl}
                          onChange={(e) => setFormData({ ...formData, docsUrl: e.target.value })}
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-white placeholder-slate-500 focus:border-brand-accent focus:outline-none"
                          placeholder="https://..."
                        />
                      </div>

                      {/* Enabled */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="enabled"
                          checked={formData.enabled}
                          onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                          className="w-4 h-4 rounded border-brand-outline/50 bg-brand-paper text-brand-accent focus:ring-brand-accent"
                        />
                        <label htmlFor="enabled" className="text-sm text-slate-300">
                          Enabled (visible to users)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 border-t border-brand-outline/50 px-6 py-4">
                    <button
                      onClick={closeModal}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-slate-300 transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={editingIntegration ? handleUpdate : handleCreate}
                      disabled={loading}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : editingIntegration ? 'Update' : 'Create'}
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
