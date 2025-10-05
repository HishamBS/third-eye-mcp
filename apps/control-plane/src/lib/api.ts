import type {
  ApiKeyEntry,
  ApiKeySecret,
  ApiKeyCreatePayload,
  ApiKeyUpdatePayload,
  AuditRecord,
  MetricsOverview,
  AdminLoginResponse,
  AdminAccount,
  AdminProfileUpdatePayload,
  AdminBootstrapStatus,
  AdminOptionSet,
  ToolModelMapping,
  ToolModelUpdatePayload,
  AdminEnvironmentSettings,
  AdminEnvironmentSettingsPayload,
  PersonaCatalog,
  PersonaStagePayload,
  PersonaPublishPayload,
  PersonaSummary,
  TenantEntry,
  TenantListResponse,
  TenantCreatePayload,
  TenantUpdatePayload,
} from '../types/admin';

const DEFAULT_BASE_URL = 'http://localhost:8000';

function resolveBaseUrl(): string {
  const raw = import.meta.env.VITE_API_BASE_URL as string | undefined;
  return raw?.replace(/\/$/, '') || DEFAULT_BASE_URL;
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-API-Key': apiKey,
    'X-Request-ID': crypto.randomUUID(),
  };
}

function jsonHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'X-Request-ID': crypto.randomUUID(),
  };
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed (${response.status}): ${body || response.statusText}`);
  }
  if (response.status === 204) {
    return undefined as unknown as T;
  }
  return response.json() as Promise<T>;
}

export async function getApiKeys(apiKey: string, options?: { includeRevoked?: boolean }): Promise<ApiKeyEntry[]> {
  const base = resolveBaseUrl();
  const params = new URLSearchParams();
  if (options?.includeRevoked) params.set('include_revoked', 'true');
  const response = await fetch(`${base}/admin/api-keys?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  const payload = await handle<{ items: ApiKeyEntry[]; total: number }>(response);
  return payload.items;
}

export async function postApiKey(apiKey: string, payload: ApiKeyCreatePayload): Promise<ApiKeySecret> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/api-keys`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  return handle<ApiKeySecret>(response);
}

export async function rotateApiKey(apiKey: string, keyId: string): Promise<ApiKeySecret> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/api-keys/${encodeURIComponent(keyId)}/rotate`, {
    method: 'POST',
    headers: authHeaders(apiKey),
  });
  return handle<ApiKeySecret>(response);
}

export async function patchApiKey(apiKey: string, keyId: string, payload: ApiKeyUpdatePayload): Promise<ApiKeyEntry> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/api-keys/${encodeURIComponent(keyId)}`, {
    method: 'PATCH',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  return handle<ApiKeyEntry>(response);
}

export async function revokeApiKey(apiKey: string, keyId: string, reason?: string): Promise<void> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/api-keys/${encodeURIComponent(keyId)}/revoke`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(reason ? { reason } : undefined),
  });
  await handle<void>(response);
}

export async function restoreApiKey(apiKey: string, keyId: string): Promise<void> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/api-keys/${encodeURIComponent(keyId)}/restore`, {
    method: 'POST',
    headers: authHeaders(apiKey),
  });
  await handle<void>(response);
}

export async function fetchAdminOptions(apiKey: string): Promise<AdminOptionSet> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/api-keys/options`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return handle<AdminOptionSet>(response);
}

export async function fetchEnvironmentSettings(apiKey: string): Promise<AdminEnvironmentSettings> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/settings`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return handle<AdminEnvironmentSettings>(response);
}

export async function updateEnvironmentSettings(
  apiKey: string,
  payload: AdminEnvironmentSettingsPayload,
): Promise<AdminEnvironmentSettings> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/settings`, {
    method: 'PUT',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  return handle<AdminEnvironmentSettings>(response);
}

export async function fetchPersonas(apiKey: string): Promise<PersonaCatalog> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/personas`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return handle<PersonaCatalog>(response);
}

export async function stagePersonaPrompt(
  apiKey: string,
  persona: string,
  payload: PersonaStagePayload,
): Promise<PersonaSummary> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/personas/${encodeURIComponent(persona)}/stage`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  return handle<PersonaSummary>(response);
}

export async function publishPersonaPrompt(
  apiKey: string,
  persona: string,
  promptId: string,
  payload: PersonaPublishPayload,
): Promise<PersonaSummary> {
  const base = resolveBaseUrl();
  const response = await fetch(
    `${base}/admin/personas/${encodeURIComponent(persona)}/${encodeURIComponent(promptId)}/publish`,
    {
      method: 'POST',
      headers: authHeaders(apiKey),
      body: JSON.stringify(payload),
    },
  );
  return handle<PersonaSummary>(response);
}

