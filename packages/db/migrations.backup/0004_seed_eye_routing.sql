-- Migration: Seed Eye Routing Configurations
-- Description: Configure all 8 Eyes to use Groq (primary) and OpenRouter (fallback)
-- For 100% AI-powered orchestration (zero rule-based)

-- Table already exists from earlier migration, just insert data
-- Seed routing for all 8 Eyes using Groq (fast, cheap) as primary, OpenRouter (Claude) as fallback

INSERT OR REPLACE INTO eyes_routing (eye, primary_provider, primary_model, fallback_provider, fallback_model) VALUES
  ('overseer', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('sharingan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('prompt-helper', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('jogan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('rinnegan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('mangekyo', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('tenseigan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('byakugan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet');
