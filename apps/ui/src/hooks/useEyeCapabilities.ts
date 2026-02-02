/**
 * Eye Capabilities Hooks - Phase 4
 *
 * API hooks for accessing eye capability data for CapabilityMatrix component
 * Per R07: Strict typing, no 'any'
 * Per R13: Centralized API logic in hooks
 */

import { useState, useCallback, useEffect } from "react";
import { useAPI } from "./useAPI";

// ============================================================================
// Types
// ============================================================================

export interface EyeWithCapabilities {
  readonly id: string;
  readonly name: string;
  readonly version: number;
  readonly description: string;
  readonly capabilityTags: readonly string[];
  readonly inputSchema: unknown;
  readonly outputSchema: unknown;
  readonly personaId: string | null;
  readonly iconSvg: string;
  readonly active: boolean;
  readonly createdAt: number;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get all eyes with their capability tags
 * Used by CapabilityMatrix to display what each eye can do
 */
export function useEyeCapabilities() {
  const api = useAPI();
  const [eyes, setEyes] = useState<EyeWithCapabilities[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchEyes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // useAPI automatically unwraps the response envelope
      const data = await api.get<EyeWithCapabilities[]>("/api/eyes/all");

      if (Array.isArray(data)) {
        setEyes(data);
      } else {
        throw new Error("Invalid response format from eyes API");
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch eyes"));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchEyes();
  }, [fetchEyes]);

  return { eyes, loading, error, refetch: fetchEyes };
}

/**
 * Get a specific eye with capabilities by ID
 */
export function useEyeCapability(eyeId: string | null) {
  const api = useAPI();
  const [eye, setEye] = useState<EyeWithCapabilities | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEye = useCallback(async () => {
    if (!eyeId) {
      setEye(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // useAPI automatically unwraps the response envelope
      const data = await api.get<EyeWithCapabilities>(`/api/eyes/${eyeId}`);

      if (data && typeof data === "object" && "id" in data) {
        setEye(data);
      } else {
        throw new Error(`Eye ${eyeId} not found`);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch eye"));
      setEye(null);
    } finally {
      setLoading(false);
    }
  }, [api, eyeId]);

  useEffect(() => {
    fetchEye();
  }, [fetchEye]);

  return { eye, loading, error, refetch: fetchEye };
}

/**
 * Helper: Get all unique capability tags across all eyes
 */
export function getAllCapabilityTags(
  eyes: readonly EyeWithCapabilities[],
): readonly string[] {
  const allTags = new Set<string>();
  for (const eye of eyes) {
    for (const tag of eye.capabilityTags) {
      allTags.add(tag);
    }
  }
  return Array.from(allTags).sort();
}

/**
 * Helper: Filter eyes by capability tag
 */
export function getEyesByCapability(
  eyes: readonly EyeWithCapabilities[],
  capabilityTag: string,
): readonly EyeWithCapabilities[] {
  return eyes.filter((eye) => eye.capabilityTags.includes(capabilityTag));
}
