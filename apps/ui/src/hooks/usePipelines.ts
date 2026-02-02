/**
 * Pipeline Service Hooks - Phase 10
 *
 * Per R07: Strict typing, no 'any'
 * Per R16: Ready for backend integration (placeholders for now)
 */

import { useState, useCallback } from "react";
import { useAPI } from "./useAPI";
import type { Pipeline, PipelineNode, PipelineEdge } from "@/types/pipeline";
import { MASTER_PIPELINE_ID } from "@third-eye/constants";

/**
 * Get all pipelines
 * Backend: ✅ Connected to /api/pipelines endpoint (apps/server/src/routes/pipelines.ts:49)
 */
export function usePipelines() {
  const { get } = useAPI();
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await get<Pipeline[]>("/api/pipelines");
      setPipelines(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [get]);

  return { pipelines, loading, error, refetch: fetch };
}

/**
 * Get active pipeline
 * Backend: GET /api/pipelines/active endpoint not implemented
 * Workaround: Client-side filtering for active=true with max version
 * Per MASTER_PIPELINE_ID: Prefer overseer-dynamic-master as the production pipeline
 */
export function useActivePipeline() {
  const { get } = useAPI();
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Workaround: Fetch all pipelines and filter client-side
      const allPipelines = await get<Pipeline[]>("/api/pipelines");

      // Filter for active pipelines
      const activePipelines = allPipelines.filter((p) => p.active);

      if (activePipelines.length === 0) {
        setPipeline(null);
      } else if (activePipelines.length === 1) {
        // Only one active pipeline - use it
        setPipeline(activePipelines[0]);
      } else {
        // Multiple active pipelines - prefer master, then highest version
        // CRITICAL FIX: Explicit master selection prevents wrong pipeline in Fixed Template mode
        // Per R13: Import from SSOT, no hardcoded string literals
        const masterPipeline = activePipelines.find(
          (p) => p.id === MASTER_PIPELINE_ID,
        );

        if (masterPipeline) {
          setPipeline(masterPipeline);
        } else {
          // Fallback: Get pipeline with highest version number
          const latestActive = activePipelines.reduce((prev, current) =>
            current.version > prev.version ? current : prev,
          );
          setPipeline(latestActive);
        }
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [get]);

  return { pipeline, loading, error, refetch: fetch };
}

/**
 * Save pipeline
 * Backend: ✅ Connected to POST /api/pipelines endpoint (apps/server/src/routes/pipelines.ts:132)
 * Backend: ✅ Connected to PUT /api/pipelines/:id endpoint (apps/server/src/routes/pipelines.ts:192)
 */
export function useSavePipeline() {
  const { post, put } = useAPI();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const save = useCallback(
    async (
      pipelineId: string | null,
      name: string,
      description: string,
      nodes: PipelineNode[],
      edges: PipelineEdge[],
    ): Promise<Pipeline | null> => {
      setLoading(true);
      setError(null);
      try {
        // Backend expects workflow: {nodes, edges} format, stored as workflowJson
        const workflow = { nodes, edges };
        const data = pipelineId
          ? await put<Pipeline>(`/api/pipelines/${pipelineId}`, {
              name,
              description,
              workflow,
            })
          : await post<Pipeline>("/api/pipelines", {
              name,
              description,
              workflow,
            });
        return data;
      } catch (err) {
        setError(err as Error);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [post, put],
  );

  return { save, loading, error };
}

/**
 * Activate pipeline
 * Backend: ✅ Connected to POST /api/pipelines/:id/activate endpoint (apps/server/src/routes/pipelines.ts:257)
 */
export function useActivatePipeline() {
  const { post } = useAPI();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const activate = useCallback(
    async (pipelineId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await post(`/api/pipelines/${pipelineId}/activate`, {});
        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [post],
  );

  return { activate, loading, error };
}

/**
 * Delete pipeline
 * Backend: ✅ Connected to DELETE /api/pipelines/:id endpoint (apps/server/src/routes/pipelines.ts:307)
 */
export function useDeletePipeline() {
  const { delete: del } = useAPI();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const deletePipeline = useCallback(
    async (pipelineId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        await del(`/api/pipelines/${pipelineId}`);
        return true;
      } catch (err) {
        setError(err as Error);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [del],
  );

  return { deletePipeline, loading, error };
}
