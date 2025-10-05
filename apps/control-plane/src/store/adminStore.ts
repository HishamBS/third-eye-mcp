import { create } from 'zustand';
import {
  getApiKeys,
  postApiKey,
  rotateApiKey,
  patchApiKey,
  revokeApiKey,
  restoreApiKey,
  fetchMetricsOverview,
  fetchAuditLog,
  fetchAdminOptions,
  fetchEnvironmentSettings,
  updateEnvironmentSettings,
  fetchPersonas as fetchPersonasApi,
  stagePersonaPrompt as stagePersonaPromptApi,
  publishPersonaPrompt as publishPersonaPromptApi,
  fetchTenants as fetchTenantsApi,
  createTenant as createTenantApi,
  updateTenant as updateTenantApi,
  archiveTenant as archiveTenantApi,
  restoreTenant as restoreTenantApi,
} from '../lib/api';
import type {
  AdminStore,
  AdminStoreState,
  ApiKeyCreatePayload,
  ApiKeyUpdatePayload,
  TenantCreatePayload,
  TenantUpdatePayload,
  TenantEntry,
} from '../types/admin';

const initialState: AdminStoreState = {
  apiKeys: [],
  loadingKeys: false,
  lastSecret: null,
  metrics: null,
  loadingMetrics: false,
  audit: [],
  loadingAudit: false,
  error: null,
  options: null,
  loadingOptions: false,
  environmentSettings: null,
  loadingEnvironmentSettings: false,
  personas: null,
  loadingPersonas: false,
  tenants: [],
  loadingTenants: false,
};

