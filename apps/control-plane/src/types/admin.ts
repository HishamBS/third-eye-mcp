export interface OptionItem {
  value: string;
  label: string;
  description?: string | null;
  group?: string | null;
}

export interface AdminOptionSet {
  roles: OptionItem[];
  tenants: OptionItem[];
  branches: OptionItem[];
  tools: OptionItem[];
}

export interface EnvironmentModelConfig {
  tool: string;
  default_provider: string;
  default_model: string;
  fallback_provider?: string | null;
  fallback_model?: string | null;
}

export interface EnvironmentRateGuardrails {
  max_tokens_per_request?: number | null;
  requests_per_minute?: number | null;
}

export interface EnvironmentObservabilityConfig {
  prometheus_base_url?: string | null;
}

export interface AdminEnvironmentSettings {
  defaults: EnvironmentModelConfig[];
  guardrails: EnvironmentRateGuardrails;
  observability?: EnvironmentObservabilityConfig | null;
  updated_at?: number | null;
  updated_by?: string | null;
}

export interface AdminEnvironmentSettingsPayload {
  defaults: EnvironmentModelConfig[];
  guardrails: EnvironmentRateGuardrails;
  observability?: EnvironmentObservabilityConfig | null;
}

export interface PersonaPromptDetail {
  id: string;
  persona: string;
  version: string;
  content_md: string;
  checksum: string;
  metadata: Record<string, unknown>;
  created_by?: string | null;
  notes?: string | null;
  created_at?: number | null;
  approved_at?: number | null;
  supersedes_id?: string | null;
  rollback_of?: string | null;
}

export interface PersonaPromptVersion {
  id: string;
  version: string;
  active: boolean;
  staged: boolean;
  created_at?: number | null;
  approved_at?: number | null;
}

export interface PersonaSummary {
  persona: string;
  label: string;
  active: PersonaPromptDetail | null;
  versions: PersonaPromptVersion[];
}

export interface PersonaCatalog {
  items: PersonaSummary[];
}

export interface PersonaStagePayload {
  content_md: string;
  version?: string | null;
  metadata?: Record<string, unknown> | null;
  notes?: string | null;
}

export interface PersonaPublishPayload {
  notes?: string | null;
}

export interface ToolModelMapping {
  tool: string;
  primary_provider: string;
  primary_model: string;
  fallback_provider?: string | null;
  fallback_model?: string | null;
  updated_by?: string | null;
  updated_at?: number | null;
}

export interface ToolModelUpdatePayload {
  primary_provider: string;
  primary_model: string;
  fallback_provider?: string | null;
  fallback_model?: string | null;
}

export interface ApiKeyLimits {
  rate?: Record<string, unknown> | null;
  budget?: Record<string, unknown> | null;
  branches?: string[] | null;
  tools?: string[] | null;
  tenants?: string[] | null;
  max_budget_tokens?: number | null;
  [key: string]: unknown;
}

export interface ApiKeyEntry {
  id: string;
  role: string;
  tenant?: string | null;
  created_at?: number | null;
  expires_at?: number | null;
  revoked_at?: number | null;
  last_used_at?: number | null;
  rotated_at?: number | null;
  account_id?: string | null;
  limits: ApiKeyLimits;
  display_name?: string | null;
}

export interface ApiKeySecret {
  id: string;
  secret: string;
  expires_at?: number | null;
}

export interface ApiKeyCreatePayload {
  key_id?: string | null;
  role: string;
  tenant?: string | null;
  limits?: ApiKeyLimits | null;
  ttl_seconds?: number | null;
  display_name?: string | null;
}

export interface ApiKeyUpdatePayload {
  limits?: ApiKeyLimits | null;
  expires_at?: string | null; // ISO string from datetime-local input
  display_name?: string | null;
}

export interface TenantEntry {
  id: string;
  display_name: string;
  description?: string | null;
  metadata: Record<string, unknown>;
  tags: string[];
  created_at?: number | null;
  updated_at?: number | null;
  archived_at?: number | null;
  total_keys: number;
  active_keys: number;
  last_key_rotated_at?: number | null;
  last_key_used_at?: number | null;
}

export interface TenantListResponse {
  items: TenantEntry[];
  total: number;
}

export interface TenantCreatePayload {
  id: string;
  display_name: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  tags?: string[] | null;
}

export interface TenantUpdatePayload {
  display_name?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  tags?: string[] | null;
}

