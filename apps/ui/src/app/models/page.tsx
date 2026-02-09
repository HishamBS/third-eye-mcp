"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { RefreshCw, Info } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProviderCard } from "@/components/models/ProviderCard";
import { EyeRoutingCard } from "@/components/models/EyeRoutingCard";
import type { EyeRouting } from "@third-eye/types";
import { API_BASE_URL } from "@/consts/api";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { TIMING } from "@/constants/timing";
import { MESSAGES } from "@/constants/messages";
import { ROUTES } from "@/constants/routes";
import { PROVIDERS } from "@/constants/models";
import { EyeId } from "@third-eye/constants";
import { ProviderSelector } from "@/components/models/ProviderSelector";
import { ModelSelector } from "@/components/models/ModelSelector";

interface ModelInfo {
  name: string;
  displayName?: string;
  family?: string;
  capability?: {
    ctx?: number;
    vision?: boolean;
    jsonMode?: boolean;
  };
  lastSeen?: string;
}

/**
 * Routing as returned by /api/routing. The API currently keys routing by eye
 * slug (`eye`) rather than the DB UUID (`eyeId`). This extends the shared
 * EyeRouting with the `eye` slug field until the API fully migrates.
 */
interface UiEyeRouting extends Partial<EyeRouting> {
  eye: string;
  primaryProvider: string;
  primaryModel: string;
}

interface ProviderHealth {
  [provider: string]: boolean;
}

