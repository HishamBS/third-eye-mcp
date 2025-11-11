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
  id: text().primaryKey(), // UUID
  key: text().notNull().unique(),
  value: text().notNull(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
});

// Provider keys with encryption
export const providerKeys = sqliteTable('provider_keys', {
  id: text().primaryKey(), // UUID (was auto-increment integer)
  provider: text().notNull(),
  label: text().notNull(),
  encryptedKey: blob().notNull(),
  metadata: text({ mode: 'json' }),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
});

// Models cache for provider capabilities
export const modelsCache = sqliteTable('models_cache', {
  id: text().primaryKey(), // UUID
  provider: text().notNull(),
  model: text().notNull(),
  displayName: text(),
  family: text(),
  capabilityJson: text({ mode: 'json' }),
  lastSeen: integer({ mode: 'timestamp' }).notNull(),
}, (table) => ({
  providerModelUnique: unique().on(table.provider, table.model),
}));

// Forward declare eyes table for foreign keys
export const eyes = sqliteTable('eyes', {
  id: text().primaryKey(), // UUID
  name: text().notNull(), // Display name (e.g., 'Overseer', 'Sharingan', 'Jōgan')
  version: integer().notNull(),
  description: text().notNull(),
  iconSvg: text(),
  inputSchemaJson: text({ mode: 'json' }).notNull(),
  outputSchemaJson: text({ mode: 'json' }).notNull(),
  personaId: text(),
  capabilityTags: text({ mode: 'json' }).notNull().default('[]'), // Phase 1-A1: Dynamic routing capability tags
  active: integer({ mode: 'boolean' }).notNull().default(true),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameVersionUnique: unique().on(table.name, table.version),
  nameUnique: unique().on(table.name), // For lookups
}));

// Eyes routing configuration
export const eyesRouting = sqliteTable('eyes_routing', {
  id: text().primaryKey(), // UUID
  eyeId: text().notNull().references(() => eyes.id), // FK to eyes
  primaryProvider: text(),
  primaryModel: text(),
  fallbackProvider: text(),
  fallbackModel: text(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeIdUnique: unique().on(table.eyeId), // One routing per eye
}));

// Personas with structured fields
export const personas = sqliteTable('personas', {
  id: text().primaryKey(), // UUID
  eyeId: text().notNull().references(() => eyes.id), // FK to eyes
  name: text().notNull(),
  version: integer().notNull(),
  metadataJson: text({ mode: 'json' }).notNull(),
  mission: text().notNull(),
  guidanceJson: text({ mode: 'json' }),
  validationJson: text({ mode: 'json' }),
  envelopeJson: text({ mode: 'json' }).notNull(),
  remindersJson: text({ mode: 'json' }).notNull(),
  notes: text(),
  llmConfigJson: text({ mode: 'json' }).notNull(),
  active: integer({ mode: 'boolean' }).notNull().default(false),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeVersionUnique: unique().on(table.eyeId, table.version),
}));

