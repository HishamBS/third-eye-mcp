import { sqliteTable, text, integer, blob, unique } from 'drizzle-orm/sqlite-core';

/**
 * Database Schema - V1 UUID Standard
 * 
 * ALL entities use UUID (nanoid) as primary key
 * ALL foreign keys reference UUIDs with proper constraints
 * Names are for display/lookup only (with unique indexes)
 */

// App settings - serialized JSON for theme, auto_open_new_session, etc.
export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey(), // UUID
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Provider keys with encryption
export const providerKeys = sqliteTable('provider_keys', {
  id: text('id').primaryKey(), // UUID (was auto-increment integer)
  provider: text('provider').notNull(),
  label: text('label').notNull(),
  encryptedKey: blob('encrypted_key').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Models cache for provider capabilities
export const modelsCache = sqliteTable('models_cache', {
  id: text('id').primaryKey(), // UUID
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  displayName: text('display_name'),
  family: text('family'),
  capabilityJson: text('capability_json', { mode: 'json' }),
  lastSeen: integer('last_seen', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  providerModelUnique: unique().on(table.provider, table.model),
}));

// Forward declare eyes table for foreign keys
export const eyes = sqliteTable('eyes', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  version: integer('version').notNull(),
  description: text('description').notNull(),
  iconSvg: text('icon_svg'),
  inputSchemaJson: text('input_schema_json', { mode: 'json' }).notNull(),
  outputSchemaJson: text('output_schema_json', { mode: 'json' }).notNull(),
  personaId: text('persona_id'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameVersionUnique: unique().on(table.name, table.version),
  nameUnique: unique().on(table.name), // For lookups
}));

// Eyes routing configuration
export const eyesRouting = sqliteTable('eyes_routing', {
  id: text('id').primaryKey(), // UUID
  eyeId: text('eye_id').notNull().references(() => eyes.id), // FK to eyes
  primaryProvider: text('primary_provider'),
  primaryModel: text('primary_model'),
  fallbackProvider: text('fallback_provider'),
  fallbackModel: text('fallback_model'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeIdUnique: unique().on(table.eyeId), // One routing per eye
}));

// Personas with structured fields
export const personas = sqliteTable('personas', {
  id: text('id').primaryKey(), // UUID
  eyeId: text('eye_id').notNull().references(() => eyes.id), // FK to eyes
  name: text('name').notNull(),
  version: integer('version').notNull(),
  metadata_json: text('metadata_json', { mode: 'json' }).notNull(),
  mission: text('mission').notNull(),
  guidance_json: text('guidance_json', { mode: 'json' }),
  validation_json: text('validation_json', { mode: 'json' }),
  envelope_json: text('envelope_json', { mode: 'json' }).notNull(),
  reminders_json: text('reminders_json', { mode: 'json' }).notNull(),
  notes: text('notes'),
  llm_config_json: text('llm_config_json', { mode: 'json' }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeVersionUnique: unique().on(table.eyeId, table.version),
}));

// Sessions - auto-created when AI agents connect via MCP
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // UUID
  agentName: text('agent_name'),
  model: text('model'),
  displayName: text('display_name'),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  lastActivity: integer('last_activity', { mode: 'timestamp' }),
  configJson: text('config_json', { mode: 'json' }),
});