export default function ModelsPage() {
  const [models, setModels] = useState<Record<string, ModelInfo[]>>({});
  const [routing, setRouting] = useState<UiEyeRouting[]>([]);
  const [pendingRoutingChanges, setPendingRoutingChanges] = useState<
    Record<string, Partial<UiEyeRouting>>
  >({});
  const [health, setHealth] = useState<ProviderHealth>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [savingRouting, setSavingRouting] = useState(false);
  const [lastSaved, setLastSaved] = useState<Record<string, Date | null>>({});
  const [allEyes, setAllEyes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedProviders, setExpandedProviders] = useState<
    Record<string, boolean>
  >({});
  const [expandedEyes, setExpandedEyes] = useState<Record<string, boolean>>({});
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Global model selector state
  const [globalProvider, setGlobalProvider] = useState<string>("");
  const [globalModel, setGlobalModel] = useState<string>("");
  const [showGlobalProviderSelector, setShowGlobalProviderSelector] =
    useState(false);
  const [showGlobalModelSelector, setShowGlobalModelSelector] = useState(false);
  const [applyingGlobalModel, setApplyingGlobalModel] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    await Promise.all([
      fetchAllEyes(),
      fetchRouting(),
      fetchHealth(),
      loadCachedModels(),
    ]);
  };

  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        const data = await response.json();
        setHealth(data.providers || {});
      }
    } catch (err) {
      console.error("Failed to fetch health:", err);
    }
  };

  const fetchAllEyes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/eyes/all`);
      if (response.ok) {
        const result = await response.json();
        const eyesData = result.data || [];
        // Use eye names instead of IDs for display (backend returns names)
        setAllEyes(
          eyesData.map((eye: { name: string }) => eye.name).filter(Boolean),
        );
      }
    } catch (error) {
      console.error("Failed to fetch eyes:", error);
    }
  };

  const fetchRouting = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/routing`);
      if (response.ok) {
        const result = await response.json();
        const routingData = result.data?.routings || [];
        setRouting(routingData);
        // Extract eye names from routing data (SSOT) instead of using eye IDs
        const eyeNames = routingData
          .map((r: { eye: string }) => r.eye)
          .filter(Boolean);
        if (eyeNames.length > 0) {
          setAllEyes(eyeNames);
        }
      }
    } catch (error) {
      console.error("Failed to fetch routing:", error);
    }
  };

  const loadCachedModels = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/models`);
      if (response.ok) {
        const result = await response.json();
        setModels(result.data?.modelsByProvider || {});
      }
    } catch (error) {
      console.error("Failed to load cached models:", error);
    }
  };

  const fetchModels = async (providerId: string) => {
    setLoading(providerId);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/models/${providerId}/refresh`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        const result = await response.json();
        const modelsList = result.data?.models || [];
        setModels((prev) => ({ ...prev, [providerId]: modelsList }));
        setSuccess(`Refreshed ${modelsList.length} models for ${providerId}`);
        await fetchHealth();
      } else {
        const result = await response.json();
        setError(
          result.error?.detail || `Failed to fetch models for ${providerId}`,
        );
      }
    } catch (error) {
      setError(`Failed to fetch models for ${providerId}`);
    } finally {
      setLoading(null);
    }
  };

  const refreshAllModels = async () => {
    setLoading("all");
    setError(null);

    try {
      const promises = PROVIDERS.map((provider) => fetchModels(provider.id));
      await Promise.all(promises);
      setSuccess("Refreshed all models");
    } catch (error) {
      setError("Failed to refresh all models");
    } finally {
      setLoading(null);
    }
  };

  const handleRoutingChange = useCallback(
    (eye: string, updates: Partial<UiEyeRouting>) => {
      setPendingRoutingChanges((prev) => ({
        ...prev,
        [eye]: { ...(prev[eye] || {}), ...updates },
      }));
    },
    [],
  );

  const saveRoutingForEye = async (eye: string, routingData: UiEyeRouting) => {
    try {
      // Normalize eye name to lowercase to match backend validation
      // TODO: Phase 2 - Use UUID-based eye IDs instead of names
      const normalizedEye = eye.toLowerCase();
      const normalizedData = { ...routingData, eye: normalizedEye };

      const response = await fetch(`${API_BASE_URL}/api/routing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error?.detail ||
          errorData.error?.message ||
          `Failed to update routing for ${eye}`;
        const validationErrors = errorData.error?.validation || [];

        if (validationErrors.length > 0) {
          const validationMessages = validationErrors
            .map(
              (e: { path: string; message: string }) =>
                `${e.path}: ${e.message}`,
            )
            .join(", ");
          throw new Error(`Validation failed: ${validationMessages}`);
        }

        throw new Error(errorMessage);
      }

      setLastSaved((prev) => ({ ...prev, [eye]: new Date() }));
      return true;
    } catch (error) {
      console.error(`Failed to save routing for ${eye}:`, error);
      return false;
    }
  };

  const saveAllRoutingChanges = useCallback(async () => {
    if (Object.keys(pendingRoutingChanges).length === 0) return;

    setSavingRouting(true);
    setError(null);

    try {
      const promises = Object.entries(pendingRoutingChanges).map(
        async ([eye, updates]) => {
          const currentRouting = routing.find(
            (r) => r.eye.toLowerCase() === eye.toLowerCase(),
          );
          const fullRouting = {
            ...currentRouting,
            ...updates,
            eye,
          } as UiEyeRouting;
          return saveRoutingForEye(eye, fullRouting);
        },
      );

      const results = await Promise.all(promises);
      const successCount = results.filter(Boolean).length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        setSuccess(MESSAGES.ROUTING_SAVED_MULTIPLE(successCount));
        // Only clear successfully saved changes
        const successfulEyes = Object.entries(pendingRoutingChanges)
          .filter(([eye], index) => results[index])
          .map(([eye]) => eye);

        setPendingRoutingChanges((prev) => {
          const updated = { ...prev };
          successfulEyes.forEach((eye) => delete updated[eye]);
          return updated;
        });

        // Only refresh routing if all saves succeeded
        if (failedCount === 0) {
          await fetchRouting();
        }
      }

      if (failedCount > 0) {
        setError(
          `Failed to save ${failedCount} routing change${failedCount > 1 ? "s" : ""}. Please check the console for details.`,
        );
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save routing changes",
      );
    } finally {
      setSavingRouting(false);
    }
  }, [pendingRoutingChanges, routing]);

  // Auto-save with debounce
  useEffect(() => {
    if (Object.keys(pendingRoutingChanges).length === 0) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveAllRoutingChanges();
    }, TIMING.AUTO_SAVE_DELAY_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [pendingRoutingChanges, saveAllRoutingChanges]);

  const getRoutingForEye = (eye: string): UiEyeRouting | undefined => {
    const baseRouting = routing.find(
      (r) => r.eye.toLowerCase() === eye.toLowerCase(),
    );
    const pendingChanges = pendingRoutingChanges[eye];

    if (!baseRouting) {
      return pendingChanges
        ? { eye, primaryProvider: "", primaryModel: "", ...pendingChanges }
        : undefined;
    }

    return pendingChanges ? { ...baseRouting, ...pendingChanges } : baseRouting;
  };

  const handleQuickAction = useCallback(
    (eye: string, action: "copy-overseer" | "reset-default" | "clear") => {
      if (action === "copy-overseer") {
        const overseerRouting = routing.find(
          (r) => r.eye.toLowerCase() === EyeId.OVERSEER.toLowerCase(),
        );
        if (overseerRouting) {
          handleRoutingChange(eye, {
            primaryProvider: overseerRouting.primaryProvider,
            primaryModel: overseerRouting.primaryModel,
          });
        }
      } else if (action === "reset-default" || action === "clear") {
        handleRoutingChange(eye, {
          primaryProvider: "",
          primaryModel: "",
        });
      }
    },
    [routing, handleRoutingChange],
  );

  // Apply global model to all eyes - immediately saves to backend
  const handleApplyGlobalModel = useCallback(async () => {
    if (!globalProvider || !globalModel || allEyes.length === 0) {
      setError("Please select both provider and model");
      return;
    }

    setApplyingGlobalModel(true);
    setError(null);

    try {
      const promises = allEyes.map(async (eye) => {
        const fullRouting: UiEyeRouting = {
          eye,
          primaryProvider: globalProvider,
          primaryModel: globalModel,
        };
        return saveRoutingForEye(eye, fullRouting);
      });

      const results = await Promise.all(promises);
      const successCount = results.filter(Boolean).length;
      const failedCount = results.length - successCount;

      if (successCount > 0) {
        setSuccess(
          `Applied global model to ${successCount} eye${successCount > 1 ? "s" : ""}`,
        );
        // Update lastSaved for all successfully saved eyes
        const successfulEyes = allEyes.filter((_, index) => results[index]);
        setLastSaved((prev) => {
          const updated = { ...prev };
          successfulEyes.forEach((eye) => {
            updated[eye] = new Date();
          });
          return updated;
        });
        // Clear pending changes for successfully saved eyes
        setPendingRoutingChanges((prev) => {
          const updated = { ...prev };
          successfulEyes.forEach((eye) => {
            delete updated[eye];
          });
          return updated;
        });
        // Refresh routing data
        if (failedCount === 0) {
          await fetchRouting();
        }
      }

      if (failedCount > 0) {
        setError(
          `Failed to apply global model to ${failedCount} eye${failedCount > 1 ? "s" : ""}. Please check the console for details.`,
        );
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to apply global model",
      );
    } finally {
      setApplyingGlobalModel(false);
    }
  }, [globalProvider, globalModel, allEyes, routing]);

  const handleGlobalProviderSelect = useCallback(
    (providerId: string) => {
      setGlobalProvider(providerId);
      setShowGlobalProviderSelector(false);
      if (models[providerId] && models[providerId].length > 0) {
        setShowGlobalModelSelector(true);
      } else {
        setGlobalModel("");
      }
    },
    [models],
  );

  const handleGlobalModelSelect = useCallback((modelName: string) => {
    setGlobalModel(modelName);
    setShowGlobalModelSelector(false);
  }, []);

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

  return (
    <div className="min-h-screen bg-brand-paper">
      {/* Header */}
      <div className="border-b border-brand-outline/60 bg-brand-paperElev/50">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-brand-foreground">
                Models & Routing
              </h1>
              <p className="mt-1 text-sm text-semantic-muted">
                {MESSAGES.CONFIGURE_PROVIDERS_ROUTE_MODELS}
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Global Model Selector */}
              <div className="flex items-center gap-2 rounded-lg border border-brand-outline/40 bg-brand-paper px-3 py-2">
                <span className="text-xs text-semantic-muted">Global:</span>
                <button
                  onClick={() => setShowGlobalProviderSelector(true)}
                  className="text-sm text-brand-foreground hover:text-brand-accent transition-colors"
                >
                  {globalProvider
                    ? PROVIDERS.find((p) => p.id === globalProvider)?.name ||
                      globalProvider
                    : "Provider"}
                </button>
                <span className="text-semantic-muted">→</span>
                <button
                  onClick={() => {
                    if (globalProvider && models[globalProvider]) {
                      setShowGlobalModelSelector(true);
                    } else {
                      setShowGlobalProviderSelector(true);
                    }
                  }}
                  className="text-sm text-brand-foreground hover:text-brand-accent transition-colors"
                  disabled={!globalProvider}
                >
                  {globalModel || "Model"}
                </button>
                <button
                  onClick={handleApplyGlobalModel}
                  disabled={
                    !globalProvider ||
                    !globalModel ||
                    applyingGlobalModel ||
                    allEyes.length === 0
                  }
                  className="ml-2 rounded px-3 py-1 text-xs font-medium text-brand-foreground bg-brand-accent/20 hover:bg-brand-accent/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {applyingGlobalModel ? "Applying..." : "Apply to All"}
                </button>
              </div>
              <button
                onClick={refreshAllModels}
                disabled={loading === "all"}
                className="flex items-center gap-2 rounded-lg border border-brand-outline/40 bg-brand-paper px-4 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brand-paperElev disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 ${loading === "all" ? "animate-spin" : ""}`}
                />
                {MESSAGES.REFRESH_ALL_MODELS}
              </button>
              <Link
                href={ROUTES.PERSONAS}
                className="text-sm text-semantic-muted transition-colors hover:text-brand-foreground"
              >
                Personas
              </Link>
              <Link
                href={ROUTES.SETTINGS}
                className="text-sm text-semantic-muted transition-colors hover:text-brand-foreground"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div
            className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.error} ${STATUS_BG_COLORS_SUBTLE.error} p-4 ${STATUS_TEXT_COLORS.error}`}
          >
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div
            className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.success} ${STATUS_BG_COLORS_SUBTLE.success} p-4 ${STATUS_TEXT_COLORS.success}`}
          >
            {success}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Info Banner */}
        <GlassCard>
          <div
            className={`rounded-xl border ${STATUS_BORDER_COLORS_SUBTLE.info} ${STATUS_BG_COLORS_SUBTLE.info} p-5`}
          >
            <div className="mb-2 flex items-center gap-2">
              <Info className={`h-5 w-5 ${STATUS_TEXT_COLORS.info}`} />
              <span className={`font-medium ${STATUS_TEXT_COLORS.info}`}>
                API Keys Configuration
              </span>
            </div>
            <p className={`text-sm ${STATUS_TEXT_COLORS.info}`}>
              Provider API keys are managed in the{" "}
              <Link
                href={ROUTES.SETTINGS}
                className={`font-semibold underline hover:${STATUS_TEXT_COLORS.info}`}
              >
                Settings page
              </Link>
              . Configure Groq, OpenRouter, Ollama, or LM Studio to load models.
            </p>
          </div>
        </GlassCard>

        {/* Provider Cards */}
        <GlassCard>
          <h2 className="mb-6 text-xl font-semibold text-brand-foreground">
            Available Models
          </h2>
          <div className="space-y-4">
            {PROVIDERS.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                models={models[provider.id] || []}
                health={health[provider.id]}
                loading={loading === provider.id}
                onRefresh={() => fetchModels(provider.id)}
                expanded={expandedProviders[provider.id] || false}
                onToggle={() =>
                  setExpandedProviders((prev) => ({
                    ...prev,
                    [provider.id]: !prev[provider.id],
                  }))
                }
              />
            ))}
          </div>
        </GlassCard>

        {/* Eye Routing Cards */}
        <GlassCard>
          <h2 className="mb-6 text-xl font-semibold text-brand-foreground">
            Eye Routing
          </h2>
          <div className="space-y-4">
            {allEyes.map((eye) => {
              const eyeRouting = getRoutingForEye(eye);
              const hasPendingChanges = !!pendingRoutingChanges[eye];
              const isSaving = savingRouting && hasPendingChanges;

              return (
                <EyeRoutingCard
                  key={eye}
                  eye={eye}
                  routing={eyeRouting}
                  models={models}
                  health={health}
                  pendingChanges={hasPendingChanges}
                  saving={isSaving}
                  lastSaved={lastSaved[eye] || null}
                  onChange={(updates) => handleRoutingChange(eye, updates)}
                  onQuickAction={(action) => handleQuickAction(eye, action)}
                  expanded={expandedEyes[eye] || false}
                  onToggle={() =>
                    setExpandedEyes((prev) => ({
                      ...prev,
                      [eye]: !prev[eye],
                    }))
                  }
                />
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Global Model Selectors */}
      <ProviderSelector
        providers={PROVIDERS}
        selectedProvider={globalProvider}
        onSelect={handleGlobalProviderSelect}
        onClose={() => setShowGlobalProviderSelector(false)}
        isOpen={showGlobalProviderSelector}
        health={health}
      />

      <ModelSelector
        provider={globalProvider}
        models={models[globalProvider] || []}
        selectedModel={globalModel}
        onSelect={handleGlobalModelSelect}
        onClose={() => setShowGlobalModelSelector(false)}
        isOpen={showGlobalModelSelector}
      />
    </div>
  );
}
