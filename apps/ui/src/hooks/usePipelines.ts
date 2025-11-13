/**
 * Pipeline Service Hooks - Phase 10
 *
 * Per R07: Strict typing, no 'any'
 * Per R16: Ready for backend integration (placeholders for now)
 */

import { useState, useCallback } from "react";
import { useAPI } from "./useAPI";
import type { Pipeline, PipelineNode, PipelineEdge } from "@/types/pipeline";

/**
 * Get all pipelines
 * TODO (Backend): Connect to /api/pipelines endpoint
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
 * TODO (Backend): Connect to /api/pipelines/active endpoint
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
      const data = await get<Pipeline>("/api/pipelines/active");
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
 * TODO (Backend): Connect to POST /api/pipelines endpoint
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
        const data = pipelineId
          ? await put<Pipeline>(`/api/pipelines/${pipelineId}`, {
              name,
              description,
              nodes,
              edges,
            })
          : await post<Pipeline>("/api/pipelines", {
              name,
              description,
              nodes,
              edges,
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
 * TODO (Backend): Connect to POST /api/pipelines/{id}/activate endpoint
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
 * TODO (Backend): Connect to DELETE /api/pipelines/{id} endpoint
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
