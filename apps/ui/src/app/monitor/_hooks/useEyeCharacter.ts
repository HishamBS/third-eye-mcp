"use client";

/**
 * useEyeCharacter - Dynamic Eye persona resolution hook
 *
 * Resolves Eye persona with:
 * - Built-in defaults for the 8 known Eyes
 * - Custom pipeline config support
 * - Fallback generation for unknown Eyes
 */

import { useMemo } from "react";
import type {
  EyePersonaConfig,
  PipelineContext,
  EyeCharacterReturn,
} from "@third-eye/types";
import {
  resolveEyePersona,
  getEntranceAnimation,
  getExitAnimation,
} from "@/lib/eye-persona-resolver";
import { formatPhrase } from "@third-eye/constants";

export interface UseEyeCharacterOptions {
  /** Eye identifier */
  eyeId: string;
  /** Pipeline context for custom Eye config */
  pipelineContext?: PipelineContext;
}

export function useEyeCharacter({
  eyeId,
  pipelineContext,
}: UseEyeCharacterOptions): EyeCharacterReturn {
  // Resolve persona
  const persona = useMemo(
    () => resolveEyePersona(eyeId, pipelineContext),
    [eyeId, pipelineContext],
  );

  // Format dialogue helper
  const formatDialogue = useMemo(() => {
    return (template: string, variables: Record<string, string | number>) => {
      return formatPhrase(template, variables);
    };
  }, []);

  // Get entrance animation
  const getEntranceAnimationConfig = useMemo(() => {
    return () => getEntranceAnimation(persona.entranceDirection);
  }, [persona.entranceDirection]);

  // Get exit animation
  const getExitAnimationConfig = useMemo(() => {
    return () => getExitAnimation(persona.entranceDirection);
  }, [persona.entranceDirection]);

  return {
    persona,
    formatDialogue,
    getEntranceAnimation: getEntranceAnimationConfig,
    getExitAnimation: getExitAnimationConfig,
  };
}

/**
 * Hook to get multiple Eye personas at once
 */
export function useEyePersonas(
  eyeIds: string[],
  pipelineContext?: PipelineContext,
): Record<string, EyePersonaConfig> {
  return useMemo(() => {
    const personas: Record<string, EyePersonaConfig> = {};
    for (const eyeId of eyeIds) {
      personas[eyeId] = resolveEyePersona(eyeId, pipelineContext);
    }
    return personas;
  }, [eyeIds, pipelineContext]);
}