export const useAdminStore = create<AdminStore>((set, get) => ({
  ...initialState,
  setError: (message) => set({ error: message }),
  clearSecret: () => set({ lastSecret: null }),
  fetchApiKeys: async (apiKey, options) => {
    set({ loadingKeys: true, error: null });
    try {
      const items = await getApiKeys(apiKey, options);
      set({ apiKeys: items });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch API keys' });
    } finally {
      set({ loadingKeys: false });
    }
  },
  createApiKey: async (apiKey, payload: ApiKeyCreatePayload) => {
    try {
      const secret = await postApiKey(apiKey, payload);
      set({ lastSecret: secret });
      await get().fetchApiKeys(apiKey);
      return secret;
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to create API key' });
      throw error;
    }
  },
  rotateApiKey: async (apiKey, keyId) => {
    try {
      const secret = await rotateApiKey(apiKey, keyId);
      set({ lastSecret: secret });
      await get().fetchApiKeys(apiKey, { includeRevoked: true });
      return secret;
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to rotate API key' });
      throw error;
    }
  },
  updateApiKey: async (apiKey, keyId, payload: ApiKeyUpdatePayload) => {
    try {
      await patchApiKey(apiKey, keyId, payload);
      await get().fetchApiKeys(apiKey, { includeRevoked: true });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to update API key' });
      throw error;
    }
  },
  revokeApiKey: async (apiKey, keyId, reason) => {
    try {
      await revokeApiKey(apiKey, keyId, reason);
      await get().fetchApiKeys(apiKey, { includeRevoked: true });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to revoke API key' });
      throw error;
    }
  },
  restoreApiKey: async (apiKey, keyId) => {
    try {
      await restoreApiKey(apiKey, keyId);
      await get().fetchApiKeys(apiKey, { includeRevoked: true });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to restore API key' });
      throw error;
    }
  },
  fetchMetrics: async (apiKey) => {
    set({ loadingMetrics: true, error: null });
    try {
      const metrics = await fetchMetricsOverview(apiKey);
      set({ metrics });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to load metrics' });
    } finally {
      set({ loadingMetrics: false });
    }
  },
  fetchAudit: async (apiKey, options) => {
    set({ loadingAudit: true, error: null });
    try {
      const records = await fetchAuditLog(apiKey, options);
      set({ audit: records });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to fetch audit trail' });
    } finally {
      set({ loadingAudit: false });
    }
  },
  fetchOptions: async (apiKey, force = false) => {
    const { options } = get();
    if (options && !force) {
      return;
    }
    set({ loadingOptions: true, error: null });
    try {
      const next = await fetchAdminOptions(apiKey);
      set({ options: next });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to load option catalog' });
    } finally {
      set({ loadingOptions: false });
    }
  },
  fetchEnvironmentSettings: async (apiKey) => {
    set({ loadingEnvironmentSettings: true, error: null });
    try {
      const current = await fetchEnvironmentSettings(apiKey);
      set({ environmentSettings: current });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to load environment settings' });
    } finally {
      set({ loadingEnvironmentSettings: false });
    }
  },
  updateEnvironmentSettings: async (apiKey, payload) => {
    set({ loadingEnvironmentSettings: true, error: null });
    try {
      const next = await updateEnvironmentSettings(apiKey, payload);
      set({ environmentSettings: next });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to update environment settings' });
      throw error;
    } finally {
      set({ loadingEnvironmentSettings: false });
    }
  },
  fetchPersonas: async (apiKey) => {
    set({ loadingPersonas: true, error: null });
    try {
      const catalog = await fetchPersonasApi(apiKey);
      set({ personas: catalog.items });
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to load personas' });
    } finally {
      set({ loadingPersonas: false });
    }
  },
  stagePersonaPrompt: async (apiKey, persona, payload) => {
    set({ loadingPersonas: true, error: null });
    try {
      const summary = await stagePersonaPromptApi(apiKey, persona, payload);
      set((state) => ({
        personas: state.personas
          ? state.personas.map((item) => (item.persona === summary.persona ? summary : item))
          : [summary],
      }));
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to stage persona prompt' });
      throw error;
    } finally {
      set({ loadingPersonas: false });
    }
  },
  publishPersonaPrompt: async (apiKey, persona, promptId, payload) => {
    set({ loadingPersonas: true, error: null });
    try {
      const summary = await publishPersonaPromptApi(apiKey, persona, promptId, payload);
      set((state) => ({
        personas: state.personas
          ? state.personas.map((item) => (item.persona === summary.persona ? summary : item))
          : [summary],
      }));
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to publish persona prompt' });
      throw error;
    } finally {
      set({ loadingPersonas: false });
    }
  },
  fetchTenants: async (apiKey, options) => {
    set({ loadingTenants: true, error: null });
    try {
      const response = await fetchTenantsApi(apiKey, options);
      set({ tenants: response.items, loadingTenants: false });
    } catch (error) {
      console.error(error);
      set({
        loadingTenants: false,
        error: error instanceof Error ? error.message : 'Failed to fetch tenants',
      });
      throw error;
    }
  },
  createTenant: async (apiKey, payload: TenantCreatePayload) => {
    try {
      const entry = await createTenantApi(apiKey, payload);
      set((state) => ({ tenants: [entry, ...state.tenants] }));
      return entry;
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to create tenant' });
      throw error;
    }
  },
  updateTenant: async (apiKey, tenantId: string, payload: TenantUpdatePayload) => {
    try {
      const entry = await updateTenantApi(apiKey, tenantId, payload);
      set((state) => ({
        tenants: state.tenants.map((item) => (item.id === tenantId ? entry : item)),
      }));
      return entry;
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to update tenant' });
      throw error;
    }
  },
  archiveTenant: async (apiKey, tenantId: string) => {
    try {
      await archiveTenantApi(apiKey, tenantId);
      set((state) => ({
        tenants: state.tenants.map((tenant) =>
          tenant.id === tenantId
            ? { ...tenant, archived_at: Math.floor(Date.now() / 1000) }
            : tenant,
        ),
      }));
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to archive tenant' });
      throw error;
    }
  },
  restoreTenant: async (apiKey, tenantId: string) => {
    try {
      await restoreTenantApi(apiKey, tenantId);
      set((state) => ({
        tenants: state.tenants.map((tenant) =>
          tenant.id === tenantId ? { ...tenant, archived_at: null } : tenant,
        ),
      }));
    } catch (error) {
      console.error(error);
      set({ error: error instanceof Error ? error.message : 'Failed to restore tenant' });
      throw error;
    }
  },
}));
