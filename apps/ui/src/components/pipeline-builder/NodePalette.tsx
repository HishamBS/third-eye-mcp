"use client";

import { memo, useState, useMemo, useCallback, useEffect } from "react";
import { EyeIcon } from "@/components/EyeIcon";
import {
  GitBranch,
  GitMerge,
  RotateCw,
  Terminal,
  UserCircle,
} from "lucide-react";
import { PALETTE_TEXT, LAYOUT } from "./constants";
import type { EyeDefinition } from "@/types/pipeline";
import { API_BASE_URL } from "@/consts/api";

/**
 * Control node definitions (Switch, IF, Loop, etc.)
 * Per R01: SSOT for control node metadata
 */
const CONTROL_NODES = [
  {
    type: "switch",
    label: "Switch",
    description: "Multi-way routing with rules",
    icon: GitBranch,
    defaultConfig: {
      mode: "rules",
      rules: [
        {
          expression: '{"==": [{"var": "verdict"}, "APPROVED"]}',
          label: "Approved",
          outputIndex: 0,
        },
        {
          expression: '{"==": [{"var": "verdict"}, "REJECTED"]}',
          label: "Rejected",
          outputIndex: 1,
        },
      ],
      sendToAll: false,
    },
  },
  {
    type: "if",
    label: "IF",
    description: "Binary true/false branching",
    icon: GitMerge,
    defaultConfig: {
      condition: '{"==": [{"var": "verdict"}, "OK"]}',
      trueLabel: "Yes",
      falseLabel: "No",
    },
  },
  {
    type: "loop_over_items",
    label: "Loop",
    description: "Iterate over items with batching",
    icon: RotateCw,
    defaultConfig: {
      maxIterations: 10,
      batchSize: 1,
    },
  },
  {
    type: "terminal",
    label: "Terminal",
    description: "End pipeline execution",
    icon: Terminal,
    defaultConfig: {
      verdict: "COMPLETE",
    },
  },
  {
    type: "user_input",
    label: "User Input",
    description: "Wait for user input",
    icon: UserCircle,
    defaultConfig: {
      promptKey: "user_feedback",
    },
  },
] as const;

/**
 * Node Palette Props
 * Per R07: Strict typing
 */
interface NodePaletteProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

/**
 * Enhanced Node Palette Component - N8N Style
 *
 * Features:
 * - Displays all Eyes (built-in + custom)
 * - Displays control nodes (Switch, IF, Loop, Terminal, User Input)
 * - Collapsible sections
 * - Search functionality
 * - Drag-and-drop to canvas
 *
 * Per R04: Memoized for performance
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT constants
 */
