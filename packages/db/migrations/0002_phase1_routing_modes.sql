-- Phase 1-A2: Three Routing Modes
-- Generated: 2025-11-11
-- Description: Add routing policies and pipeline templates for constrained dynamic and fixed template modes

-- Create routing_policies table
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

-- Create pipeline_templates table
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_routing_policies_active ON routing_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_public ON pipeline_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_usage ON pipeline_templates(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_templates_trigger ON pipeline_templates(auto_trigger_pattern) WHERE auto_trigger_pattern IS NOT NULL;
