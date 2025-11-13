"use client";

import { memo, useState, useCallback } from "react";
import { TOOLBAR_TEXT, LAYOUT } from "./constants";
import type { Pipeline } from "@/types/pipeline";
import {
  STATUS_TEXT_COLORS,
  STATUS_BG_COLORS_SUBTLE,
  STATUS_BORDER_COLORS_SUBTLE,
} from "@/constants/color-mappings";

/**
 * Toolbar Props
 * Per R07: Strict typing
 */
interface ToolbarProps {
  activePipeline: Pipeline | null;
  pipelines: Pipeline[];
  onSave: () => void;
  onActivate: (pipelineId: string) => void;
  onNew: () => void;
  onExport: () => void;
  onImport: () => void;
  onValidate: () => void;
  onAutoLayout: () => void;
  onZoomFit: () => void;
  onToggleMinimap: () => void;
  onToggleGrid: () => void;
  onLoadTemplate: () => void;
  showMinimap: boolean;
  showGrid: boolean;
}

/**
 * Toolbar Component - Phase 10
 *
 * Features:
 * - Primary actions (Save, Activate, New)
 * - Secondary actions in expandable menu
 * - Pipeline selector
 * - Toggle minimap/grid
 *
 * Per R04: Memoized for performance
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT constants
 */
export const Toolbar = memo(function Toolbar({
  activePipeline,
  pipelines,
  onSave,
  onActivate,
  onNew,
  onExport,
  onImport,
  onValidate,
  onAutoLayout,
  onZoomFit,
  onToggleMinimap,
  onToggleGrid,
  onLoadTemplate,
  showMinimap,
  showGrid,
}: ToolbarProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [showPipelineMenu, setShowPipelineMenu] = useState<boolean>(false);

  const handlePipelineSelect = useCallback(
    (pipelineId: string) => {
      onActivate(pipelineId);
      setShowPipelineMenu(false);
    },
    [onActivate],
  );

  return (
    <div
      className="absolute top-0 left-0 right-0 bg-brand-paperElev border-b border-brand-outline flex items-center justify-between px-4 z-10"
      style={{ height: LAYOUT.TOOLBAR_HEIGHT }}
    >
      {/* Left: Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Pipeline Selector */}
        <div className="relative">
          <button
            onClick={() => setShowPipelineMenu(!showPipelineMenu)}
            className="px-4 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground font-medium text-sm hover:bg-brand-outline/10 transition-colors flex items-center gap-2"
          >
            <span>{activePipeline?.name || TOOLBAR_TEXT.SYSTEM_DEFAULT}</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showPipelineMenu && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-brand-paper border border-brand-outline rounded-md shadow-xl max-h-64 overflow-y-auto z-20">
              {pipelines.length > 0 ? (
                pipelines.map((pipeline) => (
                  <button
                    key={pipeline.id}
                    onClick={() => handlePipelineSelect(pipeline.id)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-brand-outline/10 transition-colors ${
                      activePipeline?.id === pipeline.id
                        ? "bg-brand-primary/10 text-brand-primary font-medium"
                        : "text-brand-foreground"
                    }`}
                  >
                    <div className="font-medium">{pipeline.name}</div>
                    {pipeline.description && (
                      <div className="text-xs text-semantic-muted mt-0.5">
                        {pipeline.description}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-semantic-muted text-center">
                  No saved pipelines
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-px h-8 bg-brand-outline" />

        {/* Save */}
        <button
          onClick={onSave}
          className="px-4 py-2 bg-brand-primary text-brand-foreground rounded-md font-medium text-sm hover:bg-brand-primary/90 transition-colors"
        >
          {TOOLBAR_TEXT.SAVE}
        </button>

        {/* Activate */}
        <button
          onClick={() => activePipeline && onActivate(activePipeline.id)}
          disabled={!activePipeline || activePipeline.isActive}
          className="px-4 py-2 bg-semantic-success text-brand-foreground rounded-md font-medium text-sm hover:bg-semantic-success disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {TOOLBAR_TEXT.ACTIVATE}
        </button>

        {/* New */}
        <button
          onClick={onNew}
          className="px-4 py-2 bg-brand-accent text-brand-foreground rounded-md font-medium text-sm hover:bg-brand-accent/90 transition-colors"
        >
          {TOOLBAR_TEXT.NEW}
        </button>
      </div>

      {/* Right: Secondary Actions */}
      <div className="flex items-center gap-2">
        {/* Always Visible Actions */}
        <button
          onClick={onValidate}
          className="px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground text-sm hover:bg-brand-outline/10 transition-colors"
        >
          {TOOLBAR_TEXT.VALIDATE}
        </button>

        <button
          onClick={onAutoLayout}
          className="px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground text-sm hover:bg-brand-outline/10 transition-colors"
        >
          {TOOLBAR_TEXT.AUTO_LAYOUT}
        </button>

        <button
          onClick={onZoomFit}
          className="px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground text-sm hover:bg-brand-outline/10 transition-colors"
        >
          {TOOLBAR_TEXT.ZOOM_FIT}
        </button>

        {/* Expanded Actions */}
        {expanded && (
          <>
            <button
              onClick={onExport}
              className="px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground text-sm hover:bg-brand-outline/10 transition-colors"
            >
              {TOOLBAR_TEXT.EXPORT}
            </button>

            <button
              onClick={onImport}
              className="px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground text-sm hover:bg-brand-outline/10 transition-colors"
            >
              {TOOLBAR_TEXT.IMPORT}
            </button>

            <button
              onClick={onLoadTemplate}
              className="px-3 py-2 bg-brand-primary border border-brand-primary rounded-md text-brand-foreground text-sm hover:bg-brand-primary/90 transition-colors"
            >
              {TOOLBAR_TEXT.LOAD_TEMPLATE}
            </button>

            <button
              onClick={onToggleMinimap}
              className={`px-3 py-2 border rounded-md text-sm transition-colors ${
                showMinimap
                  ? "bg-brand-primary text-brand-foreground border-brand-primary"
                  : "bg-brand-paper text-brand-foreground border-brand-outline hover:bg-brand-outline/10"
              }`}
            >
              {TOOLBAR_TEXT.TOGGLE_MINIMAP}
            </button>

            <button
              onClick={onToggleGrid}
              className={`px-3 py-2 border rounded-md text-sm transition-colors ${
                showGrid
                  ? "bg-brand-primary text-brand-foreground border-brand-primary"
                  : "bg-brand-paper text-brand-foreground border-brand-outline hover:bg-brand-outline/10"
              }`}
            >
              {TOOLBAR_TEXT.TOGGLE_GRID}
            </button>
          </>
        )}

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground text-sm hover:bg-brand-outline/10 transition-colors"
          title={expanded ? "Show Less" : TOOLBAR_TEXT.MORE_ACTIONS}
        >
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
    </div>
  );
});
