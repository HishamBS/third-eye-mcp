"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { useDialog } from "@/hooks/useDialog";
import { UI_HELP_TEXT } from "@third-eye/constants";
import type { McpIntegration } from "@third-eye/types";
import { API_BASE_URL } from "@/consts/api";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { TIMING } from "@/constants/timing";

/**
 * UI-specific integration type. The API returns rich objects for configFiles
 * and setupSteps (structured JSON), whereas the shared McpIntegration DB type
 * stores them as flat string arrays. This extends the shared type with the
 * richer shapes the API actually delivers.
 */
interface ConnectionIntegration extends Omit<
  McpIntegration,
  "configFiles" | "setupSteps" | "enabled" | "displayOrder"
> {
  configFiles: Array<{ platform: string; path: string }>;
  setupSteps: Array<{
    title: string;
    description: string;
    code: string | null;
  }>;
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
  name: "",
  slug: "",
  logoUrl: "",
  description: "",
  status: "community",
  platforms: ["macos", "windows", "linux"],
  configType: "json",
  configFiles: JSON.stringify([{ platform: "macos", path: "" }], null, 2),
  configTemplate: "",
  setupSteps: JSON.stringify(
    [{ title: "", description: "", code: null }],
    null,
    2,
  ),
  docsUrl: "",
  enabled: true,
  displayOrder: 0,
};

