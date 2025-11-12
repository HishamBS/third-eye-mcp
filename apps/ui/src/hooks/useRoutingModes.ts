/**
 * Routing Modes Hooks - Phase 3
 *
 * API hooks for policies and templates management
 * Per R07: Strict typing, no 'any'
 * Per R13: Centralized API logic in hooks
 */

import { useState, useCallback, useEffect } from 'react';
import { useAPI } from './useAPI';

// ============================================================================
// Types
// ============================================================================

export interface RoutingPolicy {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly mandatoryEyes: readonly string[];
  readonly forbiddenEyes?: readonly string[];
  readonly minValidationEyes?: number;
  readonly securityRequired: boolean;
  readonly alwaysConfirmIntent: boolean;
  readonly customConstraints?: readonly Constraint[];
  readonly isActive: boolean;
  readonly createdAt: number;
}

export interface Constraint {
  readonly type: string;
  readonly value: unknown;
  readonly reason: string;
}

export interface PipelineTemplate {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly eyes: readonly string[];
  readonly strict: boolean;
  readonly autoTriggerPattern?: string;
  readonly createdBy?: string;
  readonly isPublic: boolean;
  readonly usageCount: number;
  readonly createdAt: number;
}

export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

export interface TemplateExecutionPlan {
  readonly templateId: string;
  readonly templateName: string;
  readonly eyeSequence: readonly string[];
  readonly strict: boolean;
  readonly reasoning: string;
}

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  mandatoryEyes: string[];
  forbiddenEyes?: string[];
  minValidationEyes?: number;
  securityRequired?: boolean;
  alwaysConfirmIntent?: boolean;
  customConstraints?: Constraint[];
}

export interface UpdatePolicyRequest extends Partial<CreatePolicyRequest> {
  isActive?: boolean;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  eyes: string[];
  strict?: boolean;
  autoTriggerPattern?: string;
  createdBy?: string;
  isPublic?: boolean;
}

// ============================================================================
// Policies Hooks
// ============================================================================

/**
 * List all policies with optional filtering
 */
export function usePolicies(filters?: { active?: boolean }) {
  const api = useAPI();
  const [policies, setPolicies] = useState<RoutingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.active !== undefined) {
        params.set('active', filters.active.toString());
      }
      const queryString = params.toString();
      const url = `/api/policies${queryString ? `?${queryString}` : ''}`;
      const response = await api.get<{ data: { policies: RoutingPolicy[] } }>(url);
      setPolicies(response.data.policies);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch policies'));
    } finally {
      setLoading(false);
    }
  }, [api, filters?.active]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return { policies, loading, error, refetch: fetchPolicies };
}

/**
 * Get single policy by ID
 */
export function usePolicy(policyId: string | null) {
  const api = useAPI();
  const [policy, setPolicy] = useState<RoutingPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPolicy = useCallback(async () => {
    if (!policyId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ data: { policy: RoutingPolicy } }>(`/api/policies/${policyId}`);
      setPolicy(response.data.policy);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch policy'));
    } finally {
      setLoading(false);
    }
  }, [api, policyId]);

  useEffect(() => {
    fetchPolicy();
  }, [fetchPolicy]);

  return { policy, loading, error, refetch: fetchPolicy };
}

/**
 * Create new policy
 */
export function useCreatePolicy() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createPolicy = useCallback(async (request: CreatePolicyRequest): Promise<RoutingPolicy> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<{ data: { policy: RoutingPolicy } }>('/api/policies', request);
      return response.data.policy;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create policy');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { createPolicy, loading, error };
}

/**
 * Update existing policy
 */
export function useUpdatePolicy() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updatePolicy = useCallback(async (policyId: string, request: UpdatePolicyRequest): Promise<RoutingPolicy> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.put<{ data: { policy: RoutingPolicy } }>(`/api/policies/${policyId}`, request);
      return response.data.policy;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update policy');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { updatePolicy, loading, error };
}

