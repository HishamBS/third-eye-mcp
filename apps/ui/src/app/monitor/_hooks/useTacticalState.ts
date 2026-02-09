"use client";

/**
 * useTacticalState - Central state manager for the Tactical Operations view
 *
 * Replaces useTheatreOrchestrator with a simpler, data-driven approach.
 * Tracks eye states, pipeline progress, quality scores, and pending actions.
 */

import { useState, useCallback, useMemo } from "react";
import { type EyeId, ALL_EYE_IDS } from "@third-eye/constants";
import type { TacticalEvent } from "./useEventTransformer";
import type { PendingAction } from "./useConversationFeed";

type EyeStatus = "standby" | "active" | "complete" | "error";

export interface QualityScore {
  overall: number;
  breakdown: Record<string, number>;
}

export interface TacticalState {
  sessionId: string | null;
  connectionStatus: "connected" | "disconnected" | "reconnecting";
  viewMode: "strategic" | "tactical";
  activeEye: EyeId | null;
  selectedEye: EyeId | null;
  eyeStates: Record<string, EyeStatus>;
  pipelineProgress: number;
  pipelineRoute: EyeId[];
  qualityScore: QualityScore | null;
  pendingAction: PendingAction | null;
  missionSummary: string;
}

function buildInitialEyeStates(): Record<string, EyeStatus> {
  const states: Record<string, EyeStatus> = {};
  for (const eyeId of ALL_EYE_IDS) {
    states[eyeId] = "standby";
  }
  return states;
}

export interface UseTacticalStateOptions {
  sessionId: string | null;
  initialConnectionStatus?: TacticalState["connectionStatus"];
}

export interface UseTacticalStateReturn {
  state: TacticalState;
  processEvent: (event: TacticalEvent) => void;
  setConnectionStatus: (status: TacticalState["connectionStatus"]) => void;
  setViewMode: (mode: TacticalState["viewMode"]) => void;
  toggleViewMode: () => void;
  selectEye: (eyeId: EyeId) => void;
  clearPendingAction: () => void;
  reset: () => void;
}

