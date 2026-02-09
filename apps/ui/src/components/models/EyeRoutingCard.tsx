"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Check,
  Loader2,
  Copy,
  RotateCcw,
  ArrowRight,
  X,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { EyeIcon } from "@/components/EyeIcon";
import { ProviderSelector } from "./ProviderSelector";
import { ModelSelector } from "./ModelSelector";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { MESSAGES } from "@/constants/messages";
import { PROVIDERS } from "@/constants/models";
import type { EyeRouting } from "@third-eye/types";
import { EyeId } from "@third-eye/constants";

interface ModelInfo {
  name: string;
  displayName?: string;
  family?: string;
  capability?: {
    ctx?: number;
    vision?: boolean;
    jsonMode?: boolean;
  };
}

/**
 * Routing as returned by /api/routing. Extends the shared EyeRouting with
 * an `eye` slug field used by the current API.
 */
interface UiEyeRouting extends Partial<EyeRouting> {
  eye: string;
  primaryProvider: string;
  primaryModel: string;
}

interface EyeRoutingCardProps {
  eye: string;
  routing: UiEyeRouting | undefined;
  models: Record<string, ModelInfo[]>;
  health: Record<string, boolean>;
  pendingChanges: boolean;
  saving: boolean;
  lastSaved: Date | null;
  onChange: (updates: Partial<UiEyeRouting>) => void;
  onQuickAction: (action: "copy-overseer" | "reset-default" | "clear") => void;
  expanded: boolean;
  onToggle: () => void;
}

export function EyeRoutingCard({
  eye,
  routing,
  models,
  health,
  pendingChanges,
  saving,
  lastSaved,
  onChange,
  onQuickAction,
  expanded,
  onToggle,
}: EyeRoutingCardProps) {
  const [showProviderSelector, setShowProviderSelector] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        quickActionsRef.current &&
        !quickActionsRef.current.contains(event.target as Node)
      ) {
        setShowQuickActions(false);
      }
    };

    if (showQuickActions) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showQuickActions]);

  const getEyeIcon = () => {
    if (!eye || typeof eye !== "string") return null;
    const baseEyeName = eye.split("_")[0];
    if (!baseEyeName || !baseEyeName.trim()) return null;
    return (
      <EyeIcon eye={baseEyeName.trim()} size={24} className="inline-block" />
    );
  };

  const getProviderName = (providerId: string) => {
    return PROVIDERS.find((p) => p.id === providerId)?.name || providerId;
  };

  const getModelDisplayName = (providerId: string, modelName: string) => {
    const providerModels = models[providerId] || [];
    const model = providerModels.find((m) => m.name === modelName);
    return model?.displayName || modelName;
  };

  const primaryProvider = routing?.primaryProvider || "";
  const primaryModel = routing?.primaryModel || "";

  const primaryDisplay =
    primaryProvider && primaryModel
      ? `${getProviderName(primaryProvider)} → ${getModelDisplayName(primaryProvider, primaryModel)}`
      : MESSAGES.SELECT_PROVIDER;

  const handleProviderSelect = (providerId: string) => {
    onChange({ primaryProvider: providerId });
    if (models[providerId] && models[providerId].length > 0) {
      setShowProviderSelector(false);
      setShowModelSelector(true);
    }
  };

  const handleModelSelect = (modelName: string) => {
    onChange({ primaryModel: modelName });
    setShowModelSelector(false);
  };

  const handleRoutingClick = () => {
    const currentProvider = primaryProvider;
    if (currentProvider && models[currentProvider]) {
      setShowModelSelector(true);
    } else {
      setShowProviderSelector(true);
    }
  };

  return (
    <>
      <GlassCard
        className={`transition-colors ${
          pendingChanges
            ? `border-2 ${STATUS_BORDER_COLORS_SUBTLE.warning}`
            : "border border-brand-outline/40"
        }`}
      >
        <div className="flex items-center justify-between">
          <button
            onClick={onToggle}
            className="flex flex-1 items-center gap-3 text-left transition-colors hover:opacity-80"
          >
            <span className="text-2xl">{getEyeIcon()}</span>
            <div className="flex-1">
              <h3 className="text-lg font-semibold capitalize text-brand-foreground">
                {eye.replace(/_/g, " ")}
              </h3>
              {primaryProvider && primaryModel && (
                <p className="mt-1 text-sm text-semantic-muted">
                  {primaryDisplay}
                </p>
              )}
            </div>
            {pendingChanges && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BG_COLORS_SUBTLE.warning} ${STATUS_TEXT_COLORS.warning}`}
              >
                Unsaved
              </span>
            )}
            {saving && (
              <Loader2 className="h-4 w-4 animate-spin text-brand-accent" />
            )}
            {lastSaved && !saving && !pendingChanges && (
              <Check className="h-4 w-4 text-green-500" />
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-semantic-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-semantic-muted" />
            )}
          </button>
          <div className="relative" ref={quickActionsRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickActions(!showQuickActions);
              }}
              className="rounded-lg p-2 text-semantic-muted transition-colors hover:bg-brand-paperElev hover:text-brand-foreground"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {showQuickActions && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-brand-outline/40 bg-brand-paper shadow-xl z-10">
                {eye.toLowerCase() !== EyeId.OVERSEER.toLowerCase() && (
                  <button
                    onClick={() => {
                      onQuickAction("copy-overseer");
                      setShowQuickActions(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-brand-foreground hover:bg-brand-paperElev transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                    {MESSAGES.COPY_FROM_OVERSEER}
                  </button>
                )}
                <button
                  onClick={() => {
                    onQuickAction("reset-default");
                    setShowQuickActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-brand-foreground hover:bg-brand-paperElev transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  {MESSAGES.RESET_TO_DEFAULT}
                </button>
                <button
                  onClick={() => {
                    onQuickAction("clear");
                    setShowQuickActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                  {MESSAGES.CLEAR_ROUTING}
                </button>
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-4 overflow-hidden space-y-4"
            >
              {/* Primary Routing */}
              <div className="space-y-2">
                <h4 className="font-medium text-semantic-muted">
                  Provider & Model
                </h4>
                <button
                  onClick={handleRoutingClick}
                  className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper px-4 py-3 text-left text-brand-foreground transition-colors hover:border-brand-accent hover:bg-brand-paperElev focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={
                        primaryProvider && primaryModel
                          ? ""
                          : "text-semantic-muted"
                      }
                    >
                      {primaryDisplay}
                    </span>
                    <ArrowRight className="h-4 w-4 text-semantic-muted" />
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>

      <ProviderSelector
        providers={PROVIDERS}
        selectedProvider={primaryProvider}
        onSelect={handleProviderSelect}
        onClose={() => setShowProviderSelector(false)}
        isOpen={showProviderSelector}
        health={health}
      />

      <ModelSelector
        provider={primaryProvider}
        models={models[primaryProvider] || []}
        selectedModel={primaryModel}
        onSelect={handleModelSelect}
        onClose={() => setShowModelSelector(false)}
        isOpen={showModelSelector}
      />
    </>
  );
}
