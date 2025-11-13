/**
 * Pipelines Page - Phase 4: Capability-Based Dynamic Routing
 *
 * Transforms from fixed pipeline diagram to capability matrix
 * Shows what eyes CAN do, not what they WILL do
 *
 * Per R04: Memoized callbacks
 * Per R07: Strict typing, no 'any'
 * Per R13: All text from SSOT
 */

"use client";

import { useState, useCallback } from "react";
import { ReactFlowProvider } from "reactflow";
import { PipelineModeSelector } from "@/components/pipeline-builder/PipelineModeSelector";
import { CapabilityMatrix } from "@/components/pipeline-builder/CapabilityMatrix";
import { DynamicRouteVisualizer } from "@/components/pipeline-builder/DynamicRouteVisualizer";
import { LiveRoutingPanel } from "@/components/pipeline-builder/LiveRoutingPanel";
import { PipelineCanvasEnhanced } from "@/components/pipeline-builder/PipelineCanvasEnhanced";
import type { RoutingModeName } from "@third-eye/config/eye-capabilities";

export default function PipelinesPage() {
  const [mode, setMode] = useState<RoutingModeName>("fully_dynamic");
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  const handleModeChange = useCallback((newMode: RoutingModeName) => {
    setMode(newMode);
    setSelectedSession(null); // Clear selection when mode changes
  }, []);

  const handleSessionClick = useCallback((sessionId: string) => {
    setSelectedSession(sessionId);
  }, []);

  const handleCloseVisualizer = useCallback(() => {
    setSelectedSession(null);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
        <h1 className="text-2xl font-bold mb-4">Pipeline Builder</h1>
        <PipelineModeSelector
          currentMode={mode}
          onModeChange={handleModeChange}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Primary view (changes based on mode) */}
        <div className="flex-1 overflow-y-auto p-6">
          {mode === "fully_dynamic" && (
            <div className="space-y-6">
              <CapabilityMatrix mode="dynamic" />
              {selectedSession && (
                <DynamicRouteVisualizer
                  sessionId={selectedSession}
                  onClose={handleCloseVisualizer}
                />
              )}
            </div>
          )}

          {mode === "constrained" && (
            <div className="space-y-6">
              <CapabilityMatrix mode="constrained" />
              {selectedSession && (
                <DynamicRouteVisualizer
                  sessionId={selectedSession}
                  onClose={handleCloseVisualizer}
                />
              )}
              {/* TODO Phase 4B: Add PolicyBuilderInline component here */}
              <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Policy Builder
                </h3>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  Policy builder coming in Phase 4B. You can create policies
                  from the{" "}
                  <a
                    href="/routing-modes"
                    className="underline hover:text-purple-600"
                  >
                    Routing Modes page
                  </a>
                  .
                </p>
              </div>
            </div>
          )}

          {mode === "fixed" && (
            <ReactFlowProvider>
              <div className="h-full">
                <PipelineCanvasEnhanced />
              </div>
            </ReactFlowProvider>
          )}
        </div>

        {/* Right: Live routing panel (only for dynamic/constrained modes) */}
        {(mode === "fully_dynamic" || mode === "constrained") && (
          <div className="w-96 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 overflow-hidden">
            <LiveRoutingPanel
              maxSessions={10}
              autoRefresh={true}
              onSessionClick={handleSessionClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
