-- Phase 1: POC to Production Foundation
-- Generated: 2025-11-11
-- Description: Complete Phase 1 database schema including dynamic routing, pause/resume, and routing modes

-- ============================================================================
-- A1: Dynamic Routing System
-- ============================================================================

-- Add capability_tags column to eyes table for dynamic capability matching
ALTER TABLE eyes ADD COLUMN capability_tags TEXT NOT NULL DEFAULT '[]';

-- Create routing_decisions table for tracking Overseer's dynamic routing analytics
CREATE TABLE IF NOT EXISTS routing_decisions (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  request_analysis TEXT NOT NULL,
  selected_eyes TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- ============================================================================
-- A2: Three Routing Modes (Fully Dynamic, Constrained, Fixed Template)
-- ============================================================================

-- Add routing mode tracking to sessions table
ALTER TABLE sessions ADD COLUMN routing_mode TEXT DEFAULT 'fully_dynamic';
ALTER TABLE sessions ADD COLUMN policy_id TEXT;
ALTER TABLE sessions ADD COLUMN template_id TEXT;

-- Create routing_policies table for Constrained Dynamic mode
CREATE TABLE IF NOT EXISTS routing_policies (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  mandatory_eyes TEXT NOT NULL, -- JSON array of eye names
  forbidden_eyes TEXT, -- JSON array of eye names
  min_validation_eyes INTEGER,
  security_required INTEGER DEFAULT 0,
  always_confirm_intent INTEGER DEFAULT 0,
  custom_constraints TEXT, -- JSON array of constraints
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

-- Create pipeline_templates table for Fixed Template mode
CREATE TABLE IF NOT EXISTS pipeline_templates (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  eyes TEXT NOT NULL, -- JSON array of eye names (exact sequence)
  strict INTEGER NOT NULL DEFAULT 1,
  auto_trigger_pattern TEXT, -- Regex pattern for automatic triggering
  created_by TEXT,
  is_public INTEGER NOT NULL DEFAULT 0,
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- ============================================================================
-- A3: Pause/Resume Mechanism
-- ============================================================================

-- Create pipeline_states table for pause/resume state persistence
CREATE TABLE IF NOT EXISTS pipeline_states (
  session_id TEXT PRIMARY KEY NOT NULL REFERENCES sessions(id),
  status TEXT NOT NULL,
  current_eye TEXT NOT NULL,
  pause_reason TEXT,
  pending_data TEXT,
  resume_token TEXT NOT NULL,
  paused_at INTEGER,
  expires_at INTEGER
);

-- Create pending_questions table for human-in-the-loop
CREATE TABLE IF NOT EXISTS pending_questions (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  eye_name TEXT NOT NULL,
  questions TEXT NOT NULL,
  context TEXT,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Create human_responses table for tracking answers
CREATE TABLE IF NOT EXISTS human_responses (
  id TEXT PRIMARY KEY NOT NULL,
  question_id TEXT NOT NULL REFERENCES pending_questions(id),
  session_id TEXT NOT NULL REFERENCES sessions(id),
  answers TEXT NOT NULL,
  source TEXT NOT NULL,
  validated INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Dynamic routing indexes
CREATE INDEX IF NOT EXISTS idx_routing_decisions_session ON routing_decisions(session_id);

-- Routing modes indexes
CREATE INDEX IF NOT EXISTS idx_routing_policies_active ON routing_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_public ON pipeline_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_usage ON pipeline_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_trigger ON pipeline_templates(auto_trigger_pattern) WHERE auto_trigger_pattern IS NOT NULL;

-- Pause/resume indexes
CREATE INDEX IF NOT EXISTS idx_pending_questions_session ON pending_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_questions_status ON pending_questions(status);
CREATE INDEX IF NOT EXISTS idx_human_responses_session ON human_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_human_responses_question ON human_responses(question_id);
