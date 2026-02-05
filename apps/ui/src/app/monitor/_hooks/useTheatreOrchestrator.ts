"use client";

/**
 * useTheatreOrchestrator - Master controller for the theatrical experience
 *
 * Orchestrates:
 * - Curtain open/close animations
 * - Eye entrances and exits
 * - Spotlight positioning
 * - Act transitions
 * - Celebration triggers
 * - Overall theatre state
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type {
  TheatreState,
  TheatreOrchestratorReturn,
  CurtainState,
  EyeCharacterState,
  SpotlightIntensity,
  StoryActId,
  NarrativeEvent,
  ActProgress,
  CelebrationType,
} from "@third-eye/types";
import { STORY_ACTS, getActForEvent, getActForEye } from "@third-eye/constants";
import { resolveEyePersona } from "@/lib/eye-persona-resolver";

/**
 * Initial act progress state
 */
const INITIAL_ACT_PROGRESS: Record<StoryActId, ActProgress> = {
  "act-1": {
    actId: "act-1",
    completedEvents: 0,
    totalEvents: 0,
    percentage: 0,
    isActive: false,
    isComplete: false,
  },
  "act-2": {
    actId: "act-2",
    completedEvents: 0,
    totalEvents: 0,
    percentage: 0,
    isActive: false,
    isComplete: false,
  },
  "act-3": {
    actId: "act-3",
    completedEvents: 0,
    totalEvents: 0,
    percentage: 0,
    isActive: false,
    isComplete: false,
  },
};

export interface UseTheatreOrchestratorOptions {
  /** Session ID */
  sessionId: string | null;
  /** Initial connection status */
  connectionStatus?: TheatreState["connectionStatus"];
  /** Callback when state changes */
  onStateChange?: (state: TheatreState) => void;
}

