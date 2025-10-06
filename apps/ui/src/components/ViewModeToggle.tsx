'use client';

import { useUI } from '@/contexts/UIContext';
import { Eye, Code2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function ViewModeToggle() {
  const { viewMode, toggleViewMode } = useUI();

  return (
    <button
      onClick={toggleViewMode}
      className="group relative flex items-center gap-2 overflow-hidden rounded-full border border-brand-outline/50 bg-brand-paper px-4 py-2 transition-all hover:border-brand-accent"
    >
      <motion.div
        initial={false}
        animate={{
          x: viewMode === 'novice' ? 0 : '100%',
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute inset-0 rounded-full bg-brand-accent/10"
      />

      <div className="relative z-10 flex items-center gap-4">
        <div
          className={`flex items-center gap-1.5 transition-colors ${
            viewMode === 'novice' ? 'text-brand-accent' : 'text-slate-400'
          }`}
        >
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Novice</span>
        </div>

        <div
          className={`flex items-center gap-1.5 transition-colors ${
            viewMode === 'expert' ? 'text-brand-accent' : 'text-slate-400'
          }`}
        >
          <Code2 className="h-4 w-4" />
          <span className="text-sm font-medium">Expert</span>
        </div>
      </div>
    </button>
  );
}

export function ViewModeDescription() {
  const { viewMode } = useUI();

  if (viewMode === 'novice') {
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <p className="text-sm text-blue-300">
          <strong>Novice Mode:</strong> Simplified view with plain language explanations.
          Technical details and JSON envelopes are hidden for easier understanding.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
      <p className="text-sm text-purple-300">
        <strong>Expert Mode:</strong> Full technical view with raw JSON envelopes, metrics,
        and detailed diagnostic information.
      </p>
    </div>
  );
}
