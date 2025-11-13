/**
 * Model Recommendations Hooks - Phase 5
 *
 * Hooks for accessing and managing model recommendations per eye
 * Per R07: Strict typing, no 'any'
 * Per R13: All logic centralized in hooks
 */

import { useState, useCallback, useMemo } from "react";
import {
  getRecommendedModel,
  getAllRecommendationsForProvider,
  type ModelRecommendation,
} from "@third-eye/config/eye-model-recommendations";
import type { ProviderId } from "@third-eye/types";

/**
 * Get recommended model for a specific eye and provider
 */
export function useModelRecommendation(
  eyeName: string | null,
  provider: ProviderId,
) {
  const recommendation = useMemo(() => {
    if (!eyeName) return null;
    return getRecommendedModel(eyeName, provider);
  }, [eyeName, provider]);

  return recommendation;
}

/**
 * Get all model recommendations for a provider
 */
export function useAllModelRecommendations(provider: ProviderId) {
  const recommendations = useMemo(() => {
    return getAllRecommendationsForProvider(provider);
  }, [provider]);

  return recommendations;
}

/**
 * Model override state management
 */
export interface ModelOverride {
  eyeName: string;
  provider: ProviderId;
  customModel: string;
  reason?: string;
}

export function useModelOverride() {
  const [overrides, setOverrides] = useState<ModelOverride[]>([]);

  const addOverride = useCallback((override: ModelOverride) => {
    setOverrides((prev) => {
      // Remove existing override for same eye+provider
      const filtered = prev.filter(
        (o) =>
          !(o.eyeName === override.eyeName && o.provider === override.provider),
      );
      return [...filtered, override];
    });
  }, []);

  const removeOverride = useCallback(
    (eyeName: string, provider: ProviderId) => {
      setOverrides((prev) =>
        prev.filter((o) => !(o.eyeName === eyeName && o.provider === provider)),
      );
    },
    [],
  );

  const getOverride = useCallback(
    (eyeName: string, provider: ProviderId) => {
      return overrides.find(
        (o) => o.eyeName === eyeName && o.provider === provider,
      );
    },
    [overrides],
  );

  const clearAllOverrides = useCallback(() => {
    setOverrides([]);
  }, []);

  return {
    overrides,
    addOverride,
    removeOverride,
    getOverride,
    clearAllOverrides,
  };
}

/**
 * Success rate category for a recommendation
 */
export function useSuccessRateCategory(
  recommendation: ModelRecommendation | null,
) {
  return useMemo(() => {
    if (!recommendation) return null;

    const rateStr = recommendation.expectedSuccessRate;
    const match = rateStr.match(/(\d+)-?(\d+)?%/);

    if (!match) return null;

    const minRate = parseInt(match[1], 10);
    const maxRate = match[2] ? parseInt(match[2], 10) : minRate;
    const avgRate = (minRate + maxRate) / 2;

    if (avgRate >= 95) return { label: "Excellent", color: "green" };
    if (avgRate >= 85) return { label: "Good", color: "blue" };
    if (avgRate >= 70) return { label: "Fair", color: "yellow" };
    return { label: "Poor", color: "red" };
  }, [recommendation]);
}