export const NodePalette = memo(function NodePalette({
  collapsed,
  onToggleCollapse,
}: NodePaletteProps) {
  const [search, setSearch] = useState<string>("");
  const [allEyes, setAllEyes] = useState<EyeDefinition[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    eyes: true,
    control: true,
  });

  // Fetch ALL eyes from unified endpoint
  useEffect(() => {
    const fetchAllEyes = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/eyes/all`);
        if (!response.ok) {
          throw new Error("Failed to fetch eyes");
        }

        const envelope = await response.json();
        const eyesData = envelope.data || [];

        const mapped: EyeDefinition[] = eyesData.map(
          (eye: Record<string, unknown>) => ({
            id: eye.id,
            name: eye.name,
            description: eye.description,
            iconSvg: eye.iconSvg,
            capabilities: eye.capabilities || [],
            version: eye.version,
            stage: eye.stage,
            inputSchema: eye.inputSchemaJson,
            outputSchema: eye.outputSchemaJson,
          }),
        );

        setAllEyes(mapped);
      } catch (error) {
        console.error("[NodePalette] Failed to fetch eyes:", error);
        setAllEyes([]);
      } finally {
        setLoading(false);
      }
    };

    if (!collapsed) {
      fetchAllEyes();
    }
  }, [collapsed]);

  // Filter eyes based on search
  const filteredEyes = useMemo<EyeDefinition[]>(() => {
    if (!search) return allEyes;
    const lowerSearch = search.toLowerCase();
    return allEyes.filter(
      (eye) =>
        eye.name.toLowerCase().includes(lowerSearch) ||
        eye.description.toLowerCase().includes(lowerSearch),
    );
  }, [allEyes, search]);

  // Filter control nodes based on search
  const filteredControlNodes = useMemo(() => {
    if (!search) return CONTROL_NODES;
    const lowerSearch = search.toLowerCase();
    return CONTROL_NODES.filter(
      (node) =>
        node.label.toLowerCase().includes(lowerSearch) ||
        node.description.toLowerCase().includes(lowerSearch),
    );
  }, [search]);

  // Toggle section expand/collapse
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Drag start handler for Eye nodes
  const onEyeDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, eye: EyeDefinition) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({
          type: "eyeNode",
          data: {
            eyeId: eye.id,
            displayName: eye.name,
            capabilities: eye.capabilities,
            iconSvg: eye.iconSvg,
            stage: eye.stage,
          },
        }),
      );
    },
    [],
  );

  // Drag start handler for control nodes
  const onControlNodeDragStart = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      node: (typeof CONTROL_NODES)[number],
    ) => {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(
        "application/reactflow",
        JSON.stringify({
          type: node.type,
          data: {
            label: node.label,
            ...(node.type === "switch" && { switchConfig: node.defaultConfig }),
            ...(node.type === "if" && { ifConfig: node.defaultConfig }),
            ...(node.type === "loop_over_items" && {
              loopConfig: node.defaultConfig,
            }),
            ...(node.type === "terminal" && {
              verdict: node.defaultConfig.verdict,
            }),
            ...(node.type === "user_input" && {
              promptKey: node.defaultConfig.promptKey,
            }),
          },
        }),
      );
    },
    [],
  );

  // Collapsed view
  if (collapsed) {
    return (
      <div
        className="absolute left-0 top-0 h-full bg-brand-paperElev border-r border-brand-outline flex flex-col items-center py-4"
        style={{ width: LAYOUT.PALETTE_COLLAPSED_WIDTH }}
      >
        <button
          onClick={onToggleCollapse}
          className="p-2 hover:bg-brand-outline/20 rounded-md transition-colors"
          title={PALETTE_TEXT.EXPAND}
        >
          <svg
            className="w-5 h-5 text-brand-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    );
  }

  // Expanded view
  return (
    <div
      className="absolute left-0 top-0 h-full bg-brand-paperElev border-r border-brand-outline flex flex-col overflow-hidden"
      style={{ width: LAYOUT.PALETTE_WIDTH }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-brand-outline">
        <h2 className="text-lg font-semibold text-brand-foreground">Nodes</h2>
        <button
          onClick={onToggleCollapse}
          className="p-1 hover:bg-brand-outline/20 rounded-md transition-colors"
          title={PALETTE_TEXT.COLLAPSE}
        >
          <svg
            className="w-5 h-5 text-brand-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-brand-outline">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search nodes..."
          className="w-full px-3 py-2 bg-brand-paper border border-brand-outline rounded-md text-brand-foreground placeholder-brand-ink/50 focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto">
        {/* Control Nodes Section */}
        <div className="border-b border-brand-outline">
          <button
            onClick={() => toggleSection("control")}
            className="w-full flex items-center justify-between p-4 hover:bg-brand-outline/10 transition-colors"
          >
            <h3 className="text-sm font-semibold text-semantic-muted uppercase tracking-wider">
              Control Nodes
            </h3>
            <svg
              className={`w-4 h-4 text-semantic-muted transition-transform ${expandedSections.control ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {expandedSections.control && (
            <div className="px-4 pb-4 space-y-2">
              {filteredControlNodes.map((node) => {
                const Icon = node.icon;
                return (
                  <div
                    key={node.type}
                    draggable
                    onDragStart={(e) => onControlNodeDragStart(e, node)}
                    className="flex items-start gap-3 p-3 bg-brand-paper border border-brand-outline rounded-lg cursor-grab hover:border-brand-primary hover:shadow-md transition-all"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-brand-foreground">
                        {node.label}
                      </div>
                      <div className="text-xs text-semantic-muted mt-0.5">
                        {node.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Eyes Section */}
        <div>
          <button
            onClick={() => toggleSection("eyes")}
            className="w-full flex items-center justify-between p-4 hover:bg-brand-outline/10 transition-colors"
          >
            <h3 className="text-sm font-semibold text-semantic-muted uppercase tracking-wider">
              Eyes
            </h3>
            <svg
              className={`w-4 h-4 text-semantic-muted transition-transform ${expandedSections.eyes ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>

          {expandedSections.eyes && (
            <div className="px-4 pb-4">
              {loading ? (
                <div className="text-sm text-semantic-muted text-center py-4">
                  Loading eyes...
                </div>
              ) : filteredEyes.length > 0 ? (
                <div className="space-y-2">
                  {filteredEyes.map((eye) => (
                    <div
                      key={eye.id}
                      draggable
                      onDragStart={(e) => onEyeDragStart(e, eye)}
                      className="flex items-start gap-3 p-3 bg-brand-paper border border-brand-outline rounded-lg cursor-grab hover:border-brand-primary hover:shadow-md transition-all"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <EyeIcon eye={eye.name} size={32} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-brand-foreground">
                          {eye.name}
                        </div>
                        <div className="text-xs text-semantic-muted mt-0.5">
                          {eye.description}
                        </div>
                        {eye.version && (
                          <div className="text-xs text-brand-accent mt-1">
                            v{eye.version}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-semantic-muted text-center py-4">
                  {PALETTE_TEXT.NO_RESULTS}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
