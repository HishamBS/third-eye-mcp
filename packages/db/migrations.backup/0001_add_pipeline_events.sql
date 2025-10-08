-- Add pipeline_events table for tracking Eye execution flow
CREATE TABLE IF NOT EXISTS pipeline_events (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  eye TEXT,
  type TEXT NOT NULL,
  code TEXT,
  md TEXT,
  data_json TEXT,
  next_action TEXT,
  created_at INTEGER NOT NULL
);

-- Index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_events_session_id ON pipeline_events(session_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created_at ON pipeline_events(created_at);
