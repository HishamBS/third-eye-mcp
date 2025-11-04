'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Search, X } from 'lucide-react';
import { STATUS_TEXT_COLORS } from '@/constants/color-mappings';
import { PROVIDERS, type ProviderDefinition } from '@/constants/models';

interface ProviderSelectorProps {
  providers: readonly ProviderDefinition[];
  selectedProvider: string;
  onSelect: (providerId: string) => void;
  onClose: () => void;
  isOpen: boolean;
  health: Record<string, boolean>;
}

export function ProviderSelector({
  providers,
  selectedProvider,
  onSelect,
  onClose,
  isOpen,
  health,
}: ProviderSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProviders = useMemo(() => {
    return providers.filter(
      (provider) =>
        !searchTerm ||
        provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        provider.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [providers, searchTerm]);

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
        className="w-full max-w-md rounded-xl border border-brand-outline/60 bg-brand-paper p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-brand-foreground">Select Provider</h2>
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
              placeholder="Search providers..."
              className="w-full rounded-xl border border-brand-outline/50 bg-brand-paper pl-10 pr-4 py-2 text-sm text-brand-foreground placeholder-brand-outline focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/40"
              autoFocus
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredProviders.map((provider) => {
            const isHealthy = health[provider.id];
            const isSelected = selectedProvider === provider.id;

            return (
              <button
                key={provider.id}
                onClick={() => {
                  onSelect(provider.id);
                  onClose();
                }}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  isSelected
                    ? 'border-brand-accent bg-brand-accent/10'
                    : 'border-brand-outline/40 bg-brand-paper/70 hover:border-brand-accent/60 hover:bg-brand-paper'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isHealthy !== undefined && (
                      <span
                        className={`flex items-center ${
                          isHealthy ? STATUS_TEXT_COLORS.success : STATUS_TEXT_COLORS.error
                        }`}
                        title={isHealthy ? 'Online' : 'Offline'}
                      >
                        {isHealthy ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <XCircle className="h-5 w-5" />
                        )}
                      </span>
                    )}
                    <div>
                      <div className="text-sm font-medium text-brand-foreground">
                        {provider.name}
                      </div>
                      {provider.requiresKey && (
                        <div className="text-xs text-semantic-muted">Requires API key</div>
                      )}
                    </div>
                  </div>
                  {isSelected && <div className="text-brand-accent">✓</div>}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