export interface AuditRecord {
  id?: string;
  actor?: string | null;
  action: string;
  target?: string | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
  session_id?: string | null;
  tenant_id?: string | null;
  created_at?: number | null;
}

export interface MetricsRequestEntry {
  tool: string;
  status: string;
  count: number;
  branch: string;
}

export interface ProviderMetricEntry {
  provider: string;
  tool: string;
  count: number;
  average_latency_ms: number;
  failures: number;
}

export interface BudgetMetricEntry {
  key_id: string;
  tokens: number;
}

export interface PrometheusStatus {
  status: 'connected' | 'disabled' | 'degraded';
  baseUrl?: string | null;
  lastScrape?: number | null;
  mode: 'prometheus' | 'fallback' | 'local';
}

export interface MetricsOverview {
  requests: {
    total: number;
    byTool: MetricsRequestEntry[];
  };
  providers: {
    total: number;
    byProvider: ProviderMetricEntry[];
  };
  budgets: {
    total: number;
    byKey: BudgetMetricEntry[];
  };
  prometheus?: PrometheusStatus | null;
}

export interface AdminAccount {
  id: string;
  email: string;
  display_name?: string | null;
  require_password_reset: boolean;
  created_at?: number | null;
  updated_at?: number | null;
  last_login_at?: number | null;
}

export interface AdminLoginResponse {
  key_id: string;
  api_key: string;
  account: AdminAccount;
  force_password_reset: boolean;
}

export interface AdminAuthSession {
  key_id: string;
  api_key: string;
  account: AdminAccount;
}

export interface AdminBootstrapStatus {
  bootstrapped: boolean;
  admin_count: number;
  bootstrap_email: string;
}

export interface AdminProfileUpdatePayload {
  email?: string | null;
  display_name?: string | null;
}

export interface AdminStoreState {
  apiKeys: ApiKeyEntry[];
  loadingKeys: boolean;
  lastSecret: ApiKeySecret | null;
  metrics: MetricsOverview | null;
  loadingMetrics: boolean;
  audit: AuditRecord[];
  loadingAudit: boolean;
  error: string | null;
  options: AdminOptionSet | null;
  loadingOptions: boolean;
  environmentSettings: AdminEnvironmentSettings | null;
  loadingEnvironmentSettings: boolean;
  personas: PersonaSummary[] | null;
  loadingPersonas: boolean;
  tenants: TenantEntry[];
  loadingTenants: boolean;
}

export interface AdminStoreActions {
  setError: (message: string | null) => void;
  fetchApiKeys: (apiKey: string, options?: { includeRevoked?: boolean }) => Promise<void>;
  createApiKey: (apiKey: string, payload: ApiKeyCreatePayload) => Promise<ApiKeySecret>;
  rotateApiKey: (apiKey: string, keyId: string) => Promise<ApiKeySecret>;
  updateApiKey: (apiKey: string, keyId: string, payload: ApiKeyUpdatePayload) => Promise<void>;
  revokeApiKey: (apiKey: string, keyId: string, reason?: string) => Promise<void>;
  restoreApiKey: (apiKey: string, keyId: string) => Promise<void>;
  fetchMetrics: (apiKey: string) => Promise<void>;
  fetchAudit: (
    apiKey: string,
    options?: { since?: number; until?: number; tenant?: string | null; limit?: number },
  ) => Promise<void>;
  clearSecret: () => void;
  fetchOptions: (apiKey: string, force?: boolean) => Promise<void>;
  fetchEnvironmentSettings: (apiKey: string) => Promise<void>;
  updateEnvironmentSettings: (apiKey: string, payload: AdminEnvironmentSettingsPayload) => Promise<void>;
  fetchPersonas: (apiKey: string) => Promise<void>;
  stagePersonaPrompt: (apiKey: string, persona: string, payload: PersonaStagePayload) => Promise<void>;
  publishPersonaPrompt: (apiKey: string, persona: string, promptId: string, payload: PersonaPublishPayload) => Promise<void>;
  fetchTenants: (apiKey: string, options?: { includeArchived?: boolean; search?: string | null }) => Promise<void>;
  createTenant: (apiKey: string, payload: TenantCreatePayload) => Promise<TenantEntry>;
  updateTenant: (apiKey: string, tenantId: string, payload: TenantUpdatePayload) => Promise<TenantEntry>;
  archiveTenant: (apiKey: string, tenantId: string) => Promise<void>;
  restoreTenant: (apiKey: string, tenantId: string) => Promise<void>;
}

export type AdminStore = AdminStoreState & AdminStoreActions;