// Runs with metrics
export const runs = sqliteTable('runs', {
  id: text('id').primaryKey(), // UUID
  sessionId: text('session_id').notNull().references(() => sessions.id), // FK
  eyeId: text('eye_id').notNull().references(() => eyes.id), // FK to eyes
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
  id: text('id').primaryKey(), // UUID
  sessionId: text('session_id').notNull().references(() => sessions.id), // FK
  eyeId: text('eye_id').references(() => eyes.id), // FK to eyes (nullable)
  type: text('type').notNull(),
  code: text('code'),
  md: text('md'),
  dataJson: text('data_json', { mode: 'json' }),
  nextAction: text('next_action'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Provider failover events for tracking fallback chain usage
export const providerFailovers = sqliteTable('provider_failovers', {
  id: text('id').primaryKey(), // UUID
  sessionId: text('session_id').notNull().references(() => sessions.id), // FK
  eyeId: text('eye_id').notNull().references(() => eyes.id), // FK to eyes
  primaryProvider: text('primary_provider').notNull(),
  primaryModel: text('primary_model').notNull(),
  failedReason: text('failed_reason').notNull(),
  fallbackProvider: text('fallback_provider').notNull(),
  fallbackModel: text('fallback_model').notNull(),
  fallbackSuccess: integer('fallback_success', { mode: 'boolean' }).notNull(),
  errorDetails: text('error_details', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Rate Limit Tracking - tracks rate limit usage per provider
export const rateLimitTracking = sqliteTable('rate_limit_tracking', {
  id: text('id').primaryKey(), // UUID
  provider: text('provider').notNull(),
  eyeId: text('eye_id').references(() => eyes.id), // FK to eyes (nullable)
  windowStart: integer('window_start', { mode: 'timestamp' }).notNull(),
  requestCount: integer('request_count').notNull(),
  tokensConsumed: integer('tokens_consumed').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Pipelines - custom workflows
export const pipelines = sqliteTable('pipelines', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  version: integer('version').notNull(),
  description: text('description').notNull(),
  workflowJson: text('workflow_json', { mode: 'json' }).notNull(),
  category: text('category').notNull().default('custom'),
  active: integer('active', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameVersionUnique: unique().on(table.name, table.version),
  nameUnique: unique().on(table.name), // For lookups
}));

// Pipeline executions
export const pipelineRuns = sqliteTable('pipeline_runs', {
  id: text('id').primaryKey(), // UUID
  pipelineId: text('pipeline_id').notNull().references(() => pipelines.id), // FK
  sessionId: text('session_id').notNull().references(() => sessions.id), // FK
  status: text('status').notNull(),
  currentStep: integer('current_step').notNull().default(0),
  stateJson: text('state_json', { mode: 'json' }),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// DAG Pipeline Queue - async execution tracking
export const pipelineQueue = sqliteTable('pipeline_queue', {
  id: text('id').primaryKey(), // UUID
  runId: text('run_id').notNull().unique(),
  pipelineId: text('pipeline_id').notNull().references(() => pipelines.id), // FK
  sessionId: text('session_id').notNull().references(() => sessions.id), // FK
  status: text('status').notNull(),
  inputJson: text('input_json', { mode: 'json' }),
  finalVerdict: text('final_verdict'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// DAG Node Execution Steps - individual node tracking
export const executionSteps = sqliteTable('execution_steps', {
  id: text('id').primaryKey(), // UUID
  runId: text('run_id').notNull().references(() => pipelineQueue.runId), // FK
  nodeId: text('node_id').notNull(),
  nodeType: text('node_type').notNull(),
  status: text('status').notNull(),
  verdict: text('verdict'),
  outputJson: text('output_json', { mode: 'json' }),
  errorMessage: text('error_message'),
  tokensUsed: integer('tokens_used'),
  latencyMs: integer('latency_ms'),
  metadataJson: text('metadata_json', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
}, (table) => ({
  runNodeUnique: unique().on(table.runId, table.nodeId),
}));

// DAG Node Configurations - per-node overrides
export const nodeConfigs = sqliteTable('node_configs', {
  id: text('id').primaryKey(), // UUID
  pipelineId: text('pipeline_id').notNull().references(() => pipelines.id), // FK
  nodeId: text('node_id').notNull(),
  eyeId: text('eye_id').references(() => eyes.id), // FK to eyes (nullable)
  providerOverride: text('provider_override', { mode: 'json' }),
  strictnessOverride: text('strictness_override'),
  notesMd: text('notes_md'),
  configJson: text('config_json', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  pipelineNodeUnique: unique().on(table.pipelineId, table.nodeId),
}));

// Strictness profiles
export const strictnessProfiles = sqliteTable('strictness_profiles', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull().unique(),
  description: text('description'),
  ambiguityThreshold: integer('ambiguity_threshold').notNull().default(30),
  citationCutoff: integer('citation_cutoff').notNull().default(70),
  consistencyTolerance: integer('consistency_tolerance').notNull().default(80),
  mangekyoStrictness: text('mangekyo_strictness').notNull().default('standard'),
  isBuiltIn: integer('is_built_in', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Eye leaderboard cache for performance
export const eyeLeaderboard = sqliteTable('eye_leaderboard', {
  id: text('id').primaryKey(), // UUID
  eyeId: text('eye_id').notNull().references(() => eyes.id), // FK to eyes
  totalRuns: integer('total_runs').notNull().default(0),
  approvalRate: integer('approval_rate').notNull().default(0),
  avgLatency: integer('avg_latency').notNull().default(0),
  trendData: text('trend_data', { mode: 'json' }),
  lastUpdated: integer('last_updated', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeIdUnique: unique().on(table.eyeId), // One leaderboard per eye
}));

// Duels - Model comparison battles
export const duels = sqliteTable('duels', {
  id: text('id').primaryKey(), // UUID
  eyeId: text('eye_id').notNull().references(() => eyes.id), // FK to eyes
  modelA: text('model_a').notNull(),
  modelB: text('model_b').notNull(),
  input: text('input').notNull(),
  iterations: integer('iterations').notNull(),
  results: text('results', { mode: 'json' }),
  winner: text('winner'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// Persona versions for versioning system
export const personaVersions = sqliteTable('persona_versions', {
  id: text('id').primaryKey(), // UUID
  personaId: text('persona_id').notNull().references(() => personas.id), // FK
  versionNumber: integer('version_number').notNull(),
  systemPrompt: text('system_prompt').notNull(),
  settings: text('settings', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  createdBy: text('created_by'),
});

// Persona Blueprints - structured blueprint storage for full editability
export const personaBlueprints = sqliteTable('persona_blueprints', {
  id: text('id').primaryKey(), // UUID
  eyeId: text('eye_id').notNull().references(() => eyes.id), // FK to eyes
  name: text('name').notNull(),
  description: text('description').notNull(),
  version: text('version').notNull(),
  capabilities: text('capabilities', { mode: 'json' }).notNull(),
  mission: text('mission').notNull(),
  phases: text('phases', { mode: 'json' }).notNull(),
  envelopeContract: text('envelope_contract', { mode: 'json' }).notNull(),
  reminders: text('reminders', { mode: 'json' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeIdUnique: unique().on(table.eyeId), // One blueprint per eye
}));

// Clarifications storage
export const clarifications = sqliteTable('clarifications', {
  id: text('id').primaryKey(), // UUID
  sessionId: text('session_id').notNull().references(() => sessions.id), // FK
  field: text('field').notNull(),
  question: text('question').notNull(),
  answer: text('answer'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  answeredAt: integer('answered_at', { mode: 'timestamp' }),
}, (table) => ({
  sessionFieldUnique: unique().on(table.sessionId, table.field),
}));

// Intent confirmations storage
export const intentConfirmations = sqliteTable('intent_confirmations', {
  id: text('id').primaryKey(), // UUID
  sessionId: text('session_id').notNull().references(() => sessions.id), // FK
  intentAnalysis: text('intent_analysis', { mode: 'json' }),
  confirmationPrompt: text('confirmation_prompt').notNull(),
  response: text('response'),
  userIdentity: text('user_identity'),
  status: text('status').notNull().default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  respondedAt: integer('responded_at', { mode: 'timestamp' }),
});

// MCP Integrations - AI tool connection configurations
export const mcpIntegrations = sqliteTable('mcp_integrations', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  description: text('description'),
  status: text('status').notNull().default('official'),
  platforms: text('platforms', { mode: 'json' }).notNull(),
  configType: text('config_type').notNull(),
  configFiles: text('config_files', { mode: 'json' }).notNull(),
  configTemplate: text('config_template').notNull(),
  setupSteps: text('setup_steps', { mode: 'json' }).notNull(),
  docsUrl: text('docs_url'),
  enabled: integer('enabled', { mode: 'boolean' }).default(true),
  displayOrder: integer('display_order').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Type exports
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

export type ProviderFailover = typeof providerFailovers.$inferSelect;
export type NewProviderFailover = typeof providerFailovers.$inferInsert;

export type RateLimitTracking = typeof rateLimitTracking.$inferSelect;
export type NewRateLimitTracking = typeof rateLimitTracking.$inferInsert;

export type Eye = typeof eyes.$inferSelect;
export type NewEye = typeof eyes.$inferInsert;

export type Pipeline = typeof pipelines.$inferSelect;
export type NewPipeline = typeof pipelines.$inferInsert;

export type PipelineRun = typeof pipelineRuns.$inferSelect;
export type NewPipelineRun = typeof pipelineRuns.$inferInsert;

export type PipelineQueueItem = typeof pipelineQueue.$inferSelect;
export type NewPipelineQueueItem = typeof pipelineQueue.$inferInsert;

export type ExecutionStep = typeof executionSteps.$inferSelect;
export type NewExecutionStep = typeof executionSteps.$inferInsert;

export type NodeConfig = typeof nodeConfigs.$inferSelect;
export type NewNodeConfig = typeof nodeConfigs.$inferInsert;

export type StrictnessProfile = typeof strictnessProfiles.$inferSelect;
export type NewStrictnessProfile = typeof strictnessProfiles.$inferInsert;

export type EyeLeaderboard = typeof eyeLeaderboard.$inferSelect;
export type NewEyeLeaderboard = typeof eyeLeaderboard.$inferInsert;

export type Duel = typeof duels.$inferSelect;
export type NewDuel = typeof duels.$inferInsert;

export type PersonaVersion = typeof personaVersions.$inferSelect;
export type NewPersonaVersion = typeof personaVersions.$inferInsert;

export type PersonaBlueprint = typeof personaBlueprints.$inferSelect;
export type NewPersonaBlueprint = typeof personaBlueprints.$inferInsert;

export type Clarification = typeof clarifications.$inferSelect;
export type NewClarification = typeof clarifications.$inferInsert;

export type IntentConfirmation = typeof intentConfirmations.$inferSelect;
export type NewIntentConfirmation = typeof intentConfirmations.$inferInsert;

export type McpIntegration = typeof mcpIntegrations.$inferSelect;
export type NewMcpIntegration = typeof mcpIntegrations.$inferInsert;
