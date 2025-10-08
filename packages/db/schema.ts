import { sqliteTable, text, integer, blob, unique } from 'drizzle-orm/sqlite-core';

// App settings - serialized JSON for theme, auto_open_new_session, etc.
export const appSettings = sqliteTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

// Provider keys with encryption
export const providerKeys = sqliteTable('provider_keys', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull(),
  label: text('label').notNull(),
  encryptedKey: blob('encrypted_key').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Models cache for provider capabilities
export const modelsCache = sqliteTable('models_cache', {
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  displayName: text('display_name'),
  family: text('family'),
  capabilityJson: text('capability_json', { mode: 'json' }),
  lastSeen: integer('last_seen', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  providerModelUnique: unique().on(table.provider, table.model),
}));

// Eyes routing configuration
export const eyesRouting = sqliteTable('eyes_routing', {
  eye: text('eye').primaryKey(),
  primaryProvider: text('primary_provider'),
  primaryModel: text('primary_model'),
  fallbackProvider: text('fallback_provider'),
  fallbackModel: text('fallback_model'),
});

// Personas with versioning
export const personas = sqliteTable('personas', {
  id: text('id').primaryKey(),
  eye: text('eye').notNull(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeVersionUnique: unique().on(table.eye, table.version),
}));

// Sessions - auto-created when AI agents connect via MCP
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  agentName: text('agent_name'), // "Claude Desktop", "Cursor", "Warp", etc.
  model: text('model'), // "claude-sonnet-4", "gpt-4-turbo", etc.
  displayName: text('display_name'), // User-editable session name
  status: text('status').notNull(), // "active", "idle", "completed"
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastActivity: integer('last_activity', { mode: 'timestamp' }), // Last MCP tool call
  configJson: text('config_json', { mode: 'json' }),
});

// Runs with metrics
export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  eye: text('eye').notNull(),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  inputMd: text('input_md').notNull(),
  outputJson: text('output_json', { mode: 'json' }),
  tokensIn: integer('tokens_in'),
  tokensOut: integer('tokens_out'),
  latencyMs: integer('latency_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Pipeline events for tracking Eye execution flow
export const pipelineEvents = sqliteTable('pipeline_events', {
  id: text('id').primaryKey(),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  eye: text('eye'),
  type: text('type').notNull(), // 'eye_call', 'user_input', 'approval', 'rejection'
  code: text('code'), // Status code from Eye response
  md: text('md'), // Markdown summary
  dataJson: text('data_json', { mode: 'json' }),
  nextAction: text('next_action'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;

export type ProviderKey = typeof providerKeys.$inferSelect;
export type NewProviderKey = typeof providerKeys.$inferInsert;

export type ModelCache = typeof modelsCache.$inferSelect;
export type NewModelCache = typeof modelsCache.$inferInsert;

export type EyeRouting = typeof eyesRouting.$inferSelect;
export type NewEyeRouting = typeof eyesRouting.$inferInsert;

export type Persona = typeof personas.$inferSelect;
export type NewPersona = typeof personas.$inferInsert;

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

export type Run = typeof runs.$inferSelect;
export type NewRun = typeof runs.$inferInsert;

export type PipelineEvent = typeof pipelineEvents.$inferSelect;
export type NewPipelineEvent = typeof pipelineEvents.$inferInsert;

// Prompts library with versioning and variables
export const prompts = sqliteTable('prompts', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  variablesJson: text('variables_json', { mode: 'json' }),
  category: text('category').notNull(),
  tags: text('tags', { mode: 'json' }),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameVersionUnique: unique().on(table.name, table.version),
}));

// Custom Eyes created by users
export const eyesCustom = sqliteTable('eyes_custom', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  description: text('description').notNull(),
  inputSchemaJson: text('input_schema_json', { mode: 'json' }).notNull(),
  outputSchemaJson: text('output_schema_json', { mode: 'json' }).notNull(),
  personaId: text('persona_id'),
  defaultRouting: text('default_routing', { mode: 'json' }),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameVersionUnique: unique().on(table.name, table.version),
}));

// Pipelines - custom workflows
export const pipelines = sqliteTable('pipelines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  version: integer('version').notNull(),
  description: text('description').notNull(),
  workflowJson: text('workflow_json', { mode: 'json' }).notNull(),
  category: text('category').notNull().default('custom'),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameVersionUnique: unique().on(table.name, table.version),
}));