// Sessions - auto-created when AI agents connect via MCP
export const sessions = sqliteTable('sessions', {
  id: text().primaryKey(), // UUID
  agentName: text(),
  model: text(),
  displayName: text(),
  status: text().notNull(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  lastActivity: integer({ mode: 'timestamp' }),
  configJson: text({ mode: 'json' }),
});

// Runs with metrics
export const runs = sqliteTable('runs', {
  id: text().primaryKey(), // UUID
  sessionId: text().notNull().references(() => sessions.id), // FK
  eyeId: text().notNull().references(() => eyes.id), // FK to eyes
  provider: text().notNull(),
  model: text().notNull(),
  inputMd: text().notNull(),
  outputJson: text({ mode: 'json' }),
  tokensIn: integer(),
  tokensOut: integer(),
  latencyMs: integer(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
});

// Pipeline events for tracking Eye execution flow
export const pipelineEvents = sqliteTable('pipeline_events', {
  id: text().primaryKey(), // UUID
  sessionId: text().notNull().references(() => sessions.id), // FK
  eyeId: text().references(() => eyes.id), // FK to eyes (nullable)
  type: text().notNull(),
  code: text(),
  md: text(),
  dataJson: text({ mode: 'json' }),
  nextAction: text(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
});

// Provider failover events for tracking fallback chain usage
export const providerFailovers = sqliteTable('provider_failovers', {
  id: text().primaryKey(), // UUID
  sessionId: text().notNull().references(() => sessions.id), // FK
  eyeId: text().notNull().references(() => eyes.id), // FK to eyes
  primaryProvider: text().notNull(),
  primaryModel: text().notNull(),
  failedReason: text().notNull(),
  fallbackProvider: text().notNull(),
  fallbackModel: text().notNull(),
  fallbackSuccess: integer({ mode: 'boolean' }).notNull(),
  errorDetails: text({ mode: 'json' }),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
});

// Rate Limit Tracking - tracks rate limit usage per provider
export const rateLimitTracking = sqliteTable('rate_limit_tracking', {
  id: text().primaryKey(), // UUID
  provider: text().notNull(),
  eyeId: text().references(() => eyes.id), // FK to eyes (nullable)
  windowStart: integer({ mode: 'timestamp' }).notNull(),
  requestCount: integer().notNull(),
  tokensConsumed: integer().notNull(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
});

// Pipelines - custom workflows
export const pipelines = sqliteTable('pipelines', {
  id: text().primaryKey(), // UUID
  name: text().notNull(),
  version: integer().notNull(),
  description: text().notNull(),
  workflowJson: text({ mode: 'json' }).notNull(),
  category: text().notNull().default('custom'),
  active: integer({ mode: 'boolean' }).notNull().default(false),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameVersionUnique: unique().on(table.name, table.version),
  nameUnique: unique().on(table.name), // For lookups
}));

// Pipeline executions
export const pipelineRuns = sqliteTable('pipeline_runs', {
  id: text().primaryKey(), // UUID
  pipelineId: text().notNull().references(() => pipelines.id), // FK
  sessionId: text().notNull().references(() => sessions.id), // FK
  status: text().notNull(),
  currentStep: integer().notNull().default(0),
  stateJson: text({ mode: 'json' }),
  errorMessage: text(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  completedAt: integer({ mode: 'timestamp' }),
});

// DAG Pipeline Queue - async execution tracking
export const pipelineQueue = sqliteTable('pipeline_queue', {
  id: text().primaryKey(), // UUID
  runId: text().notNull().unique(),
  pipelineId: text().notNull().references(() => pipelines.id), // FK
  sessionId: text().notNull().references(() => sessions.id), // FK
  status: text().notNull(),
  inputJson: text({ mode: 'json' }),
  finalVerdict: text(),
  errorMessage: text(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  startedAt: integer({ mode: 'timestamp' }),
  completedAt: integer({ mode: 'timestamp' }),
});

// DAG Node Execution Steps - individual node tracking
export const executionSteps = sqliteTable('execution_steps', {
  id: text().primaryKey(), // UUID
  runId: text().notNull().references(() => pipelineQueue.runId), // FK
  nodeId: text().notNull(),
  nodeType: text().notNull(),
  status: text().notNull(),
  verdict: text(),
  outputJson: text({ mode: 'json' }),
  errorMessage: text(),
  tokensUsed: integer(),
  latencyMs: integer(),
  metadataJson: text({ mode: 'json' }),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  completedAt: integer({ mode: 'timestamp' }),
}, (table) => ({
  runNodeUnique: unique().on(table.runId, table.nodeId),
}));

// DAG Node Configurations - per-node overrides
export const nodeConfigs = sqliteTable('node_configs', {
  id: text().primaryKey(), // UUID
  pipelineId: text().notNull().references(() => pipelines.id), // FK
  nodeId: text().notNull(),
  eyeId: text().references(() => eyes.id), // FK to eyes (nullable)
  providerOverride: text({ mode: 'json' }),
  strictnessOverride: text(),
  notesMd: text(),
  configJson: text({ mode: 'json' }),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  updatedAt: integer({ mode: 'timestamp' }).notNull(),
}, (table) => ({
  pipelineNodeUnique: unique().on(table.pipelineId, table.nodeId),
}));

// Strictness profiles
export const strictnessProfiles = sqliteTable('strictness_profiles', {
  id: text().primaryKey(), // UUID
  name: text().notNull().unique(),
  description: text(),
  ambiguityThreshold: integer().notNull().default(30),
  citationCutoff: integer().notNull().default(70),
  consistencyTolerance: integer().notNull().default(80),
  mangekyoStrictness: text().notNull().default('standard'),
  isBuiltIn: integer({ mode: 'boolean' }).notNull().default(false),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
});

// Eye leaderboard cache for performance
export const eyeLeaderboard = sqliteTable('eye_leaderboard', {
  id: text().primaryKey(), // UUID
  eyeId: text().notNull().references(() => eyes.id), // FK to eyes
  totalRuns: integer().notNull().default(0),
  approvalRate: integer().notNull().default(0),
  avgLatency: integer().notNull().default(0),
  trendData: text({ mode: 'json' }),
  lastUpdated: integer({ mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeIdUnique: unique().on(table.eyeId), // One leaderboard per eye
}));

// Duels - Model comparison battles
export const duels = sqliteTable('duels', {
  id: text().primaryKey(), // UUID
  eyeId: text().notNull().references(() => eyes.id), // FK to eyes
  modelA: text().notNull(),
  modelB: text().notNull(),
  input: text().notNull(),
  iterations: integer().notNull(),
  results: text({ mode: 'json' }),
  winner: text(),
  status: text().notNull().default('pending'),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  completedAt: integer({ mode: 'timestamp' }),
});

// Persona versions for versioning system
export const personaVersions = sqliteTable('persona_versions', {
  id: text().primaryKey(), // UUID
  personaId: text().notNull().references(() => personas.id), // FK
  versionNumber: integer().notNull(),
  systemPrompt: text().notNull(),
  settings: text({ mode: 'json' }),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  createdBy: text(),
});

// Persona Blueprints - structured blueprint storage for full editability
export const personaBlueprints = sqliteTable('persona_blueprints', {
  id: text().primaryKey(), // UUID
  eyeId: text().notNull().references(() => eyes.id), // FK to eyes
  name: text().notNull(),
  description: text().notNull(),
  version: text().notNull(),
  capabilities: text({ mode: 'json' }).notNull(),
  mission: text().notNull(),
  phases: text({ mode: 'json' }).notNull(),
  envelopeContract: text({ mode: 'json' }).notNull(),
  reminders: text({ mode: 'json' }),
  notes: text(),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  updatedAt: integer({ mode: 'timestamp' }).notNull(),
}, (table) => ({
  eyeIdUnique: unique().on(table.eyeId), // One blueprint per eye
}));

// Clarifications storage
export const clarifications = sqliteTable('clarifications', {
  id: text().primaryKey(), // UUID
  sessionId: text().notNull().references(() => sessions.id), // FK
  field: text().notNull(),
  question: text().notNull(),
  answer: text(),
  status: text().notNull().default('pending'),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  answeredAt: integer({ mode: 'timestamp' }),
}, (table) => ({
  sessionFieldUnique: unique().on(table.sessionId, table.field),
}));

// Intent confirmations storage
export const intentConfirmations = sqliteTable('intent_confirmations', {
  id: text().primaryKey(), // UUID
  sessionId: text().notNull().references(() => sessions.id), // FK
  intentAnalysis: text({ mode: 'json' }),
  confirmationPrompt: text().notNull(),
  response: text(),
  userIdentity: text(),
  status: text().notNull().default('pending'),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  respondedAt: integer({ mode: 'timestamp' }),
});

// MCP Integrations - AI tool connection configurations
export const mcpIntegrations = sqliteTable('mcp_integrations', {
  id: text().primaryKey(), // UUID
  name: text().notNull(),
  slug: text().notNull().unique(),
  logoUrl: text(),
  description: text(),
  status: text().notNull().default('official'),
  platforms: text({ mode: 'json' }).notNull(),
  configType: text().notNull(),
  configFiles: text({ mode: 'json' }).notNull(),
  configTemplate: text().notNull(),
  setupSteps: text({ mode: 'json' }).notNull(),
  docsUrl: text(),
  enabled: integer({ mode: 'boolean' }).default(true),
  displayOrder: integer().default(0),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  updatedAt: integer({ mode: 'timestamp' }).notNull(),
});

// Phase 1-A1: Routing Decisions - store dynamic routing analytics
export const routingDecisions = sqliteTable('routing_decisions', {
  id: text().primaryKey(), // UUID
  sessionId: text().notNull().references(() => sessions.id), // FK
  requestAnalysis: text({ mode: 'json' }).notNull(),
  selectedEyes: text({ mode: 'json' }).notNull(),
  reasoning: text().notNull(),
  executionMode: text().notNull(), // sequential | parallel
  createdAt: integer({ mode: 'timestamp' }).notNull(),
});

// Phase 1-A3: Pipeline States - pause/resume mechanism
export const pipelineStates = sqliteTable('pipeline_states', {
  sessionId: text().primaryKey().references(() => sessions.id), // Session ID as PK
  status: text().notNull(), // running | paused_for_human | paused_for_agent | completed
  currentEye: text().notNull(),
  pauseReason: text(), // clarification | confirmation | validation_failed
  pendingData: text({ mode: 'json' }),
  resumeToken: text().notNull(),
  pausedAt: integer({ mode: 'timestamp' }),
  expiresAt: integer({ mode: 'timestamp' }),
});

// Phase 1-A3: Pending Questions - human-in-the-loop questions
export const pendingQuestions = sqliteTable('pending_questions', {
  id: text().primaryKey(), // UUID
  sessionId: text().notNull().references(() => sessions.id), // FK
  eyeName: text().notNull(),
  questions: text({ mode: 'json' }).notNull(),
  context: text({ mode: 'json' }),
  status: text().notNull(), // pending | answered | expired
  createdAt: integer({ mode: 'timestamp' }).notNull(),
  expiresAt: integer({ mode: 'timestamp' }).notNull(),
});

// Phase 1-A3: Human Responses - answers to pending questions
export const humanResponses = sqliteTable('human_responses', {
  id: text().primaryKey(), // UUID
  questionId: text().notNull().references(() => pendingQuestions.id), // FK
  sessionId: text().notNull().references(() => sessions.id), // FK
  answers: text({ mode: 'json' }).notNull(),
  source: text().notNull(), // human | agent
  validated: integer({ mode: 'boolean' }).notNull().default(false),
  createdAt: integer({ mode: 'timestamp' }).notNull(),
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

export type RoutingDecision = typeof routingDecisions.$inferSelect;
export type NewRoutingDecision = typeof routingDecisions.$inferInsert;

export type PipelineState = typeof pipelineStates.$inferSelect;
export type NewPipelineState = typeof pipelineStates.$inferInsert;

export type PendingQuestion = typeof pendingQuestions.$inferSelect;
export type NewPendingQuestion = typeof pendingQuestions.$inferInsert;

export type HumanResponse = typeof humanResponses.$inferSelect;
export type NewHumanResponse = typeof humanResponses.$inferInsert;