export async function fetchTenants(
  apiKey: string,
  options?: { includeArchived?: boolean; search?: string | null },
): Promise<TenantListResponse> {
  const base = resolveBaseUrl();
  const params = new URLSearchParams();
  if (options?.includeArchived) params.set('include_archived', 'true');
  if (options?.search) params.set('search', options.search);
  const response = await fetch(`${base}/admin/tenants?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return handle<TenantListResponse>(response);
}

export async function createTenant(apiKey: string, payload: TenantCreatePayload): Promise<TenantEntry> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/tenants`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  return handle<TenantEntry>(response);
}

export async function updateTenant(
  apiKey: string,
  tenantId: string,
  payload: TenantUpdatePayload,
): Promise<TenantEntry> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/tenants/${encodeURIComponent(tenantId)}`, {
    method: 'PATCH',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  return handle<TenantEntry>(response);
}

export async function archiveTenant(apiKey: string, tenantId: string): Promise<void> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/tenants/${encodeURIComponent(tenantId)}/archive`, {
    method: 'POST',
    headers: authHeaders(apiKey),
  });
  await handle<void>(response);
}

export async function restoreTenant(apiKey: string, tenantId: string): Promise<void> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/tenants/${encodeURIComponent(tenantId)}/restore`, {
    method: 'POST',
    headers: authHeaders(apiKey),
  });
  await handle<void>(response);
}

export async function fetchMetricsOverview(apiKey: string): Promise<MetricsOverview> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/metrics/overview`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return handle<MetricsOverview>(response);
}

export async function fetchToolModelMappings(apiKey: string): Promise<ToolModelMapping[]> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/models/mappings`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return handle<ToolModelMapping[]>(response);
}

export async function updateToolModelMapping(
  apiKey: string,
  tool: string,
  payload: ToolModelUpdatePayload,
): Promise<ToolModelMapping> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/models/mappings/${encodeURIComponent(tool)}`, {
    method: 'PUT',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  return handle<ToolModelMapping>(response);
}

export async function fetchProviders(apiKey: string): Promise<string[]> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/providers`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return handle<string[]>(response);
}

export async function fetchProviderModels(
  apiKey: string,
  provider: string,
  options?: { apiKeyOverride?: string },
): Promise<string[]> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/providers/${encodeURIComponent(provider)}/models`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ api_key: options?.apiKeyOverride ?? null }),
  });
  const payload = await handle<{ provider: string; models: string[] }>(response);
  return payload.models;
}

export async function fetchAuditLog(
  apiKey: string,
  options?: { since?: number; until?: number; tenant?: string | null; limit?: number },
): Promise<AuditRecord[]> {
  const base = resolveBaseUrl();
  const params = new URLSearchParams();
  if (options?.since) params.set('since', String(options.since));
  if (options?.until) params.set('until', String(options.until));
  if (options?.tenant) params.set('tenant', options.tenant);
  if (options?.limit) params.set('limit', String(options.limit));
  const response = await fetch(`${base}/admin/audit?${params.toString()}`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  const payload = await handle<{ items: AuditRecord[] }>(response);
  return payload.items ?? [];
}

export async function adminLogin(payload: { email: string; password: string }): Promise<AdminLoginResponse> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/auth/login`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  return handle<AdminLoginResponse>(response);
}

export async function adminChangePassword(
  apiKey: string,
  payload: { oldPassword: string; newPassword: string },
): Promise<AdminLoginResponse> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/auth/change-password`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ old_password: payload.oldPassword, new_password: payload.newPassword }),
  });
  return handle<AdminLoginResponse>(response);
}

export async function adminUpdateProfile(
  apiKey: string,
  payload: AdminProfileUpdatePayload,
): Promise<AdminAccount> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/account`, {
    method: 'PATCH',
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  return handle<AdminAccount>(response);
}

export async function fetchAdminAccount(apiKey: string): Promise<AdminAccount> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/account`, {
    method: 'GET',
    headers: authHeaders(apiKey),
  });
  return handle<AdminAccount>(response);
}

export async function fetchBootstrapStatus(): Promise<AdminBootstrapStatus> {
  const base = resolveBaseUrl();
  const response = await fetch(`${base}/admin/bootstrap/status`, {
    method: 'GET',
    headers: jsonHeaders(),
  });
  return handle<AdminBootstrapStatus>(response);
}
