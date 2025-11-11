-- Phase 1: Dynamic Routing System & Pause/Resume Tables
-- Generated: 2025-11-11
-- Description: Add capability tags to eyes, create routing decisions table, and pause/resume mechanism tables

-- Add capability_tags column to eyes table
ALTER TABLE eyes ADD COLUMN capability_tags TEXT NOT NULL DEFAULT '[]';

-- Create routing_decisions table for tracking dynamic routing analytics
CREATE TABLE IF NOT EXISTS routing_decisions (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  request_analysis TEXT NOT NULL,
  selected_eyes TEXT NOT NULL,
  reasoning TEXT NOT NULL,
  execution_mode TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Create pipeline_states table for pause/resume mechanism
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_routing_decisions_session ON routing_decisions(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_questions_session ON pending_questions(session_id);
CREATE INDEX IF NOT EXISTS idx_pending_questions_status ON pending_questions(status);
CREATE INDEX IF NOT EXISTS idx_human_responses_session ON human_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_human_responses_question ON human_responses(question_id);