export function useTheatreOrchestrator({
  sessionId,
  connectionStatus = "disconnected",
  onStateChange,
}: UseTheatreOrchestratorOptions): TheatreOrchestratorReturn & {
  processNarrativeEvent: (event: NarrativeEvent) => void;
  setConnectionStatus: (status: TheatreState["connectionStatus"]) => void;
} {
  // Curtain state
  const [curtainState, setCurtainState] = useState<CurtainState>("closed");

  // Act state
  const [currentAct, setCurrentAct] = useState<StoryActId>("act-1");
  const [actProgress, setActProgress] =
    useState<Record<StoryActId, ActProgress>>(INITIAL_ACT_PROGRESS);
  const [overallProgress, setOverallProgress] = useState(0);

  // Character state
  const [activeEye, setActiveEye] = useState<string | null>(null);
  const [eyeState, setEyeState] = useState<EyeCharacterState>("offstage");
  const [waitingEyes, setWaitingEyes] = useState<string[]>([]);
  const [completedEyes, setCompletedEyes] = useState<
    Array<{ eye: string; status: "success" | "warning" | "error" }>
  >([]);

  // Spotlight state
  const [spotlightPosition, setSpotlightPosition] = useState({ x: 50, y: 40 });
  const [spotlightColor, setSpotlightColor] = useState("#d4af37");
  const [spotlightIntensity, setSpotlightIntensity] =
    useState<SpotlightIntensity>("dim");

  // Dialogue state
  const [currentDialogue, setCurrentDialogue] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [dialogueQueue, setDialogueQueue] = useState<string[]>([]);

  // Interactive state
  const [pendingAction, setPendingAction] =
    useState<TheatreState["pendingAction"]>(null);

  // Celebration state
  const [celebrationState, setCelebrationState] =
    useState<TheatreState["celebrationState"]>(null);

  // Event history
  const [events, setEvents] = useState<NarrativeEvent[]>([]);

  // Connection status
  const [connStatus, setConnStatus] =
    useState<TheatreState["connectionStatus"]>(connectionStatus);

  // Refs for animation timing
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Open curtain
  const openCurtain = useCallback(() => {
    setCurtainState("opening");
    setTimeout(() => {
      setCurtainState("open");
    }, 1200);
  }, []);

  // Close curtain
  const closeCurtain = useCallback(() => {
    setCurtainState("closing");
    setTimeout(() => {
      setCurtainState("closed");
    }, 1000);
  }, []);

  // Enter Eye on stage
  const enterEye = useCallback((eyeId: string) => {
    const persona = resolveEyePersona(eyeId);

    // Update spotlight
    setSpotlightColor(persona.color.primary);
    setSpotlightIntensity("normal");

    // Set active Eye
    setActiveEye(eyeId);
    setEyeState("entering");

    // Remove from waiting list if present
    setWaitingEyes((prev) => prev.filter((e) => e !== eyeId));

    // Transition to active after entrance animation
    setTimeout(() => {
      setEyeState("active");
    }, persona.animationSpeeds.entrance);
  }, []);

  // Exit Eye from stage
  const exitEye = useCallback(
    (eyeId: string, status: "success" | "warning" | "error" = "success") => {
      if (activeEye !== eyeId) return;

      setEyeState("exiting");

      setTimeout(() => {
        setCompletedEyes((prev) => [...prev, { eye: eyeId, status }]);
        setActiveEye(null);
        setEyeState("offstage");
        setCurrentDialogue(null);
        setSpotlightIntensity("dim");
      }, 500);
    },
    [activeEye],
  );

  // Speak dialogue
  const speak = useCallback((dialogue: string) => {
    setCurrentDialogue(dialogue);
    setIsTyping(true);
    setEyeState("speaking");
    setSpotlightIntensity("bright");

    // Typing duration estimate (40ms per char)
    const typingDuration = Math.min(dialogue.length * 40, 3000);

    setTimeout(() => {
      setIsTyping(false);
      setEyeState("active");
      setSpotlightIntensity("normal");
    }, typingDuration);
  }, []);

  // Trigger celebration
  const triggerCelebration = useCallback(
    (type: CelebrationType, message: string) => {
      setCelebrationState({ type, message });
      setEyeState("celebrating");

      // Auto-dismiss after delay
      const duration =
        type === "finale" ? 5000 : type === "major" ? 3000 : 2000;
      setTimeout(() => {
        setCelebrationState(null);
        setEyeState("active");
      }, duration);
    },
    [],
  );

  // Set spotlight
  const setSpotlight = useCallback(
    (color: string, intensity: SpotlightIntensity) => {
      setSpotlightColor(color);
      setSpotlightIntensity(intensity);
    },
    [],
  );

  // Transition to act
  const transitionToAct = useCallback((actId: StoryActId) => {
    setCurrentAct(actId);

    // Update act progress
    setActProgress((prev) => {
      const updated = { ...prev };
      for (const id of Object.keys(updated) as StoryActId[]) {
        updated[id] = {
          ...updated[id],
          isActive: id === actId,
          isComplete: id < actId,
        };
      }
      return updated;
    });
  }, []);

  // Process narrative event
  const processNarrativeEvent = useCallback(
    (event: NarrativeEvent) => {
      // Add to events
      setEvents((prev) => [...prev, event]);

      // Update act if changed
      if (event.actId !== currentAct) {
        transitionToAct(event.actId);
      }

      // Handle Eye transitions
      const eyeFromEvent = event.narrator;
      if (eyeFromEvent !== activeEye) {
        // Exit current Eye if any
        if (activeEye) {
          exitEye(activeEye, "success");
        }

        // Small delay then enter new Eye
        setTimeout(
          () => {
            enterEye(eyeFromEvent);
          },
          activeEye ? 600 : 100,
        );
      }

      // Speak narrative after Eye is on stage
      const speakDelay = eyeFromEvent !== activeEye ? 800 : 100;
      setTimeout(() => {
        speak(event.narrative);
      }, speakDelay);

      // Handle pending action
      if (event.action) {
        setPendingAction({
          type: event.action,
          data: event.metadata,
        });
      }

      // Handle celebration
      if (event.celebration) {
        const celebrationDelay = event.narrative.length * 40 + 500;
        setTimeout(() => {
          triggerCelebration(event.celebration!, event.title);
        }, celebrationDelay);
      }

      // Update progress
      setActProgress((prev) => {
        const actId = event.actId;
        const current = prev[actId];
        return {
          ...prev,
          [actId]: {
            ...current,
            completedEvents: current.completedEvents + 1,
            percentage: Math.min(
              ((current.completedEvents + 1) /
                Math.max(current.totalEvents, 1)) *
                100,
              100,
            ),
          },
        };
      });
    },
    [
      currentAct,
      activeEye,
      enterEye,
      exitEye,
      speak,
      triggerCelebration,
      transitionToAct,
    ],
  );

  // Set connection status
  const setConnectionStatus = useCallback(
    (status: TheatreState["connectionStatus"]) => {
      setConnStatus(status);

      // Auto-open curtain on connect
      if (status === "connected" && curtainState === "closed") {
        openCurtain();
      }
    },
    [curtainState, openCurtain],
  );

  // Build complete state
  const state: TheatreState = useMemo(
    () => ({
      sessionId,
      connectionStatus: connStatus,
      curtainState,
      currentAct,
      actProgress,
      overallProgress,
      activeEye,
      eyeState,
      waitingEyes,
      completedEyes,
      spotlightPosition,
      spotlightColor,
      spotlightIntensity,
      currentDialogue,
      isTyping,
      dialogueQueue,
      pendingAction,
      celebrationState,
      events,
    }),
    [
      sessionId,
      connStatus,
      curtainState,
      currentAct,
      actProgress,
      overallProgress,
      activeEye,
      eyeState,
      waitingEyes,
      completedEyes,
      spotlightPosition,
      spotlightColor,
      spotlightIntensity,
      currentDialogue,
      isTyping,
      dialogueQueue,
      pendingAction,
      celebrationState,
      events,
    ],
  );

  // Notify state change
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  return {
    state,
    openCurtain,
    closeCurtain,
    enterEye,
    exitEye,
    speak,
    triggerCelebration,
    setSpotlight,
    transitionToAct,
    processNarrativeEvent,
    setConnectionStatus,
  };
}
