"use client";

import { useUI } from "@/contexts/UIContext";
import { Eye, Code2 } from "lucide-react";
import { motion } from "framer-motion";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

export function ViewModeToggle() {
  const { viewMode, toggleViewMode } = useUI();

  return (
    <button
      onClick={toggleViewMode}
      className="group relative z-30 flex items-center gap-2 rounded-full border border-brand-outline/50 bg-brand-paper px-4 py-2 transition-all hover:border-brand-accent min-w-[180px]"
    >
      {" "}
      <div className="relative z-10 flex items-center gap-4">
        <div
          className={`flex items-center gap-1.5 transition-colors ${
            viewMode === "novice" ? "text-brand-accent" : "text-semantic-muted"
          }`}
        >
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">Novice</span>
        </div>

        <div
          className={`flex items-center gap-1.5 transition-colors ${
            viewMode === "expert" ? "text-brand-accent" : "text-semantic-muted"
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

  if (viewMode === "novice") {
    return (
      <div
        className={`rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.info} ${STATUS_BG_COLORS_SUBTLE.info} p-4`}
      >
        <p className={`text-sm ${STATUS_TEXT_COLORS.info}`}>
          <strong>Novice Mode:</strong> Simplified view with plain language
          explanations. Technical details and JSON envelopes are hidden for
          easier understanding.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border ${STATUS_BORDER_COLORS_SUBTLE.info} ${STATUS_BG_COLORS_SUBTLE.info} p-4`}
    >
      <p className={`text-sm ${STATUS_TEXT_COLORS.info}`}>
        <strong>Expert Mode:</strong> Full technical view with raw JSON
        envelopes, metrics, and detailed diagnostic information.
      </p>
    </div>
  );
}