export default function ConnectionsPage() {
  const dialog = useDialog();
  const [integrations, setIntegrations] = useState<ConnectionIntegration[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<
    Record<string, IntegrationConfigResponse>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingIntegration, setEditingIntegration] =
    useState<ConnectionIntegration | null>(null);
  const [formData, setFormData] = useState<IntegrationFormData>(emptyFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/integrations?enabled=true`,
      );
      if (!response.ok) throw new Error("Failed to fetch integrations");
      const data = await response.json();
      setIntegrations(data.data?.integrations || []);
    } catch (err) {
      console.error("Error fetching integrations:", err);
      setError(
        err instanceof Error
          ? err.message
          : UI_HELP_TEXT.CONNECTIONS_ERROR_LOAD_FAILED,
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchConfig = async (integrationId: string) => {
    if (configs[integrationId]) return; // Already fetched

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/integrations/${integrationId}/config`,
      );
      if (!response.ok) throw new Error("Failed to fetch config");
      const result = await response.json();
      setConfigs((prev) => ({ ...prev, [integrationId]: result.data }));
    } catch (err) {
      console.error("Error fetching config:", err);
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
      setTimeout(() => setCopiedId(null), TIMING.COPY_FEEDBACK_MS);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const getPlatformLabel = (platform: string) => {
    const labels: Record<string, string> = {
      macos: "macOS",
      windows: "Windows",
      linux: "Linux",
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

  const openEditModal = (integration: ConnectionIntegration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      slug: integration.slug,
      logoUrl: integration.logoUrl || "",
      description: integration.description || "",
      status: integration.status,
      platforms: integration.platforms,
      configType: integration.configType,
      configFiles: JSON.stringify(integration.configFiles, null, 2),
      configTemplate: integration.configTemplate,
      setupSteps: JSON.stringify(integration.setupSteps, null, 2),
      docsUrl: integration.docsUrl || "",
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

    if (!formData.name.trim())
      errors.name = UI_HELP_TEXT.CONNECTIONS_ERROR_NAME_REQUIRED;
    if (!formData.slug.trim())
      errors.slug = UI_HELP_TEXT.CONNECTIONS_ERROR_SLUG_REQUIRED;
    if (!formData.configTemplate.trim())
      errors.configTemplate = UI_HELP_TEXT.CONNECTIONS_ERROR_CONFIG_REQUIRED;

    // Validate JSON fields
    try {
      JSON.parse(formData.configFiles);
    } catch (e) {
      errors.configFiles = UI_HELP_TEXT.CONNECTIONS_ERROR_INVALID_JSON;
    }

    try {
      JSON.parse(formData.setupSteps);
    } catch (e) {
      errors.setupSteps = UI_HELP_TEXT.CONNECTIONS_ERROR_INVALID_JSON;
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

      const response = await fetch(`${API_BASE_URL}/api/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to create integration");

      setSuccess(UI_HELP_TEXT.CONNECTIONS_SUCCESS_CREATED);
      closeModal();
      await fetchIntegrations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : UI_HELP_TEXT.CONNECTIONS_ERROR_CREATE_FAILED,
      );
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

      const response = await fetch(
        `${API_BASE_URL}/api/integrations/${editingIntegration.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) throw new Error("Failed to update integration");

      setSuccess(UI_HELP_TEXT.CONNECTIONS_SUCCESS_UPDATED);
      closeModal();
      await fetchIntegrations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : UI_HELP_TEXT.CONNECTIONS_ERROR_UPDATE_FAILED,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (integration: ConnectionIntegration) => {
    const confirmed = await dialog.confirm(
      UI_HELP_TEXT.CONNECTIONS_DIALOG_DELETE_TITLE,
      UI_HELP_TEXT.CONNECTIONS_DIALOG_DELETE_MESSAGE.replace(
        "{name}",
        integration.name,
      ),
      UI_HELP_TEXT.CONNECTIONS_DIALOG_DELETE_CONFIRM,
      UI_HELP_TEXT.CONNECTIONS_DIALOG_DELETE_CANCEL,
    );

    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/integrations/${integration.id}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) throw new Error("Failed to delete integration");

      setSuccess(UI_HELP_TEXT.CONNECTIONS_SUCCESS_DELETED);
      await fetchIntegrations();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : UI_HELP_TEXT.CONNECTIONS_ERROR_DELETE_FAILED,
      );
    } finally {
      setLoading(false);
    }
  };

  // Auto-dismiss notifications
  useEffect(() => {
    if (error) {
      const timer = setTimeout(
        () => setError(null),
        TIMING.MESSAGE_AUTO_DISMISS_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(
        () => setSuccess(null),
        TIMING.MESSAGE_AUTO_DISMISS_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [success]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-brand-foreground mb-8">
            {UI_HELP_TEXT.CONNECTIONS_HEADER_TITLE}
          </h1>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="border border-brand-accent/30 bg-brand-paper rounded-lg p-6 animate-pulse"
              >
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
          <h1 className="text-3xl font-bold text-brand-foreground mb-8">
            {UI_HELP_TEXT.CONNECTIONS_HEADER_TITLE}
          </h1>
          <div
            className={`border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} rounded-lg p-6`}
          >
            <p className={STATUS_TEXT_COLORS.error}>
              {UI_HELP_TEXT.CONNECTIONS_ERROR_PREFIX}
              {error}
            </p>
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
            className={`mb-4 rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-4 ${STATUS_TEXT_COLORS.error}`}
          >
            {error}
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-4 rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} p-4 ${STATUS_TEXT_COLORS.success}`}
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
            <h1 className="text-3xl font-bold text-brand-foreground">
              {UI_HELP_TEXT.CONNECTIONS_HEADER_TITLE}
            </h1>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-full bg-brand-accent px-5 py-2.5 text-sm font-semibold text-brand-foreground transition hover:bg-brand-accent/90"
            >
              <Plus className="w-4 h-4" />
              {UI_HELP_TEXT.CONNECTIONS_BUTTON_ADD}
            </button>
          </div>
          <p className="text-semantic-muted mb-8">
            {UI_HELP_TEXT.CONNECTIONS_SUBTITLE}
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
                  <div
                    onClick={() => toggleExpanded(integration.id)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-brand-accent/5 transition-colors cursor-pointer"
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
                            target.style.display = "none";
                          }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-brand-accent text-brand-foreground flex items-center justify-center font-bold">
                          {integration.name.charAt(0)}
                        </div>
                      )}
                      <div className="text-left">
                        <h3 className="font-semibold text-lg text-brand-foreground">
                          {integration.name}
                        </h3>
                        <p className="text-sm text-semantic-muted">
                          {integration.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(integration);
                        }}
                        className={`p-2 ${STATUS_TEXT_COLORS.info} hover:${STATUS_BG_COLORS_SUBTLE.info} rounded-lg transition`}
                        title={UI_HELP_TEXT.CONNECTIONS_TOOLTIP_EDIT}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(integration);
                        }}
                        className={`p-2 ${STATUS_TEXT_COLORS.error} hover:${STATUS_BG_COLORS_SUBTLE.error} rounded-lg transition`}
                        title={UI_HELP_TEXT.CONNECTIONS_TOOLTIP_DELETE}
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
                        <ChevronUp className="w-5 h-5 text-semantic-muted" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-semantic-muted" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-brand-accent/20 bg-brand-paperElev/30"
                    >
                      <div className="px-6 py-4 space-y-6">
                        {/* Configuration File Path */}
                        <div>
                          <h4 className="font-semibold text-brand-foreground mb-2">
                            {UI_HELP_TEXT.CONNECTIONS_SECTION_CONFIG_FILE}
                          </h4>
                          {integration.configFiles.map((file) => (
                            <div key={file.platform} className="text-sm">
                              <span className="font-mono bg-brand-accent/10 text-brand-accent px-2 py-1 rounded">
                                {file.path}
                              </span>
                              <span className="text-semantic-muted ml-2">
                                ({getPlatformLabel(file.platform)})
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Configuration Snippet */}
                        {config && (
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-brand-foreground">
                                {UI_HELP_TEXT.CONNECTIONS_SECTION_CONFIGURATION}
                              </h4>
                              <button
                                onClick={() =>
                                  copyToClipboard(config.config, integration.id)
                                }
                                className="flex items-center gap-2 px-3 py-1 text-sm bg-brand-accent text-brand-foreground rounded hover:bg-brand-accent/80 transition-colors"
                              >
                                {copiedId === integration.id ? (
                                  <>
                                    <Check className="w-4 h-4" />
                                    {UI_HELP_TEXT.CONNECTIONS_BUTTON_COPIED}
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-4 h-4" />
                                    {
                                      UI_HELP_TEXT.CONNECTIONS_BUTTON_COPY_CONFIG
                                    }
                                  </>
                                )}
                              </button>
                            </div>
                            <pre className="bg-brand-ink text-semantic-muted p-4 rounded overflow-x-auto text-sm border border-brand-accent/20">
                              {config.config}
                            </pre>
                          </div>
                        )}

                        {/* Setup Steps */}
                        {integration.setupSteps.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-brand-foreground mb-3">
                              {UI_HELP_TEXT.CONNECTIONS_SECTION_SETUP}
                            </h4>
                            <ol className="space-y-3">
                              {integration.setupSteps.map((step, idx) => (
                                <li key={idx} className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-accent text-brand-foreground text-sm flex items-center justify-center">
                                    {idx + 1}
                                  </span>
                                  <div>
                                    <p className="font-medium text-brand-foreground">
                                      {step.title}
                                    </p>
                                    <p className="text-sm text-semantic-muted">
                                      {step.description}
                                    </p>
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
                              {UI_HELP_TEXT.CONNECTIONS_LINK_DOCS}
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
          <div className="text-center py-12 text-semantic-muted">
            {UI_HELP_TEXT.CONNECTIONS_EMPTY_MESSAGE}
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
                    <h2 className="text-xl font-semibold text-brand-foreground">
                      {editingIntegration
                        ? UI_HELP_TEXT.CONNECTIONS_MODAL_TITLE_EDIT
                        : UI_HELP_TEXT.CONNECTIONS_MODAL_TITLE_ADD}
                    </h2>
                    <button
                      onClick={closeModal}
                      className="text-semantic-muted hover:text-brand-foreground transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-4">
                      {/* Name */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_NAME}{" "}
                          <span className={STATUS_TEXT_COLORS.error}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none"
                          placeholder={
                            UI_HELP_TEXT.CONNECTIONS_PLACEHOLDER_NAME
                          }
                        />
                        {formErrors.name && (
                          <p
                            className={`mt-1 text-xs ${STATUS_TEXT_COLORS.error}`}
                          >
                            {formErrors.name}
                          </p>
                        )}
                      </div>

                      {/* Slug */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_SLUG}{" "}
                          <span className={STATUS_TEXT_COLORS.error}>*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.slug}
                          onChange={(e) =>
                            setFormData({ ...formData, slug: e.target.value })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none"
                          placeholder={
                            UI_HELP_TEXT.CONNECTIONS_PLACEHOLDER_SLUG
                          }
                        />
                        {formErrors.slug && (
                          <p
                            className={`mt-1 text-xs ${STATUS_TEXT_COLORS.error}`}
                          >
                            {formErrors.slug}
                          </p>
                        )}
                      </div>

                      {/* Logo URL */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_LOGO_URL}
                        </label>
                        <input
                          type="text"
                          value={formData.logoUrl}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              logoUrl: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none"
                          placeholder={UI_HELP_TEXT.CONNECTIONS_PLACEHOLDER_URL}
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_DESCRIPTION}
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              description: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none resize-none"
                          placeholder={
                            UI_HELP_TEXT.CONNECTIONS_PLACEHOLDER_DESCRIPTION
                          }
                          rows={2}
                        />
                      </div>

                      {/* Config Type */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_CONFIG_TYPE}
                        </label>
                        <select
                          value={formData.configType}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              configType: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-brand-foreground focus:border-brand-accent focus:outline-none"
                        >
                          <option value="json">
                            {UI_HELP_TEXT.CONNECTIONS_SELECT_JSON}
                          </option>
                          <option value="toml">
                            {UI_HELP_TEXT.CONNECTIONS_SELECT_TOML}
                          </option>
                          <option value="yaml">
                            {UI_HELP_TEXT.CONNECTIONS_SELECT_YAML}
                          </option>
                        </select>
                      </div>

                      {/* Config Files (JSON) */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_CONFIG_FILES}
                        </label>
                        <textarea
                          value={formData.configFiles}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              configFiles: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 font-mono text-sm text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none resize-none"
                          placeholder={
                            UI_HELP_TEXT.CONNECTIONS_PLACEHOLDER_CONFIG_FILES
                          }
                          rows={3}
                        />
                        {formErrors.configFiles && (
                          <p
                            className={`mt-1 text-xs ${STATUS_TEXT_COLORS.error}`}
                          >
                            {formErrors.configFiles}
                          </p>
                        )}
                      </div>

                      {/* Config Template */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_CONFIG_TEMPLATE}{" "}
                          <span className={STATUS_TEXT_COLORS.error}>*</span>
                        </label>
                        <textarea
                          value={formData.configTemplate}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              configTemplate: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 font-mono text-sm text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none resize-none"
                          placeholder={
                            UI_HELP_TEXT.CONNECTIONS_PLACEHOLDER_CONFIG_TEMPLATE
                          }
                          rows={6}
                        />
                        {formErrors.configTemplate && (
                          <p
                            className={`mt-1 text-xs ${STATUS_TEXT_COLORS.error}`}
                          >
                            {formErrors.configTemplate}
                          </p>
                        )}
                      </div>

                      {/* Setup Steps (JSON) */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_SETUP_STEPS}
                        </label>
                        <textarea
                          value={formData.setupSteps}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              setupSteps: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 font-mono text-sm text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none resize-none"
                          placeholder={
                            UI_HELP_TEXT.CONNECTIONS_PLACEHOLDER_SETUP_STEPS
                          }
                          rows={4}
                        />
                        {formErrors.setupSteps && (
                          <p
                            className={`mt-1 text-xs ${STATUS_TEXT_COLORS.error}`}
                          >
                            {formErrors.setupSteps}
                          </p>
                        )}
                      </div>

                      {/* Docs URL */}
                      <div>
                        <label className="block text-sm font-medium text-semantic-muted mb-1">
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_DOCS_URL}
                        </label>
                        <input
                          type="text"
                          value={formData.docsUrl}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              docsUrl: e.target.value,
                            })
                          }
                          className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-2 text-brand-foreground placeholder-brand-outline/60 focus:border-brand-accent focus:outline-none"
                          placeholder={UI_HELP_TEXT.CONNECTIONS_PLACEHOLDER_URL}
                        />
                      </div>

                      {/* Enabled */}
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="enabled"
                          checked={formData.enabled}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              enabled: e.target.checked,
                            })
                          }
                          className="w-4 h-4 rounded border-brand-outline/50 bg-brand-paper text-brand-accent focus:ring-brand-accent"
                        />
                        <label
                          htmlFor="enabled"
                          className="text-sm text-semantic-muted"
                        >
                          {UI_HELP_TEXT.CONNECTIONS_LABEL_ENABLED}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 border-t border-brand-outline/50 px-6 py-4">
                    <button
                      onClick={closeModal}
                      className="rounded-full border border-brand-outline/50 px-5 py-2 text-sm font-semibold text-semantic-muted transition hover:border-brand-accent hover:text-brand-accent"
                    >
                      {UI_HELP_TEXT.CONNECTIONS_BUTTON_CANCEL}
                    </button>
                    <button
                      onClick={editingIntegration ? handleUpdate : handleCreate}
                      disabled={loading}
                      className="rounded-full bg-brand-accent px-5 py-2 text-sm font-semibold text-brand-foreground transition hover:bg-brand-accent/90 disabled:opacity-50"
                    >
                      {loading
                        ? UI_HELP_TEXT.CONNECTIONS_BUTTON_SAVING
                        : editingIntegration
                          ? UI_HELP_TEXT.CONNECTIONS_BUTTON_UPDATE
                          : UI_HELP_TEXT.CONNECTIONS_BUTTON_CREATE}
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
