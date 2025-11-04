'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { STATUS_TEXT_COLORS, STATUS_BG_COLORS_SUBTLE } from '@/constants/color-mappings';
import { MESSAGES } from '@/constants/messages';

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

interface ModelSelectorProps {
  provider: string;
  models: ModelInfo[];
  selectedModel: string;
  onSelect: (modelName: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function ModelSelector({
  provider,
  models,
  selectedModel,
  onSelect,
  onClose,
  isOpen,
}: ModelSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredModels = useMemo(() => {
    return models.filter(
      (model) =>
        !searchTerm ||
        model.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [models, searchTerm]);

  const groupedModels = useMemo(() => {
    const groups: Record<string, ModelInfo[]> = {};
    filteredModels.forEach((model) => {
      const family = model.family || 'Other';
      if (!groups[family]) {
        groups[family] = [];
      }
      groups[family].push(model);
    });
    return groups;
  }, [filteredModels]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-xl border border-brand-outline/60 bg-brand-paper p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-foreground">
            Select Model for {provider}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-semantic-muted transition-colors hover:bg-brand-paperElev hover:text-brand-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-semantic-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search models..."
              className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper pl-10 pr-4 py-2 text-sm text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-96 space-y-2 overflow-y-auto">
          {filteredModels.length === 0 ? (
            <div className="rounded-xl border border-brand-outline/40 bg-brand-paper/70 p-4 text-center text-sm text-semantic-muted">
              {MESSAGES.NO_MODELS_FOUND}
            </div>
          ) : (
            Object.entries(groupedModels).map(([family, familyModels]) => (
              <div key={family}>
                <div className="mb-1 text-xs font-semibold uppercase text-semantic-muted">
                  {family}
                </div>
                {familyModels.map((model) => (
                  <button
                    key={model.name}
                    onClick={() => {
                      onSelect(model.name);
                      onClose();
                    }}
                    className={`mb-1 w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedModel === model.name
                        ? 'border-brand-accent bg-brand-accent/10'
                        : 'border-brand-outline/40 bg-brand-paper/70 hover:border-brand-accent/60 hover:bg-brand-paper'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-brand-foreground">
                          {model.displayName || model.name}
                        </div>
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
                      </div>
                      {selectedModel === model.name && (
                        <div className="ml-2 text-brand-accent">✓</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
}

