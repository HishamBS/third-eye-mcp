-- Create MCP Integrations table for AI tool connection configurations
CREATE TABLE IF NOT EXISTS mcp_integrations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'official',
  platforms TEXT NOT NULL,
  config_type TEXT NOT NULL,
  config_files TEXT NOT NULL,
  config_template TEXT NOT NULL,
  setup_steps TEXT NOT NULL,
  docs_url TEXT,
  enabled INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
