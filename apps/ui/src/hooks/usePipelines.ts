/**
 * Pipeline Service Hooks - Phase 10
 *
 * Per R07: Strict typing, no 'any'
 * Per R16: Connected to backend pipeline endpoints
 */

import { useState, useCallback } from "react";
import { useAPI } from "./useAPI";
import type { Pipeline, PipelineNode, PipelineEdge } from "@/types/pipeline";

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
 * Backend: GET /api/pipelines/active - returns highest-version active pipeline
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
      const data = await get<Pipeline | null>("/api/pipelines/active");
      setPipeline(data);
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