export function useTacticalState({
  sessionId,
  initialConnectionStatus = "disconnected",
}: UseTacticalStateOptions): UseTacticalStateReturn {
  const [connectionStatus, setConnectionStatusState] = useState<
    TacticalState["connectionStatus"]
  >(initialConnectionStatus);
  const [viewMode, setViewMode] =
    useState<TacticalState["viewMode"]>("tactical");
  const [activeEye, setActiveEye] = useState<EyeId | null>(null);
  const [eyeStates, setEyeStates] = useState<Record<string, EyeStatus>>(
    buildInitialEyeStates,
  );
  const [pipelineRoute, setPipelineRoute] = useState<EyeId[]>([]);
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [selectedEye, setSelectedEye] = useState<EyeId | null>(null);
  const [missionSummary, setMissionSummary] = useState<string>("");

  const pipelineProgress = useMemo((): number => {
    if (pipelineRoute.length === 0) return 0;
    let completed = 0;
    for (const eyeId of pipelineRoute) {
      if (eyeStates[eyeId] === "complete") {
        completed += 1;
      }
    }
    return Math.round((completed / pipelineRoute.length) * 100);
  }, [pipelineRoute, eyeStates]);

  const processEvent = useCallback((event: TacticalEvent) => {
    const { eye, eyePhase, type, data } = event;

    // Update eye states based on phase
    if (eye && eyePhase) {
      setEyeStates((prev) => {
        const next = { ...prev };
        switch (eyePhase) {
          case "started":
            next[eye] = "active";
            break;
          case "analyzing":
            next[eye] = "active";
            break;
          case "complete":
            next[eye] = "complete";
            break;
          case "error":
            next[eye] = "error";
            break;
        }
        return next;
      });
    }

    // Track active eye
    if (eye && (eyePhase === "started" || eyePhase === "analyzing")) {
      setActiveEye(eye);
    }
    if (eye && (eyePhase === "complete" || eyePhase === "error")) {
      setActiveEye((current) => (current === eye ? null : current));
    }

    // Extract pipeline route from overseer
    if (type === "overseer_route" && Array.isArray(data.route)) {
      const validRoute = (data.route as string[]).filter((id): id is EyeId =>
        ALL_EYE_IDS.includes(id as EyeId),
      );
      setPipelineRoute(validRoute);
    }

    // Extract quality scores
    if (
      typeof data.score === "number" ||
      typeof data.qualityScore === "number"
    ) {
      const score = (data.score as number) ?? (data.qualityScore as number);
      setQualityScore((prev) => {
        const breakdown = { ...(prev?.breakdown ?? {}) };
        if (eye) {
          breakdown[eye] = score;
        }
        const values = Object.values(breakdown);
        const overall =
          values.length > 0
            ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            : score;
        return { overall, breakdown };
      });
    }

    // Track pending actions
    if (type === "clarification_asked") {
      setPendingAction({
        type: "clarification",
        id: (data.clarificationId as string) ?? (data.id as string) ?? event.id,
        question: (data.question as string) ?? event.ui.summary,
        options: Array.isArray(data.options)
          ? (data.options as string[])
          : undefined,
      });
    } else if (type === "plan_presented" || type === "rinnegan_complete") {
      setPendingAction({
        type: "plan_approval",
        id: (data.planId as string) ?? (data.id as string) ?? event.id,
        planContent: event.ui.detail ?? event.ui.summary,
        planSteps:
          typeof data.stepCount === "number" ? data.stepCount : undefined,
      });
    } else if (type === "intent_confirmation_required") {
      setPendingAction({
        type: "intent_confirmation",
        id: (data.confirmationId as string) ?? (data.id as string) ?? event.id,
        question: (data.question as string) ?? event.ui.summary,
      });
    } else if (
      type === "clarification_answered" ||
      type === "plan_approved" ||
      type === "plan_rejected"
    ) {
      setPendingAction(null);
    }

    // Extract mission summary
    if (type === "session_status" && typeof data.summary === "string") {
      setMissionSummary(data.summary);
    }
    if (type === "overseer_route" && typeof data.summary === "string") {
      setMissionSummary(data.summary);
    }
  }, []);

  const setConnectionStatus = useCallback(
    (status: TacticalState["connectionStatus"]) => {
      setConnectionStatusState(status);
    },
    [],
  );

  const setViewModeExplicit = useCallback((mode: TacticalState["viewMode"]) => {
    setViewMode(mode);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "strategic" ? "tactical" : "strategic"));
  }, []);

  const selectEye = useCallback((eyeId: EyeId) => {
    setSelectedEye((prev) => (prev === eyeId ? null : eyeId));
  }, []);

  const clearPendingAction = useCallback(() => {
    setPendingAction(null);
  }, []);

  const reset = useCallback(() => {
    setConnectionStatusState("disconnected");
    setViewMode("tactical");
    setActiveEye(null);
    setSelectedEye(null);
    setEyeStates(buildInitialEyeStates());
    setPipelineRoute([]);
    setQualityScore(null);
    setPendingAction(null);
    setMissionSummary("");
  }, []);

  const state: TacticalState = useMemo(
    () => ({
      sessionId,
      connectionStatus,
      viewMode,
      activeEye,
      selectedEye,
      eyeStates,
      pipelineProgress,
      pipelineRoute,
      qualityScore,
      pendingAction,
      missionSummary,
    }),
    [
      sessionId,
      connectionStatus,
      viewMode,
      activeEye,
      selectedEye,
      eyeStates,
      pipelineProgress,
      pipelineRoute,
      qualityScore,
      pendingAction,
      missionSummary,
    ],
  );

  return {
    state,
    processEvent,
    setConnectionStatus,
    setViewMode: setViewModeExplicit,
    toggleViewMode,
    selectEye,
    clearPendingAction,
    reset,
  };
}
