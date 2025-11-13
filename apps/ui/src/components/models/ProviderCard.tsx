"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";
import { MESSAGES } from "@/constants/messages";
import {
  PROVIDERS,
  type CapabilityFilter,
  DEFAULT_CAPABILITY_FILTER,
} from "@/constants/models";
import type { ProviderDefinition } from "@/constants/models";

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

interface ProviderCardProps {
  provider: ProviderDefinition;
  models: ModelInfo[];
  health: boolean | undefined;
  loading: boolean;
  onRefresh: () => void;
  expanded: boolean;
  onToggle: () => void;
}

export function ProviderCard({
  provider,
  models,
  health,
  loading,
  onRefresh,
  expanded,
  onToggle,
}: ProviderCardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [capabilityFilter, setCapabilityFilter] = useState<CapabilityFilter>(
    DEFAULT_CAPABILITY_FILTER,
  );

  const filteredModels = useMemo(() => {
    return models.filter((model) => {
      const matchesSearch =
        !searchTerm ||
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.displayName?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesVision =
        !capabilityFilter.vision || model.capability?.vision;
      const matchesJson = !capabilityFilter.json || model.capability?.jsonMode;
      const matchesCtx =
        !capabilityFilter.minCtx ||
        (model.capability?.ctx || 0) >= capabilityFilter.minCtx;

      return matchesSearch && matchesVision && matchesJson && matchesCtx;
    });
  }, [models, searchTerm, capabilityFilter]);

  const modelCount = models.length;
  const filteredCount = filteredModels.length;

  return (
    <GlassCard className="border border-brand-outline/40">
      <div className="flex items-center justify-between">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center gap-3 text-left transition-colors hover:opacity-80"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-brand-foreground">
              {provider.name}
            </h3>
            {health !== undefined && (
              <span
                className={`flex items-center ${
                  health ? STATUS_TEXT_COLORS.success : STATUS_TEXT_COLORS.error
                }`}
                title={health ? "Online" : "Offline"}
              >
                {health ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </span>
            )}
          </div>
          <span className="rounded-full bg-brand-accent/20 px-2 py-0.5 text-xs font-semibold text-brand-accent">
            {modelCount}
          </span>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-semantic-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-semantic-muted" />
          )}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRefresh();
          }}
          disabled={loading}
          className="rounded-full border border-brand-outline/40 px-3 py-1 text-xs font-semibold text-brand-accent transition hover:border-brand-accent hover:bg-brand-accent/10 disabled:opacity-50"
        >
          {loading ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="h-3 w-3" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-4 overflow-hidden"
          >
            {modelCount === 0 ? (
              <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-center text-sm text-semantic-muted">
                {provider.requiresKey
                  ? MESSAGES.ADD_API_KEY_SETTINGS
                  : MESSAGES.CLICK_REFRESH_LOAD_MODELS}
              </div>
            ) : (
              <div className="space-y-3">
                {/* Search and Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-semantic-muted" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search models..."
                      className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper pl-10 pr-4 py-2 text-sm text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-xs text-semantic-muted">
                      <input
                        type="checkbox"
                        checked={capabilityFilter.vision}
                        onChange={(e) =>
                          setCapabilityFilter({
                            ...capabilityFilter,
                            vision: e.target.checked,
                          })
                        }
                        className="rounded border-brand-outline/50"
                      />
                      Vision
                    </label>
                    <label className="flex items-center gap-2 text-xs text-semantic-muted">
                      <input
                        type="checkbox"
                        checked={capabilityFilter.json}
                        onChange={(e) =>
                          setCapabilityFilter({
                            ...capabilityFilter,
                            json: e.target.checked,
                          })
                        }
                        className="rounded border-brand-outline/50"
                      />
                      JSON
                    </label>
                  </div>
                  {filteredCount !== modelCount && (
                    <p className="text-xs text-semantic-muted">
                      Showing {filteredCount} of {modelCount} models
                    </p>
                  )}
                </div>

                {/* Model List */}
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {filteredModels.length === 0 ? (
                    <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-center text-sm text-semantic-muted">
                      {MESSAGES.NO_MODELS_FOUND}
                    </div>
                  ) : (
                    filteredModels.map((model) => (
                      <div
                        key={model.name}
                        className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-3"
                      >
                        <div className="text-sm font-medium text-brand-foreground">
                          {model.displayName || model.name}
                        </div>
                        {model.family && (
                          <div className="mt-1 text-xs text-semantic-muted">
                            Family: {model.family}
                          </div>
                        )}
                        {model.capability && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {model.capability.ctx && (
                              <span
                                className={`rounded-full ${STATUS_BG_COLORS_SUBTLE.info} px-2 py-0.5 text-xs ${STATUS_TEXT_COLORS.info}`}
                              >
                                {model.capability.ctx}k ctx
                              </span>
                            )}
                            {model.capability.vision && (
                              <span
                                className={`rounded-full ${STATUS_BG_COLORS_SUBTLE.info} px-2 py-0.5 text-xs ${STATUS_TEXT_COLORS.info}`}
                              >
                                Vision
                              </span>
                            )}
                            {model.capability.jsonMode && (
                              <span
                                className={`rounded-full ${STATUS_BG_COLORS_SUBTLE.success} px-2 py-0.5 text-xs ${STATUS_TEXT_COLORS.success}`}
                              >
                                JSON
                              </span>
                            )}
                          </div>
                        )}
                        {model.lastSeen && (
                          <div className="mt-1 text-xs text-semantic-muted">
                            Last seen:{" "}
                            {new Date(model.lastSeen).toLocaleString()}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
