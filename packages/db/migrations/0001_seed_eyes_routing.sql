-- Seed routing for all 8 Eyes with optimized models based on Eye purpose
-- Fast/Cheap: Overseer (pipeline nav), Sharingan (ambiguity detection)
-- Balanced: Prompt Helper (optimization), Jogan (intent analysis)
-- Reasoning: Rinnegan (plan validation), Mangekyo (code review)
-- Analytical: Tenseigan (evidence validation), Byakugan (consistency checking)
-- All fallback to OpenRouter Claude 3.5 Sonnet for reliability

INSERT OR REPLACE INTO eyes_routing (eye, primary_provider, primary_model, fallback_provider, fallback_model) VALUES
  -- Fast & Cheap: Pipeline navigation and quick detection
  ('overseer', 'groq', 'llama-3.1-8b-instant', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('sharingan', 'groq', 'llama-3.1-8b-instant', 'openrouter', 'anthropic/claude-3.5-sonnet'),

  -- Balanced: Optimization and intent analysis
  ('prompt-helper', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('jogan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),

  -- Reasoning: Complex validation and code review
  ('rinnegan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('mangekyo', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),

  -- Analytical: Evidence and consistency validation
  ('tenseigan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet'),
  ('byakugan', 'groq', 'llama-3.3-70b-versatile', 'openrouter', 'anthropic/claude-3.5-sonnet');