/**
 * Delete policy
 */
export function useDeletePolicy() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deletePolicy = useCallback(async (policyId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await api.delete(`/api/policies/${policyId}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete policy');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { deletePolicy, loading, error };
}

/**
 * Test policy against eye sequence
 */
export function useTestPolicy() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const testPolicy = useCallback(async (policyId: string, eyeSequence: string[]): Promise<PolicyValidationResult> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<{ data: { result: PolicyValidationResult } }>(
        `/api/policies/${policyId}/test`,
        { eyeSequence }
      );
      return response.data.result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to test policy');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { testPolicy, loading, error };
}

/**
 * Activate policy
 */
export function useActivatePolicy() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const activatePolicy = useCallback(async (policyId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await api.post(`/api/policies/${policyId}/activate`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to activate policy');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { activatePolicy, loading, error };
}

/**
 * Deactivate policy
 */
export function useDeactivatePolicy() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deactivatePolicy = useCallback(async (policyId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await api.post(`/api/policies/${policyId}/deactivate`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to deactivate policy');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { deactivatePolicy, loading, error };
}

// ============================================================================
// Templates Hooks
// ============================================================================

/**
 * List all templates with optional filtering
 */
export function useTemplates(filters?: { public?: boolean; createdBy?: string }) {
  const api = useAPI();
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filters?.public !== undefined) {
        params.set('public', filters.public.toString());
      }
      if (filters?.createdBy) {
        params.set('createdBy', filters.createdBy);
      }
      const queryString = params.toString();
      const url = `/api/templates${queryString ? `?${queryString}` : ''}`;
      const response = await api.get<{ data: { templates: PipelineTemplate[] } }>(url);
      setTemplates(response.data.templates);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch templates'));
    } finally {
      setLoading(false);
    }
  }, [api, filters?.public, filters?.createdBy]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  return { templates, loading, error, refetch: fetchTemplates };
}

/**
 * Get single template by ID
 */
export function useTemplate(templateId: string | null) {
  const api = useAPI();
  const [template, setTemplate] = useState<PipelineTemplate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTemplate = useCallback(async () => {
    if (!templateId) return;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get<{ data: { template: PipelineTemplate } }>(`/api/templates/${templateId}`);
      setTemplate(response.data.template);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch template'));
    } finally {
      setLoading(false);
    }
  }, [api, templateId]);

  useEffect(() => {
    fetchTemplate();
  }, [fetchTemplate]);

  return { template, loading, error, refetch: fetchTemplate };
}

/**
 * Create new template
 */
export function useCreateTemplate() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTemplate = useCallback(async (request: CreateTemplateRequest): Promise<PipelineTemplate> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<{ data: { template: PipelineTemplate } }>('/api/templates', request);
      return response.data.template;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create template');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { createTemplate, loading, error };
}

/**
 * Delete template
 */
export function useDeleteTemplate() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteTemplate = useCallback(async (templateId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await api.delete(`/api/templates/${templateId}`);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete template');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { deleteTemplate, loading, error };
}

/**
 * Find template by auto-trigger pattern
 */
export function useMatchTemplate() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const matchTemplate = useCallback(async (request: string): Promise<{ matched: boolean; template: PipelineTemplate | null }> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<{ data: { matched: boolean; template: PipelineTemplate | null } }>(
        '/api/templates/match',
        { request }
      );
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to match template');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { matchTemplate, loading, error };
}

/**
 * Execute template (get execution plan)
 */
export function useExecuteTemplate() {
  const api = useAPI();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeTemplate = useCallback(async (templateId: string): Promise<TemplateExecutionPlan> => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<{ data: { executionPlan: TemplateExecutionPlan } }>(
        `/api/templates/${templateId}/execute`
      );
      return response.data.executionPlan;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to execute template');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [api]);

  return { executeTemplate, loading, error };
}