// Pipeline executions
export const pipelineRuns = sqliteTable('pipeline_runs', {
  id: text('id').primaryKey(),
  pipelineId: text('pipeline_id').notNull().references(() => pipelines.id),
  sessionId: text('session_id').notNull().references(() => sessions.id),
  status: text('status').notNull(),
  currentStep: integer('current_step').notNull().default(0),
  stateJson: text('state_json', { mode: 'json' }),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Strictness profiles
export const strictnessProfiles = sqliteTable('strictness_profiles', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  description: text('description'),
  ambiguityThreshold: integer('ambiguity_threshold').notNull().default(30),
  citationCutoff: integer('citation_cutoff').notNull().default(70),
  consistencyTolerance: integer('consistency_tolerance').notNull().default(80),
  mangekyoStrictness: text('mangekyo_strictness').notNull().default('standard'),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export type Prompt = typeof prompts.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;

export type EyeCustom = typeof eyesCustom.$inferSelect;
export type NewEyeCustom = typeof eyesCustom.$inferInsert;

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type NewPipelineRun = typeof pipelineRuns.$inferInsert;

export type StrictnessProfile = typeof strictnessProfiles.$inferSelect;
export type NewStrictnessProfile = typeof strictnessProfiles.$inferInsert;

// Eye leaderboard cache for performance
export const eyeLeaderboard = sqliteTable('eye_leaderboard', {
  eye: text('eye').primaryKey(),
  totalRuns: integer('total_runs').notNull().default(0),
  approvalRate: integer('approval_rate').notNull().default(0), // Percentage
  avgLatency: integer('avg_latency').notNull().default(0), // Milliseconds
  trendData: text('trend_data', { mode: 'json' }), // 14-day history: {day: string, runs: number, approvals: number}[]
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull(),
});

export type EyeLeaderboard = typeof eyeLeaderboard.$inferSelect;
export type NewEyeLeaderboard = typeof eyeLeaderboard.$inferInsert;

// Duels - Model comparison battles
export const duels = sqliteTable('duels', {
  id: text('id').primaryKey(),
  eyeName: text('eye_name').notNull(),
  modelA: text('model_a').notNull(),
  modelB: text('model_b').notNull(),
  input: text('input').notNull(),
  iterations: integer('iterations').notNull(),
  results: text('results', { mode: 'json' }), // Comparison matrix with wins/losses
  winner: text('winner'), // 'modelA', 'modelB', or 'tie'
  status: text('status').notNull().default('pending'), // 'pending', 'running', 'completed', 'failed'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

export type Duel = typeof duels.$inferSelect;
export type NewDuel = typeof duels.$inferInsert;

// Persona versions for versioning system
export const personaVersions = sqliteTable('persona_versions', {
  id: text('id').primaryKey(),
  personaId: text('persona_id').notNull().references(() => personas.id),
  versionNumber: integer('version_number').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  settings: text('settings', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'), // 'system' | 'user'
});

export type PersonaVersion = typeof personaVersions.$inferSelect;
export type NewPersonaVersion = typeof personaVersions.$inferInsert;

// MCP Integrations - AI tool connection configurations
export const mcpIntegrations = sqliteTable('mcp_integrations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(), // "Claude Desktop"
  slug: text('slug').notNull().unique(), // "claude-desktop"
  logoUrl: text('logo_url'), // URL or data URI for tool logo
  description: text('description'),
  status: text('status').notNull().default('official'), // 'official' | 'experimental' | 'community'
  platforms: text('platforms', { mode: 'json' }).notNull(), // ["macos", "windows", "linux"]
  configType: text('config_type').notNull(), // 'json' | 'yaml'
  configFiles: text('config_files', { mode: 'json' }).notNull(), // [{ platform: 'macos', path: '~/.config/...' }]
  configTemplate: text('config_template').notNull(), // Template with {{MCP_PATH}} placeholders
  setupSteps: text('setup_steps', { mode: 'json' }).notNull(), // [{ title, description, code }]
  docsUrl: text('docs_url'), // Link to official documentation
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  displayOrder: integer('display_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export type McpIntegration = typeof mcpIntegrations.$inferSelect;
export type NewMcpIntegration = typeof mcpIntegrations.$inferInsert;